import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';

/** Port server PHP bawaan untuk API saat development. */
const PHP_PORT = 8787;

/** Cari php.exe: env PHP_BIN, PATH, atau XAMPP. */
function phpBinary(): string {
	if (process.env.PHP_BIN) return process.env.PHP_BIN;
	const xampp = 'C:\\xampp\\php\\php.exe';
	return process.platform === 'win32' && existsSync(xampp) ? xampp : 'php';
}

/** Jalankan `php -S` untuk folder api/ selama `vite dev` hidup. */
function phpApi(): Plugin {
	let php: ChildProcess | undefined;
	return {
		name: 'fear-php-api',
		apply: 'serve',
		configureServer(server) {
			php = spawn(phpBinary(), ['-S', `127.0.0.1:${PHP_PORT}`, 'api/index.php'], {
				stdio: ['ignore', 'ignore', 'pipe']
			});
			php.on('error', (e) =>
				server.config.logger.error(`[php] gagal dijalankan (${e.message}). Set PHP_BIN ke php.exe.`)
			);
			php.stderr?.on('data', (chunk: Buffer) => {
				for (const line of chunk.toString().split('\n')) {
					// Log akses php -S terlalu ramai; tampilkan hanya error/peringatan.
					if (/error|warning|fatal|notice/i.test(line))
						server.config.logger.warn(`[php] ${line.trim()}`);
				}
			});
			const stop = () => php?.kill();
			server.httpServer?.on('close', stop);
			process.once('exit', stop);
		}
	};
}

// `npm run dev`     : frontend Vite + API PHP (http://localhost:5173)
// `npm run dev:lan` : sama, bisa dibuka dari HP lewat HTTPS (GPS browser butuh HTTPS)
export default defineConfig(({ mode }) => ({
	plugins: [
		mode === 'lan' && basicSsl(),
		phpApi(),
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// Hasil build = file statis (SPA) untuk shared hosting; API-nya PHP di folder api/.
			adapter: adapter({ fallback: 'index.html' })
		})
	],
	server: {
		proxy: {
			'/api': { target: `http://127.0.0.1:${PHP_PORT}` },
			'/files': { target: `http://127.0.0.1:${PHP_PORT}` }
		}
	}
}));
