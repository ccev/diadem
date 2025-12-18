import type { ClientConfig } from "@/lib/services/config/configTypes";

export function getMapPath(config: ClientConfig, suffix: string = "") {
	if (config.general.customHome) {
		let path = "/map"
		if (suffix) path += suffix
		return path
	}
	return suffix ? suffix : "/"
}