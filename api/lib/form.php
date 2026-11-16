<?php
/**
 * Validasi input form ($_POST) dengan pesan berbahasa Indonesia.
 * Pemakaian:
 *   $f = new Form();
 *   $data = ['name' => $f->text('name', 'Nama', 100), ...];
 *   $f->check();   // gagal → fail(400, ['values' => ..., 'errors' => ...])
 */
declare(strict_types=1);

final class Form
{
	/** Field yang tidak dikembalikan ke form saat validasi gagal. */
	private const SECRET_FIELDS = ['password', 'passwordConfirm'];

	public array $errors = [];

	public function __construct(public array $input = [])
	{
		$this->input = $input ?: $_POST;
	}

	public function raw(string $key): string
	{
		$v = $this->input[$key] ?? '';
		return is_string($v) ? $v : '';
	}

	public function has(string $key): bool
	{
		return isset($this->input[$key]);
	}

	/** Catat error (hanya error pertama per field yang dipakai). */
	public function error(string $key, string $message): void
	{
		$this->errors[$key] ??= $message;
	}

	public function ok(): bool
	{
		return !$this->errors;
	}

	public function values(): array
	{
		$values = [];
		foreach ($this->input as $k => $v) {
			if (is_string($v) && !in_array($k, self::SECRET_FIELDS, true)) $values[$k] = $v;
		}
		return $values;
	}

	/** Hentikan action dengan error validasi bila ada. */
	public function check(): void
	{
		if ($this->errors) $this->failWith($this->errors);
	}

	/** `fail(400)` dengan pesan untuk field tertentu (mis. kode duplikat). */
	public function failWith(array $errors, int $status = 400): never
	{
		fail($status, ['values' => $this->values(), 'errors' => $errors]);
	}

	public function firstError(): ?string
	{
		return $this->errors ? reset($this->errors) : null;
	}

	// ─── Tipe field ─────────────────────────────────────────────────────────

	/** Teks wajib. */
	public function text(string $key, string $label, int $max = 255): string
	{
		$v = trim($this->raw($key));
		if ($v === '') $this->error($key, "$label wajib diisi.");
		elseif (str_len($v) > $max) $this->error($key, "$label maksimal $max karakter.");
		return $v;
	}

	/** Teks opsional; kosong → null. */
	public function optText(string $key, int $max = 65535): ?string
	{
		$v = trim($this->raw($key));
		if (str_len($v) > $max) $this->error($key, "Maksimal $max karakter.");
		return $v === '' ? null : $v;
	}

	/** Kode unik: huruf besar, angka, strip, titik, garis bawah. */
	public function code(string $key, string $label = 'Kode'): string
	{
		$v = strtoupper($this->text($key, $label, 30));
		if ($v !== '' && !preg_match('/^[A-Z0-9._-]+$/', $v)) {
			$this->error($key, "$label hanya boleh huruf, angka, - . _");
		}
		return $v;
	}

	public function email(string $key = 'email'): string
	{
		$v = strtolower(trim($this->raw($key)));
		if ($v === '') $this->error($key, 'Email wajib diisi.');
		elseif (str_len($v) > 150 || !filter_var($v, FILTER_VALIDATE_EMAIL)) {
			$this->error($key, 'Format email tidak valid.');
		}
		return $v;
	}

	public function optEmail(string $key = 'email'): ?string
	{
		$v = strtolower(trim($this->raw($key)));
		if ($v === '') return null;
		if (str_len($v) > 150 || !filter_var($v, FILTER_VALIDATE_EMAIL)) {
			$this->error($key, 'Format email tidak valid.');
		}
		return $v;
	}

	/** ID referensi (select). */
	public function ref(string $key, string $label): int
	{
		$v = trim($this->raw($key));
		if (!ctype_digit($v) || (int) $v <= 0) {
			$this->error($key, "$label wajib dipilih.");
			return 0;
		}
		return (int) $v;
	}

	/** Angka desimal opsional (mis. koordinat); kosong → null, disimpan sebagai string. */
	public function optDecimal(string $key, float $min, float $max, string $label): ?string
	{
		$v = str_replace(',', '.', trim($this->raw($key)));
		if ($v === '') return null;
		if (!is_numeric($v) || (float) $v < $min || (float) $v > $max) {
			$this->error($key, sprintf('%s harus angka %s s.d. %s.', $label, $min, $max));
			return null;
		}
		return (string) (float) $v;
	}

	/** Checkbox HTML: tercentang → true. */
	public function checkbox(string $key): bool
	{
		return in_array($this->raw($key), ['on', 'true'], true);
	}

	public function enum(string $key, array $values, string $label): string
	{
		$v = $this->raw($key);
		if (!in_array($v, $values, true)) $this->error($key, "$label tidak valid.");
		return $v;
	}

	/** Nilai <input type="datetime-local"> (WIB) → 'Y-m-d H:i:s' UTC, kosong → null. */
	public function dateTime(string $key, string $label): ?string
	{
		$v = trim($this->raw($key));
		if ($v === '') return null;
		$tz = new DateTimeZone('+07:00');
		$d = DateTime::createFromFormat('!Y-m-d\TH:i', $v, $tz) ?: DateTime::createFromFormat('!Y-m-d\TH:i:s', $v, $tz);
		if (!$d) {
			$this->error($key, "$label tidak valid.");
			return null;
		}
		return $d->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
	}

	public function password(string $key = 'password'): string
	{
		$v = $this->raw($key);
		if ($v === '') $this->error($key, 'Password wajib diisi.');
		elseif (str_len($v) < MIN_PASSWORD_LENGTH) {
			$this->error($key, 'Password minimal ' . MIN_PASSWORD_LENGTH . ' karakter.');
		} elseif (str_len($v) > 200) $this->error($key, 'Password terlalu panjang.');
		return $v;
	}
}
