import { decode, encode } from "@msgpack/msgpack";
import { isNative } from "@/lib/native/runtime";

const MSGPACK_CONTENT_TYPE = "application/msgpack";

export function getHeaders(contentType?: string): Headers {
	const headers = new Headers();
	headers.set("Accept", `${MSGPACK_CONTENT_TYPE}, application/json;q=0.9`);
	if (contentType) headers.set("Content-Type", contentType);
	return headers;
}

export function encodeRequestBody(body: unknown): {
	body: BodyInit;
	contentType: string;
	byteLength: number;
} {
	const json = JSON.stringify(body);
	if (json === undefined) throw new TypeError("Request body is not serializable");

	if (isNative()) {
		return {
			body: json,
			contentType: "application/json",
			byteLength: new TextEncoder().encode(json).byteLength
		};
	}

	const encoded = encode(JSON.parse(json));
	return {
		body: encoded as BodyInit,
		contentType: MSGPACK_CONTENT_TYPE,
		byteLength: encoded.byteLength
	};
}

export async function parseResponse<T>(response: Response): Promise<T> {
	const contentType = response.headers.get("Content-Type")?.split(";", 1)[0]?.toLowerCase();
	if (contentType === MSGPACK_CONTENT_TYPE) {
		return decode(new Uint8Array(await response.arrayBuffer())) as T;
	}
	if (contentType === "application/json" || contentType?.endsWith("+json")) {
		return (await response.json()) as T;
	}
	throw new TypeError(`Unsupported response content type: ${contentType ?? "none"}`);
}
