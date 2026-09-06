import { encode } from "@msgpack/msgpack";

const MSGPACK_CONTENT_TYPE = "application/msgpack";

function quality(accept: string, contentType: string): number {
	for (const value of accept.split(",")) {
		const [type, ...parameters] = value.trim().split(";");
		if (type !== contentType) continue;
		const parameter = parameters.find((entry) => entry.trim().startsWith("q="));
		return parameter ? Number(parameter.trim().slice(2)) : 1;
	}
	return 0;
}

export function respond(request: Request, data: unknown, options?: ResponseInit): Response {
	const accept = request.headers.get("Accept") ?? "";
	const useMsgpack = quality(accept, MSGPACK_CONTENT_TYPE) > quality(accept, "application/json");
	const headers = new Headers(options?.headers);
	headers.append("Vary", "Accept");
	headers.set("Content-Type", useMsgpack ? MSGPACK_CONTENT_TYPE : "application/json");
	if (!headers.has("Cache-Control")) headers.set("Cache-Control", "private, no-store");

	return new Response(useMsgpack ? encode(data, { ignoreUndefined: true }) : JSON.stringify(data), {
		...options,
		headers
	});
}
