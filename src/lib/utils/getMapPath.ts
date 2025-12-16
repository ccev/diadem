import { getConfig } from "@/lib/services/config/config";
import { browser } from "$app/environment";

export function getMapPath(suffix: string = "") {
	// On server-side, the client config store isn't populated
	// Return safe default - customHome redirect is handled client-side
	if (!browser) {
		return suffix ? suffix : "/";
	}

	const config = getConfig();
	if (config?.general?.customHome) {
		let path = "/map"
		if (suffix) path += suffix
		return path
	}
	return suffix ? suffix : "/"
}