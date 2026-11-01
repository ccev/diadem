import { getInstanceUrl, isNative } from "@/lib/native/runtime";
import { getBearerToken } from "@/lib/native/auth";
import { requestNativeHttp } from "@/lib/native/httpRequest";
import { capacitorResponseBytes } from "@/lib/native/httpResponse";

// NOTE: This wrapper is mutually exclusive with Capacitor's built-in
// `CapacitorHttp.enabled` config flag, which also patches window.fetch. Do NOT
// enable that flag in capacitor.config.ts, or instance requests get rewritten twice.

/** Paths that live on the Diadem instance and must be redirected there on native. */
const INSTANCE_PREFIXES = ["/api/", "/assets/"];

/**
 * Decide whether a request URL should be redirected to the remote instance.
 * Returns the rewritten absolute URL, or null to leave the request untouched.
 *
 * @param requestUrl outgoing request URL — absolute, OR a root-relative path
 *   like "/api/config" (SvelteKit's load fetch strips the origin for
 *   same-origin requests, so the wrapper sees relative paths here)
 * @param instanceUrl normalized instance origin ("" = none configured)
 * @param localUrl the webview's own URL (requests to its scheme and host are candidates)
 */
export function rewriteInstanceUrl(
	requestUrl: string,
	instanceUrl: string,
	localUrl: string
): string | null {
	if (!instanceUrl) return null;

	let parsed: URL;
	let local: URL;
	try {
		local = new URL(localUrl);
		parsed = new URL(requestUrl, local);
	} catch {
		return null;
	}

	// Already absolute instance URLs (e.g. UICONS image URLs built with the
	// instance base) must still go through CapacitorHttp — both for the native
	// cookie jar/bearer and so maplibre's loadImage gets a CORS-clean Response.
	let instanceOrigin: string;
	try {
		instanceOrigin = new URL(instanceUrl).origin;
	} catch {
		return null;
	}
	if (parsed.origin === instanceOrigin) return parsed.href;

	// iOS uses capacitor://localhost, whose URL.origin may serialize as "null".
	// Compare the actual scheme and host instead of opaque origin strings.
	if (parsed.protocol !== local.protocol || parsed.host !== local.host) return null;

	const matches = INSTANCE_PREFIXES.some(
		(p) => parsed.pathname === p.slice(0, -1) || parsed.pathname.startsWith(p)
	);
	if (!matches) return null;

	return `${instanceUrl}${parsed.pathname}${parsed.search}`;
}

function buildRequestHeaders(init?: RequestInit, req?: Request): Record<string, string> {
	const out: Record<string, string> = {};
	const h = init?.headers ?? req?.headers;
	if (h) {
		new Headers(h).forEach((value, key) => (out[key] = value));
	}
	// Reconstructed responses are not transparently decompressed.
	out["Accept-Encoding"] = "identity";

	// Native has no cookies — authenticate instance requests with the bearer token.
	const hasAuth = Object.keys(out).some((k) => k.toLowerCase() === "authorization");
	const token = getBearerToken();
	if (token && !hasAuth) out["Authorization"] = `Bearer ${token}`;

	return out;
}

const NULL_BODY_STATUSES = new Set([204, 205, 304]);

/**
 * Install a window.fetch wrapper that redirects instance-relative requests
 * (/api, /assets) to the configured remote instance and runs them through
 * CapacitorHttp (native HTTP: no CORS, native cookie jar; bearer added later).
 * Non-instance requests fall through to the original fetch unchanged.
 * No-op off native.
 */
export function installNativeFetch(): void {
	if (!isNative()) return;

	const localUrl = window.location.href;
	const originalFetch = window.fetch.bind(window);

	window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const req = input instanceof Request ? input : undefined;
		const url = req ? req.url : input instanceof URL ? input.href : String(input);

		const target = rewriteInstanceUrl(url, getInstanceUrl(), localUrl);
		if (!target) return originalFetch(input as RequestInfo, init);

		const signal = init?.signal ?? req?.signal;
		if (signal?.aborted) throw signal.reason ?? new DOMException("Aborted", "AbortError");

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
				// Preserve the body's Content-Type. A browser fetch() with a string body
				// implicitly sets text/plain; CapacitorHttp sends no content-type, and some
				// endpoints reject that (400). Carry over the implicit/explicit type unless
				// the caller already set one.
				const hasContentType = Object.keys(headers).some((k) => k.toLowerCase() === "content-type");
				const bodyContentType = bodySource.headers.get("content-type");
				if (!hasContentType && bodyContentType) headers["Content-Type"] = bodyContentType;
			}
		}

		const response = await requestNativeHttp(
			{
				url: target,
				method,
				headers,
				data,
				responseType: "blob"
			},
			signal
		);

		const responseHeaders = new Headers();
		for (const [key, value] of Object.entries(response.headers ?? {})) {
			responseHeaders.set(key, String(value));
		}

		const bytes = capacitorResponseBytes(
			response.data,
			responseHeaders.get("content-type") ?? "",
			response.status
		);
		const body = method === "HEAD" || NULL_BODY_STATUSES.has(response.status) ? null : bytes;

		return new Response(body, {
			status: response.status,
			headers: responseHeaders
		});
	};
}
