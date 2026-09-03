import { encode, decode } from "@msgpack/msgpack";
import { isNative } from "@/lib/native/runtime";
import { getClientId } from "@/lib/services/clientId";

export function getHeaders(options?: {
	msgpack?: boolean;
	contentType?: string;
	clientId?: boolean;
}): Record<string, string> {
	const headers: Record<string, string> = {
		"Content-Type": options?.contentType ?? "application/json"
	};
	if (options?.msgpack ?? false) headers.Accept = "application/msgpack";
	if (options?.clientId ?? false) headers["X-Client-Id"] = getClientId();
	return headers;
}

export function encodeRequestBody(body: unknown): {
	body: ArrayBuffer | string;
	contentType: string;
} {
	// Capacitor doesn't support msgpack
	if (isNative()) {
		return { body: JSON.stringify(body), contentType: "application/json" };
	}

	const encoded = encode(body, { ignoreUndefined: true });
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
