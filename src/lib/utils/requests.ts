import { decode } from "@msgpack/msgpack";

export function getHeaders(options?: { msgpack?: boolean }): Record<string, string> {
	const headers: Record<string, string> = {};
	if (options?.msgpack ?? false) headers.Accept = "application/msgpack";
	return headers;
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
