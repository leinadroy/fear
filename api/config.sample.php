<?php
/**
 * Contoh konfigurasi FEAR. Biasanya `config.php` dibuat otomatis oleh penginstal
 * (buka https://domain-anda/api/install). Untuk membuat manual: salin jadi `config.php` lalu isi.
 */
return [
	'db' => [
		'host' => 'localhost',
		'port' => 3306,
		'name' => 'fear',
		'user' => 'root',
		'pass' => ''
	],
	// Alamat aplikasi, dipakai untuk link di email (mis. lupa password). Tanpa garis miring di akhir.
	'app_url' => 'https://fear.domainanda.com',
	// Pengirim email. Kosongkan untuk memakai noreply@<domain app_url>.
	'mail_from' => '',
	// Folder penyimpanan foto kunjungan (tidak bisa diakses langsung dari web).
	'upload_dir' => __DIR__ . '/storage/uploads',
	// true = tampilkan pesan error asli (hanya untuk pengembangan).
	'debug' => false
];
