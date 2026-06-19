import { CapacitorHttp } from "@capacitor/core";
import { getInstanceUrl, isNative } from "@/lib/native/runtime";
import { rewriteInstanceUrl } from "@/lib/native/rewriteUrl";

function base64ToBytes(base64: string): Uint8Array {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

function headersToObject(init?: RequestInit, req?: Request): Record<string, string> {
	const out: Record<string, string> = {};
	const h = init?.headers ?? req?.headers;
	if (!h) return out;
	new Headers(h).forEach((value, key) => (out[key] = value));
	return out;
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

		const method = (init?.method ?? req?.method ?? "GET").toUpperCase();
		const headers = headersToObject(init, req);

		let data: unknown = init?.body ?? undefined;
		if (data === undefined && req && method !== "GET" && method !== "HEAD") {
			data = await req.clone().text();
		}

		const response = await CapacitorHttp.request({
			url: target,
			method,
			headers,
			data,
			responseType: "blob" // base64 payload in response.data; works for JSON + binary
		});

		const bytes = typeof response.data === "string" ? base64ToBytes(response.data) : new Uint8Array();
		return new Response(bytes, {
			status: response.status,
			headers: response.headers as Record<string, string>
		});
	};
}
