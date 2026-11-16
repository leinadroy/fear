/**
 * Isi data master awal. Aman dijalankan berulang (upsert berdasarkan `code`).
 * Jalankan: npm run db:seed
 */
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/mysql2';
import { createPool } from '../src/lib/server/db/pool.ts';
import { activityTypes, materials } from '../src/lib/server/db/schema.ts';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const pool = createPool(url);
const db = drizzle(pool);

const activityTypeRows = [
	{ code: 'INST', name: 'Instalasi', description: 'Pemasangan perangkat/jaringan baru' },
	{ code: 'PM', name: 'Preventive Maintenance', description: 'Perawatan rutin terjadwal' },
	{ code: 'CM', name: 'Corrective Maintenance', description: 'Perbaikan kerusakan' },
	{ code: 'SURV', name: 'Survey', description: 'Survei lokasi sebelum pekerjaan' },
	{ code: 'TS', name: 'Troubleshooting', description: 'Analisa dan penanganan gangguan' },
	{ code: 'DISM', name: 'Dismantle', description: 'Pembongkaran perangkat' }
];

const materialRows = [
	{ code: 'CBL-UTP6', name: 'Kabel UTP Cat6', unit: 'meter' },
	{ code: 'CBL-FO', name: 'Kabel Fiber Optik', unit: 'meter' },
	{ code: 'CON-RJ45', name: 'Konektor RJ45', unit: 'pcs' },
	{ code: 'PTC-SC', name: 'Patch Cord SC-SC', unit: 'pcs' },
	{ code: 'CBL-TIE', name: 'Cable Tie', unit: 'pack' }
];

await db
	.insert(activityTypes)
	.values(activityTypeRows)
	.onDuplicateKeyUpdate({
		set: { name: sql`values(name)`, description: sql`values(description)` }
	});

await db
	.insert(materials)
	.values(materialRows)
	.onDuplicateKeyUpdate({ set: { name: sql`values(name)`, unit: sql`values(unit)` } });

console.log(
	`Seed selesai: ${activityTypeRows.length} jenis aktivitas, ${materialRows.length} material.`
);
await pool.end();
