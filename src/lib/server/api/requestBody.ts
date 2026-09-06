import { decode } from "@msgpack/msgpack";

const MSGPACK_CONTENT_TYPE = "application/msgpack";

const DECODE_LIMITS = {
	maxArrayLength: 100_000,
	maxMapLength: 100_000,
	maxStrLength: 512 * 1024,
	maxBinLength: 512 * 1024,
	maxExtLength: 512 * 1024
};
const MAX_DEPTH = 64;
const MAX_BODY_BYTES = 512 * 1024;

export async function readRequestBody<T>(request: Request): Promise<T> {
	const contentType = request.headers.get("Content-Type")?.split(";", 1)[0]?.toLowerCase();
	const raw = await readCapped(request);
	const body =
		contentType === MSGPACK_CONTENT_TYPE
			? JSON.parse(JSON.stringify(decode(raw, DECODE_LIMITS)))
			: JSON.parse(new TextDecoder().decode(raw));
	checkDepth(body, 0);
	return body as T;
}

async function readCapped(request: Request): Promise<Uint8Array> {
	const declared = Number(request.headers.get("Content-Length"));
	if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
		throw new Error("Request body too large");
	}

	const reader = request.body?.getReader();
	if (!reader) return new Uint8Array();

	const chunks: Uint8Array[] = [];
	let size = 0;
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		size += value.byteLength;
		if (size > MAX_BODY_BYTES) {
			await reader.cancel();
			throw new Error("Request body too large");
		}
		chunks.push(value);
	}

	const body = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		body.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return body;
}

function checkDepth(value: unknown, depth: number): void {
	if (!value || typeof value !== "object") return;
	if (depth >= MAX_DEPTH) throw new Error("Request body nested too deeply");

	if (Array.isArray(value)) {
		for (const item of value) checkDepth(item, depth + 1);
		return;
	}
	for (const entry of Object.values(value)) checkDepth(entry, depth + 1);
}
