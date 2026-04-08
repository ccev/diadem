import { encode } from "@msgpack/msgpack";
import { brotliCompressSync, gzipSync, constants } from "node:zlib";

export function respond(request: Request, data: any, options?: ResponseInit): Response {
	const accept = request.headers.get("Accept") ?? "";
	const acceptEncoding = request.headers.get("Accept-Encoding") ?? "";

	const useMsgpack = accept.includes("application/msgpack");
	const body = useMsgpack ? encode(data) : JSON.stringify(data);
	const contentType = useMsgpack ? "application/msgpack" : "application/json";

	const useBrotli = acceptEncoding.includes("br");
	const useGzip = !useBrotli && acceptEncoding.includes("gzip");

	let compressed: Uint8Array | string;
	let contentEncoding: string | undefined;

	if (useBrotli) {
		compressed = brotliCompressSync(body, {
			params: { [constants.BROTLI_PARAM_QUALITY]: 4 }
		});
		contentEncoding = "br";
	} else if (useGzip) {
		compressed = gzipSync(body);
		contentEncoding = "gzip";
	} else {
		compressed = body;
	}

	const headers: Record<string, any> = {
		...options?.headers,
		"Content-Type": contentType
	};

	if (contentEncoding) {
		headers["Content-Encoding"] = contentEncoding;
	}

	return new Response(compressed, { ...options, headers });
}
