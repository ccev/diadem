import { CapacitorHttp } from "@capacitor/core";
import { getInstanceUrl, isNative } from "@/lib/native/runtime";
import { rewriteInstanceUrl } from "@/lib/native/rewriteUrl";

// NOTE: This wrapper is mutually exclusive with Capacitor's built-in
// `CapacitorHttp.enabled` config flag, which also patches window.fetch. Do NOT
// enable that flag in capacitor.config.ts, or instance requests get rewritten twice.

function base64ToBytes(base64: string): Uint8Array {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

/**
 * Reconstruct response body bytes from CapacitorHttp's `response.data`, which is
 * inconsistently one of three shapes:
 *  - a parsed JS object/array — CapacitorHttp parsed an application/json body
 *    (seen for some JSON responses) → re-serialize it.
 *  - a raw text string — other JSON/text bodies come back as the literal text
 *    (e.g. SvelteKit's json() responses) → encode the characters directly.
 *  - a base64 string — binary bodies (images, msgpack) → base64-decode.
 * `typeof` can't tell a raw-text string from a base64 string, so we key off the
 * response content type and fall back to text if base64 decoding fails.
 * (Note: CapacitorHttp's JSON parse can lose precision on >2^53 integers; 64-bit
 * ids in our payloads are sent as strings, so this is acceptable.)
 */
export function capacitorResponseBytes(data: unknown, contentType = ""): Uint8Array {
	if (data == null) return new Uint8Array();
	if (typeof data !== "string") return new TextEncoder().encode(JSON.stringify(data));

	const isTextual = /^\s*(text\/|application\/(json|xml|javascript)|application\/[\w.-]+\+json)/i.test(
		contentType
	);
	if (isTextual) return new TextEncoder().encode(data);
	try {
		return base64ToBytes(data);
	} catch {
		return new TextEncoder().encode(data);
	}
}

function buildRequestHeaders(init?: RequestInit, req?: Request): Record<string, string> {
	const out: Record<string, string> = {};
	const h = init?.headers ?? req?.headers;
	if (h) {
		new Headers(h).forEach((value, key) => (out[key] = value));
	}
	// Force uncompressed responses: the server (respond.ts) brotli/gzips when
	// Accept-Encoding asks for it, but a Response we reconstruct from
	// CapacitorHttp's bytes is NOT auto-decompressed — so .json()/msgpack would
	// receive compressed bytes and fail silently. "identity" => plain bytes.
	out["Accept-Encoding"] = "identity";
	return out;
}

const NULL_BODY_STATUSES = new Set([204, 205, 304]);

function aborted(signal?: AbortSignal | null): boolean {
	return signal?.aborted ?? false;
}

/**
 * Install a window.fetch wrapper that redirects instance-relative requests
 * (/api, /assets) to the configured remote instance and runs them through
 * CapacitorHttp (native HTTP: no CORS, native cookie jar; bearer added later).
 * Non-instance requests fall through to the original fetch unchanged.
 * No-op off native.
 */
export function installNativeFetch(): void {
	if (!isNative()) return;

	const instance = getInstanceUrl();
	const localOrigin = window.location.origin;
	const originalFetch = window.fetch.bind(window);

	window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const req = input instanceof Request ? input : undefined;
		const url = req ? req.url : input instanceof URL ? input.href : String(input);

		const target = rewriteInstanceUrl(url, instance, localOrigin);
		if (!target) return originalFetch(input as RequestInfo, init);

		const signal = init?.signal ?? req?.signal;
		if (aborted(signal)) throw new DOMException("Aborted", "AbortError");

		const method = (init?.method ?? req?.method ?? "GET").toUpperCase();
		const headers = buildRequestHeaders(init, req);

		// Normalize any body to text so the native bridge serializes consistently.
		// (FormData boundaries are not preserved, but no current caller posts FormData.)
		let data: string | undefined;
		if (method !== "GET" && method !== "HEAD") {
			const bodySource =
				init?.body != null ? new Request(target, { method, body: init.body }) : req;
			if (bodySource) {
				const text = await bodySource.clone().text();
				data = text || undefined;
			}
		}

		const response = await CapacitorHttp.request({
			url: target,
			method,
			headers,
			data,
			responseType: "blob" // base64 payload in response.data; works for JSON + binary
		});

		if (aborted(signal)) throw new DOMException("Aborted", "AbortError");

		const responseHeaders = new Headers();
		for (const [key, value] of Object.entries(response.headers ?? {})) {
			responseHeaders.set(key, String(value));
		}

		const bytes = capacitorResponseBytes(response.data, responseHeaders.get("content-type") ?? "");
		const body = NULL_BODY_STATUSES.has(response.status) ? null : bytes;

		return new Response(body, {
			status: response.status,
			headers: responseHeaders
		});
	};
}
