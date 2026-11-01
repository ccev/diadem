import { CapacitorHttp, type HttpOptions, type HttpResponse } from "@capacitor/core";

const NATIVE_HTTP_TIMEOUT_MS = 15_000;

/** Keep native network retries from leaving callers waiting indefinitely. */
export async function requestNativeHttp(
	options: HttpOptions,
	signal?: AbortSignal | null
): Promise<HttpResponse> {
	if (signal?.aborted) throw signal.reason ?? new DOMException("Aborted", "AbortError");

	let rejectInterrupted!: (reason: unknown) => void;
	const interrupted = new Promise<never>((_, reject) => {
		rejectInterrupted = reject;
	});
	const timeout = setTimeout(
		() => rejectInterrupted(new DOMException("Request timed out", "TimeoutError")),
		NATIVE_HTTP_TIMEOUT_MS
	);
	const onAbort = () =>
		rejectInterrupted(signal?.reason ?? new DOMException("Aborted", "AbortError"));
	signal?.addEventListener("abort", onAbort, { once: true });
	try {
		// The platform may retry multiple addresses, exceeding its individual
		// connect/read timeouts. Capacitor cannot cancel that underlying work, but
		// this deadline and AbortSignal still settle the caller promptly.
		return await Promise.race([
			CapacitorHttp.request({
				connectTimeout: NATIVE_HTTP_TIMEOUT_MS,
				readTimeout: NATIVE_HTTP_TIMEOUT_MS,
				...options
			}),
			interrupted
		]);
	} finally {
		clearTimeout(timeout);
		signal?.removeEventListener("abort", onAbort);
	}
}
