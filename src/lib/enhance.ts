/**
 * Pengganti `enhance` dari `$app/forms` untuk SPA: form POST dikirim ke API PHP
 * (`/api<path>?/<aksi>`), lalu hasilnya diterapkan persis seperti form action SvelteKit
 * (prop `form` terisi saat gagal, redirect diikuti, data dimuat ulang saat sukses).
 */
import { applyAction, type ActionResult, type SubmitFunction } from '$app/forms';
import { invalidateAll } from '$app/navigation';

type Opts = { reset?: boolean; invalidateAll?: boolean };

async function defaultUpdate(
	form: HTMLFormElement,
	action: URL,
	result: ActionResult,
	opts: Opts = {}
) {
	if (result.type === 'success') {
		if (opts.reset !== false) HTMLFormElement.prototype.reset.call(form);
		if (opts.invalidateAll !== false) await invalidateAll();
	}
	if (
		location.origin + location.pathname === action.origin + action.pathname ||
		result.type === 'redirect' ||
		result.type === 'error'
	) {
		await applyAction(result);
	}
}

async function send(action: URL, formData: FormData, signal: AbortSignal): Promise<ActionResult> {
	try {
		const res = await fetch(`/api${action.pathname}${action.search}`, {
			method: 'POST',
			body: formData,
			headers: { accept: 'application/json', 'x-fear-request': '1' },
			cache: 'no-store',
			signal
		});
		return (await res.json()) as ActionResult;
	} catch (e) {
		if (signal.aborted) throw e;
		return {
			type: 'error',
			status: 500,
			error: { message: 'Gagal menghubungi server. Periksa koneksi.', status: 500 }
		};
	}
}

export function enhance(form: HTMLFormElement, submit: SubmitFunction = () => {}) {
	async function onSubmit(event: SubmitEvent) {
		const submitter = event.submitter as HTMLButtonElement | HTMLInputElement | null;
		const method = (
			submitter?.hasAttribute('formmethod') ? submitter.formMethod : form.method
		).toLowerCase();
		if (method !== 'post') return;
		event.preventDefault();

		const action = new URL(
			submitter?.hasAttribute('formaction') ? submitter.formAction : form.action,
			location.href
		);
		const formData = new FormData(form, submitter);
		const controller = new AbortController();
		let cancelled = false;

		const callback = await submit({
			action,
			formData,
			formElement: form,
			controller,
			submitter,
			cancel: () => (cancelled = true)
		});
		if (cancelled) return;

		let result: ActionResult;
		try {
			result = await send(action, formData, controller.signal);
		} catch {
			return; // dibatalkan
		}

		const update = (opts?: Opts) => defaultUpdate(form, action, result, opts);
		if (callback) await callback({ action, formData, formElement: form, result, update });
		else await update();
	}

	form.addEventListener('submit', onSubmit);
	return { destroy: () => form.removeEventListener('submit', onSubmit) };
}
