<?php
/** Penyimpanan & penyajian foto kunjungan. File disimpan di luar folder publik (api/storage). */
declare(strict_types=1);

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];

function upload_root(): string
{
	$dir = config()['upload_dir'] ?? (__DIR__ . '/../storage/uploads');
	if (!is_dir($dir)) mkdir($dir, 0755, true);
	return realpath($dir);
}

/** $_FILES['photos'] (input name="photos[]") → daftar file yang benar-benar dipilih. */
function uploaded_files(string $field): array
{
	$f = $_FILES[$field] ?? null;
	if (!$f) return [];
	$files = [];
	foreach ((array) $f['name'] as $i => $name) {
		$error = ((array) $f['error'])[$i];
		if ($error === UPLOAD_ERR_NO_FILE) continue;
		$files[] = [
			'name' => (string) $name,
			'tmp' => ((array) $f['tmp_name'])[$i],
			'size' => (int) ((array) $f['size'])[$i],
			'error' => $error
		];
	}
	return $files;
}

/** Validasi file foto; return pesan error atau null. */
function validate_photo(array $file): ?string
{
	$name = $file['name'];
	if (in_array($file['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true) || $file['size'] > MAX_PHOTO_BYTES) {
		$limit = min(MAX_PHOTO_BYTES, ini_bytes(ini_get('upload_max_filesize')));
		return "$name: ukuran maksimal " . round($limit / 1048576) . ' MB.';
	}
	if ($file['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp'])) return "$name: gagal diunggah, coba lagi.";
	if (!isset(IMAGE_TYPES[photo_mime($file['tmp'])])) return "$name: format harus JPG, PNG, atau WEBP.";
	return null;
}

function photo_mime(string $path): string
{
	if (function_exists('finfo_open')) {
		$finfo = finfo_open(FILEINFO_MIME_TYPE);
		$mime = (string) finfo_file($finfo, $path);
		finfo_close($finfo);
		return $mime;
	}
	return (string) (getimagesize($path)['mime'] ?? '');
}

function ini_bytes(string|false $v): int
{
	$v = trim((string) $v);
	$n = (int) $v;
	return match (strtolower(substr($v, -1))) {
		'g' => $n * 1073741824,
		'm' => $n * 1048576,
		'k' => $n * 1024,
		default => $n ?: PHP_INT_MAX
	};
}

/** Simpan foto kunjungan. Return path relatif terhadap folder upload (pakai '/'). */
function save_photo(int $activityId, array $file): string
{
	$uuid = vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex(random_bytes(16)), 4));
	$rel = "activities/$activityId/$uuid." . IMAGE_TYPES[photo_mime($file['tmp'])];
	$abs = upload_root() . '/' . $rel;
	if (!is_dir(dirname($abs))) mkdir(dirname($abs), 0755, true);
	if (!move_uploaded_file($file['tmp'], $abs)) throw new RuntimeException('Gagal menyimpan foto.');
	return $rel;
}

/** Path absolut yang aman untuk path relatif, atau null jika keluar dari folder upload / tidak ada. */
function resolve_upload(string $rel): ?string
{
	$root = upload_root();
	$abs = realpath($root . '/' . $rel);
	return $abs && str_starts_with($abs, $root . DIRECTORY_SEPARATOR) && is_file($abs) ? $abs : null;
}

function delete_upload(string $rel): void
{
	$abs = resolve_upload($rel);
	if ($abs) @unlink($abs);
}

/** GET /files/<path>: sajikan foto hanya untuk user yang login. */
function serve_upload(string $rel): void
{
	$rel = rawurldecode($rel);
	$type = array_flip(IMAGE_TYPES)[strtolower(pathinfo($rel, PATHINFO_EXTENSION))] ?? null;
	$abs = current_user() && $type ? resolve_upload($rel) : null;
	if (!$abs) {
		http_response_code(404);
		header('Content-Type: text/plain; charset=utf-8');
		echo 'File tidak ditemukan.';
		return;
	}
	header_remove('Cache-Control');
	header("Content-Type: $type");
	header('Content-Length: ' . filesize($abs));
	header('Cache-Control: private, max-age=86400');
	readfile($abs);
}
