/**
 * Bungkus FEAR jadi satu file zip siap upload ke shared hosting (PHP + MySQL, tanpa Node.js).
 *
 *   npm run package   →   dist/fear-hosting.zip
 *
 * Isi zip (diekstrak langsung ke public_html / folder subdomain):
 *   index.html, _app/, .htaccess, ...   ← tampilan (hasil `vite build`)
 *   api/                                ← backend PHP (tanpa config.php & foto lokal)
 */
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { crc32, deflateRawSync } from 'node:zlib';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'dist', 'fear-hosting.zip');

/** File di api/ yang tidak boleh ikut: config lokal & foto hasil upload lokal. */
const EXCLUDE = [/^api\/config\.php$/, /^api\/storage\/uploads\/(?!\.gitkeep$)/];

function walk(dir: string, prefix = ''): { abs: string; name: string }[] {
	return readdirSync(dir).flatMap((entry) => {
		const abs = path.join(dir, entry);
		const name = prefix + entry;
		return statSync(abs).isDirectory() ? walk(abs, name + '/') : [{ abs, name }];
	});
}

/** Penulis zip minimal (deflate), nama file selalu pakai '/' agar aman diekstrak di Linux. */
function zip(files: { name: string; data: Buffer }[]): Buffer {
	const local: Buffer[] = [];
	const central: Buffer[] = [];
	let offset = 0;
	const now = new Date();
	const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
	const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

	for (const { name, data } of files) {
		const nameBuf = Buffer.from(name, 'utf8');
		const packed = deflateRawSync(data, { level: 9 });
		const crc = crc32(data);

		const header = Buffer.alloc(30);
		header.writeUInt32LE(0x04034b50, 0);
		header.writeUInt16LE(20, 4);
		header.writeUInt16LE(0x0800, 6); // UTF-8
		header.writeUInt16LE(8, 8); // deflate
		header.writeUInt16LE(dosTime, 10);
		header.writeUInt16LE(dosDate, 12);
		header.writeUInt32LE(crc, 14);
		header.writeUInt32LE(packed.length, 18);
		header.writeUInt32LE(data.length, 22);
		header.writeUInt16LE(nameBuf.length, 26);
		local.push(header, nameBuf, packed);

		const entry = Buffer.alloc(46);
		entry.writeUInt32LE(0x02014b50, 0);
		entry.writeUInt16LE(0x031e, 4); // dibuat di "Unix" → permission di bawah dipakai
		entry.writeUInt16LE(20, 6);
		entry.writeUInt16LE(0x0800, 8);
		entry.writeUInt16LE(8, 10);
		entry.writeUInt16LE(dosTime, 12);
		entry.writeUInt16LE(dosDate, 14);
		entry.writeUInt32LE(crc, 16);
		entry.writeUInt32LE(packed.length, 20);
		entry.writeUInt32LE(data.length, 24);
		entry.writeUInt16LE(nameBuf.length, 28);
		entry.writeUInt32LE((0o100644 << 16) >>> 0, 38); // rw-r--r--
		entry.writeUInt32LE(offset, 42);
		central.push(entry, nameBuf);

		offset += header.length + nameBuf.length + packed.length;
	}

	const centralBuf = Buffer.concat(central);
	const end = Buffer.alloc(22);
	end.writeUInt32LE(0x06054b50, 0);
	end.writeUInt16LE(files.length, 8);
	end.writeUInt16LE(files.length, 10);
	end.writeUInt32LE(centralBuf.length, 12);
	end.writeUInt32LE(offset, 16);
	return Buffer.concat([...local, centralBuf, end]);
}

console.log('• Build tampilan (vite build)…');
execSync('npm run build', { cwd: root, stdio: 'inherit' });

const files = [
	...walk(path.join(root, 'build')),
	...walk(path.join(root, 'api'), 'api/').filter((f) => !EXCLUDE.some((re) => re.test(f.name)))
].map((f) => ({ name: f.name, data: readFileSync(f.abs) }));

mkdirSync(path.dirname(out), { recursive: true });
const buf = zip(files);
writeFileSync(out, buf);
console.log(
	`✓ ${path.relative(root, out)} — ${files.length} file, ${(buf.length / 1024).toFixed(0)} KB`
);
