# FEAR — Field Activity Engineering

Aplikasi pengelolaan work order & kunjungan lapangan engineer.

- **Tampilan:** SvelteKit (Svelte 5 + Tailwind), di-build jadi file statis (SPA).
- **Backend:** PHP 8.1+ murni di folder [`api/`](api/) — tanpa Composer, tanpa Node.js di server.
- **Database:** MySQL 5.7+ / MariaDB 10.3+ ([`api/schema.sql`](api/schema.sql)).

Jadi FEAR bisa dipasang di **shared hosting cPanel biasa** (PHP + MySQL).

## Pasang di shared hosting

1. **Buat file zip** (di laptop, butuh Node.js):

   ```bash
   npm run package
   ```

   Hasilnya `dist/fear-hosting.zip`.

2. **Siapkan hosting** di cPanel:
   - _Select PHP Version_ → pilih **PHP 8.1 atau lebih baru**, pastikan ekstensi `pdo_mysql` aktif.
   - _MySQL Databases_ → buat database + user, lalu beri user itu **ALL PRIVILEGES** ke database tersebut.
   - Pastikan domain/subdomain sudah **SSL (https)** — GPS di HP hanya jalan lewat https.
     Biasanya cukup jalankan _SSL/TLS Status_ → _Run AutoSSL_.

3. **Upload & ekstrak**: _File Manager_ → buka folder domain/subdomain (mis. `public_html` atau
   `public_html/fear` untuk subdomain `fear.domainanda.com`) → _Upload_ `fear-hosting.zip` → klik kanan → _Extract_.
   Aktifkan _Show Hidden Files_ untuk memastikan file `.htaccess` ikut terekstrak.

   > FEAR harus dipasang di **root** domain atau subdomain, bukan di sub-folder seperti `domain.com/fear`.

4. **Jalankan penginstal**: buka `https://domain-anda/api/install`, isi data database dan akun admin pertama.
   Penginstal membuat tabel, data master awal, akun admin, dan file `api/config.php`, lalu terkunci otomatis.

5. Buka `https://domain-anda` dan login dengan akun admin tadi.

**Update versi baru:** buat zip baru, upload & ekstrak menimpa file lama. File `api/config.php` dan foto
di `api/storage/uploads/` tidak ada di dalam zip, jadi aman tidak tertimpa. Jika ada perubahan tabel,
jalankan `api/schema.sql` lewat phpMyAdmin (aman diulang).

**Lupa password:** link reset dikirim lewat `mail()` bawaan PHP (di cPanel biasanya langsung jalan).
Pastikan `api/config.php` berisi `'app_url' => 'https://domain-anda'` (penginstal versi baru mengisinya
otomatis) agar link di email selalu mengarah ke domain yang benar. Opsional: `'mail_from'` untuk alamat
pengirim. Saat `'debug' => true`, isi email juga ditulis ke `api/storage/mail.log` untuk dites di laptop.

**Backup:** database (phpMyAdmin → Export) + folder `api/storage/uploads/` (foto kunjungan).

## Development di laptop

Butuh Node.js 22+, PHP 8.1+ (mis. dari XAMPP) dan MySQL/MariaDB.

1. Salin `api/config.sample.php` jadi `api/config.php`, isi koneksi database lokal.
2. Buat tabel: impor `api/schema.sql` ke database (atau buka `/api/install` tanpa `config.php`).
3. Jalankan:

   ```bash
   npm install
   npm run dev
   ```

   `npm run dev` otomatis ikut menjalankan server PHP untuk `api/` (php.exe dicari di PATH,
   `C:\xampp\php\php.exe`, atau env `PHP_BIN`). Buka http://localhost:5173.

   `npm run dev:lan` = sama, tapi bisa dibuka dari HP di WiFi yang sama lewat https.

Perintah lain: `npm run check` (cek tipe), `npm run lint`, `npm run format`.

## Struktur

| Folder                 | Isi                                                                       |
| ---------------------- | ------------------------------------------------------------------------- |
| `src/routes/`          | Halaman. Tiap halaman memuat datanya dari `GET /api/<path halaman>`.      |
| `src/lib/enhance.ts`   | Pengirim form ke API PHP (`POST /api/<path>?/<aksi>`).                    |
| `api/index.php`        | Pintu masuk API (semua `/api/*` dan `/files/*` diarahkan ke sini).        |
| `api/routes/`          | Endpoint per modul: dashboard, master, users, work_orders, activities.    |
| `api/lib/`             | Koneksi DB, login/sesi, validasi form, router.                            |
| `api/storage/uploads/` | Foto kunjungan (tidak bisa diakses langsung; lewat `/files/...` + login). |
| `static/.htaccess`     | Aturan rewrite Apache/LiteSpeed (ikut ke hasil build).                    |
