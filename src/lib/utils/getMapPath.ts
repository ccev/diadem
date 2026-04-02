import type { ClientConfig } from "@/lib/services/config/configTypes";
import { page } from "$app/state";
import { getConfig } from "@/lib/services/config/config";

export function getMapPath(config: ClientConfig, suffix: string = "") {
	if (config.general.customHome) {
		let path = "/map";
		if (suffix) path += suffix;
		return path;
	}
	return suffix ? suffix : "/";
}

export function isOnMap() {
	return !getConfig().general.customHome || page.params.map === "map";
}
