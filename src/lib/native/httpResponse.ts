import { Capacitor } from "@capacitor/core";

/** Rebuild the bytes returned by a native CapacitorHttp blob request. */
export function capacitorResponseBytes(
	data: unknown,
	contentType = "",
	status = 200,
	platform = Capacitor.getPlatform()
): Uint8Array<ArrayBuffer> {
	// Both native implementations parse application/json even for blob requests.
	// Android also parses JSON:API error responses and returns other errors as text.
	const androidError = platform === "android" && status >= 400;
	const parsedJson =
		/application\/json/i.test(contentType) ||
		(androidError && /application\/vnd\.api\+json/i.test(contentType));
	if (parsedJson) {
		return new TextEncoder().encode(JSON.stringify(data) ?? "");
	}
	if (data == null) return new Uint8Array();
	if (typeof data !== "string") return new TextEncoder().encode(JSON.stringify(data));
	if (androidError) return new TextEncoder().encode(data);

	// Every other successful blob response is base64, including text/* and +json.
	try {
		const binary = atob(data);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
		return bytes;
	} catch {
		return new TextEncoder().encode(data);
	}
}
