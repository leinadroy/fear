<?php
/**
 * Inti API FEAR: konstanta, error, koneksi database & helper query.
 * Semua waktu disimpan UTC di database; tampilan (frontend) mengubahnya ke WIB.
 */
declare(strict_types=1);

const USER_ROLES = ['admin', 'supervisor', 'engineer'];
const MANAGER_ROLES = ['admin', 'supervisor'];
const WO_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const WO_STATUSES = ['draft', 'assigned', 'in_progress', 'on_hold', 'completed', 'cancelled'];
const OPEN_STATUSES = ['draft', 'assigned', 'in_progress', 'on_hold'];
const CLOSED_STATUSES = ['completed', 'cancelled'];
const ASSIGNEE_ROLES = ['lead', 'member'];
const ACTIVITY_STATUSES = ['ongoing', 'done', 'failed'];
const WIB_OFFSET = 7 * 3600;

/** Error HTTP biasa (404, 403, ...). */
final class HttpError extends Exception
{
	public function __construct(public int $status, string $message)
	{
		parent::__construct($message);
	}
}

/** Hasil form action yang menghentikan proses lebih awal (fail / redirect). */
final class ActionResult extends Exception
{
	public function __construct(public array $result)
	{
		parent::__construct('action-result');
	}
}

/** Gagal validasi / aturan bisnis: data dikembalikan ke halaman sebagai `form`. */
function fail(int $status, array $data): never
{
	throw new ActionResult(['type' => 'failure', 'status' => $status, 'data' => $data]);
}

function redirect_to(string $location): never
{
	throw new ActionResult(['type' => 'redirect', 'status' => 303, 'location' => $location]);
}

function not_found(string $message = 'Data tidak ditemukan.'): never
{
	throw new HttpError(404, $message);
}

function config(): array
{
	static $config = null;
	return $config ??= require __DIR__ . '/../config.php';
}

function db(): PDO
{
	static $pdo = null;
	if ($pdo) return $pdo;
	$c = config()['db'];
	$pdo = new PDO(
		sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $c['host'], $c['port'] ?? 3306, $c['name']),
		$c['user'],
		$c['pass'],
		[
			PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
			PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
			PDO::ATTR_EMULATE_PREPARES => false,
			PDO::ATTR_STRINGIFY_FETCHES => false
		]
	);
	$pdo->exec("SET time_zone = '+00:00'");
	return $pdo;
}

function q(string $sql, array $params = []): PDOStatement
{
	$st = db()->prepare($sql);
	$st->execute(array_map(fn($v) => is_bool($v) ? (int) $v : $v, $params));
	return $st;
}

/** Semua baris, dengan kunci camelCase + tanggal ISO (seperti hasil Drizzle sebelumnya). */
function rows(string $sql, array $params = []): array
{
	return array_map('shape', q($sql, $params)->fetchAll());
}

function row(string $sql, array $params = []): ?array
{
	$r = q($sql, $params)->fetch();
	return $r === false ? null : shape($r);
}

function scalar(string $sql, array $params = []): mixed
{
	$v = q($sql, $params)->fetchColumn();
	return $v === false ? null : $v;
}

function camel(string $key): string
{
	return lcfirst(str_replace('_', '', ucwords($key, '_')));
}

function snake(string $key): string
{
	return strtolower(preg_replace('/[A-Z]/', '_$0', $key));
}

/** Ubah satu baris DB jadi bentuk JSON yang dipakai frontend. */
function shape(array $r): array
{
	$out = [];
	foreach ($r as $k => $v) {
		$key = camel($k);
		if (
			is_string($v) &&
			(str_ends_with($key, 'At') || str_starts_with($key, 'scheduled')) &&
			preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $v)
		) {
			$v = str_replace(' ', 'T', $v) . 'Z';
		} elseif ($key === 'isActive') {
			$v = (bool) $v;
		}
		$out[$key] = $v;
	}
	return $out;
}

/** INSERT dari array camelCase, return id baru. */
function insert(string $table, array $data): int
{
	$cols = array_map(fn($k) => '`' . snake($k) . '`', array_keys($data));
	q(
		"INSERT INTO `$table` (" . implode(', ', $cols) . ') VALUES (' . implode(', ', array_fill(0, count($data), '?')) . ')',
		array_values($data)
	);
	return (int) db()->lastInsertId();
}

/** UPDATE baris berdasarkan id dari array camelCase. */
function update(string $table, array $data, int $id): void
{
	$sets = array_map(fn($k) => '`' . snake($k) . '` = ?', array_keys($data));
	q("UPDATE `$table` SET " . implode(', ', $sets) . ' WHERE id = ?', [...array_values($data), $id]);
}

function transaction(callable $fn): mixed
{
	db()->beginTransaction();
	try {
		$result = $fn();
		db()->commit();
		return $result;
	} catch (Throwable $e) {
		db()->rollBack();
		throw $e;
	}
}

function db_errno(Throwable $e): int
{
	return $e instanceof PDOException ? (int) ($e->errorInfo[1] ?? 0) : 0;
}

/** Pelanggaran UNIQUE (mis. kode / email dobel). */
function is_duplicate(Throwable $e): bool
{
	return db_errno($e) === 1062;
}

/** Baris masih dipakai tabel lain (FOREIGN KEY). */
function is_referenced(Throwable $e): bool
{
	return in_array(db_errno($e), [1451, 1217], true);
}

/** Kondisi "mengandung q" di salah satu kolom. Return [sql, params]. */
function search_clause(?string $q, array $columns): array
{
	$term = trim((string) $q);
	if ($term === '') return ['1=1', []];
	$pattern = '%' . addcslashes($term, '\\%_') . '%';
	$sql = '(' . implode(' OR ', array_map(fn($c) => "$c LIKE ?", $columns)) . ')';
	return [$sql, array_fill(0, count($columns), $pattern)];
}

/** Placeholder "?, ?, ?" untuk IN (...). */
function in_list(array $values): string
{
	return implode(', ', array_fill(0, count($values), '?'));
}

function now_utc(): string
{
	return gmdate('Y-m-d H:i:s');
}

/** Ambil id numerik dari URL / form, atau 404. */
function parse_id(mixed $value): int
{
	$s = (string) $value;
	if (!ctype_digit($s) || (int) $s <= 0) not_found();
	return (int) $s;
}

function is_manager(string $role): bool
{
	return in_array($role, MANAGER_ROLES, true);
}

function query_param(string $key): string
{
	$v = $_GET[$key] ?? '';
	return is_string($v) ? $v : '';
}

function str_len(string $s): int
{
	return function_exists('mb_strlen') ? mb_strlen($s, 'UTF-8') : strlen($s);
}
