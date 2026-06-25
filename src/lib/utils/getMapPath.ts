import { page } from "$app/state";
import { isNative } from "@/lib/native/runtime";
import { getConfig } from "@/lib/services/config/config";
import type { ClientConfig } from "@/lib/services/config/configTypes";

export function getMapPath(config: ClientConfig, suffix: string = "") {
	if (config.general.customHome) {
		let path = "/map";
		if (suffix) path += suffix;
		return path;
	}
	return suffix ? suffix : "/";
}

export function isOnMap() {
	if (isNative()) return true;
	return !getConfig().general.customHome || page.params.map === "map";
}
