import { decode } from "@msgpack/msgpack";

/**
 * Bounds on what a single body may decode to. msgpack allocates a collection
 * from its declared length before reading it, so a tiny body claiming a huge
 * array would otherwise allocate hundreds of MB.
 */
const DECODE_LIMITS = {
	maxArrayLength: 100_000,
	maxMapLength: 100_000,
	maxStrLength: 64 * 1024,
	maxBinLength: 64 * 1024,
	maxExtLength: 64 * 1024
};

/** Nesting beyond this is rejected rather than recursed into. Filters nest ~6 deep. */
const MAX_DEPTH = 64;

/**
 * Raw bytes buffered before decoding (the decode ceilings apply mid-decode).
 * Matches adapter-node's BODY_SIZE_LIMIT, which 413s before this handler runs.
 */
const MAX_BODY_BYTES = 512 * 1024;

export type ReadBodyOptions = {
	/** Keep null properties (for bodies that are stored verbatim, not interpreted). */
	keepNulls?: boolean;
	/** Override the byte cap, for endpoints that legitimately carry more. */
	maxBytes?: number;
};

/**
 * Read a request body as msgpack or JSON, depending on its Content-Type. msgpack
 * is roughly half the size of JSON, so clients use it where they can.
 */
export async function readRequestBody<T>(
	request: Request,
	options: ReadBodyOptions = {}
): Promise<T> {
	const contentType = request.headers.get("Content-Type") ?? "";
	const raw = await readCapped(request, options.maxBytes ?? MAX_BODY_BYTES);
	const isMsgpack = contentType.includes("application/msgpack");

	const body = isMsgpack ? decode(raw, DECODE_LIMITS) : JSON.parse(new TextDecoder().decode(raw));

	// msgpack has no undefined: absent optionals arrive as null and would defeat
	// `!== undefined` guards. In JSON a null was written deliberately, so only
	// the msgpack path drops them. Both paths are depth-checked.
	if (isMsgpack && !options.keepNulls) dropNulls(body, 0);
	else checkDepth(body, 0);

	return body as T;
}

/** Buffer the body, refusing to exceed the cap. The stream itself is bounded. */
async function readCapped(request: Request, maxBytes: number): Promise<Uint8Array> {
	const declared = Number(request.headers.get("Content-Length"));
	if (Number.isFinite(declared) && declared > maxBytes) {
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
		if (size > maxBytes) {
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

/** Same depth bound for the keepNulls path. */
function checkDepth(value: unknown, depth: number): void {
	if (!value || typeof value !== "object") return;
	if (depth >= MAX_DEPTH) throw new Error("Request body nested too deeply");

	if (Array.isArray(value)) {
		for (const item of value) checkDepth(item, depth + 1);
		return;
	}
	for (const entry of Object.values(value)) checkDepth(entry, depth + 1);
}

function dropNulls(value: unknown, depth: number): void {
	if (!value || typeof value !== "object") return;
	if (depth >= MAX_DEPTH) throw new Error("Request body nested too deeply");

	if (Array.isArray(value)) {
		for (const item of value) dropNulls(item, depth + 1);
		return;
	}

	for (const [key, entry] of Object.entries(value)) {
		if (entry === null) delete (value as Record<string, unknown>)[key];
		else dropNulls(entry, depth + 1);
	}
}
