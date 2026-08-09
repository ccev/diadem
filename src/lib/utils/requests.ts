import { encode, decode } from "@msgpack/msgpack";
import { isNative } from "@/lib/native/runtime";
import { getClientId } from "@/lib/services/clientId";

export function getHeaders(options?: {
	msgpack?: boolean;
	contentType?: string;
	/** Identify this tab, so per-client server state isn't shared across an address. */
	clientId?: boolean;
}): Record<string, string> {
	const headers: Record<string, string> = {
		"Content-Type": options?.contentType ?? "application/json"
	};
	if (options?.msgpack ?? false) headers.Accept = "application/msgpack";
	if (options?.clientId ?? false) headers["X-Client-Id"] = getClientId();
	return headers;
}

/**
 * Encode a request body as msgpack when possible, JSON otherwise.
 *
 * Native builds always fall back to JSON: the CapacitorHttp fetch wrapper
 * serializes request bodies through `Request.text()`, which would mangle
 * binary msgpack bytes.
 */
export function encodeRequestBody(body: unknown): {
	/** Narrower than BodyInit so callers can also hand it to Blob or sendBeacon. */
	body: ArrayBuffer | string;
	contentType: string;
} {
	if (isNative()) {
		return { body: JSON.stringify(body), contentType: "application/json" };
	}

	// ignoreUndefined matches JSON.stringify, which drops undefined properties.
	// Without it they are encoded as nil and decode to null on the server, where
	// `x !== undefined` guards (e.g. the `since` delta cursor) would wrongly pass.
	const encoded = encode(body, { ignoreUndefined: true });
	// Copy into a plain ArrayBuffer: msgpack encodes into a pooled buffer whose
	// backing store is larger than the message.
	return {
		body: encoded.slice().buffer as ArrayBuffer,
		contentType: "application/msgpack"
	};
}

export async function parseResponse<T>(response: Response): Promise<T | undefined> {
	if (!response.ok) {
		console.error(`Error during fetch: ${response.status}`);
		return;
	}

	if (response.headers.get("Content-Type") === "application/msgpack") {
		try {
			const buffer = await response.arrayBuffer();
			return decode(new Uint8Array(buffer)) as T;
		} catch (e) {
			console.error("Error parsing msgpack response", e);
		}
	} else if (response.headers.get("Content-Type") === "application/json") {
		try {
			return (await response.json()) as T;
		} catch (e) {
			console.error("Error parsing json response", e);
		}
	}

	return;
}
