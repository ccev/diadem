import { getConfig } from "@/lib/services/config/config";

export function getMapPath(suffix: string = "") {
	if (getConfig().general.customHome) {
		let path = "/map"
		if (suffix) path += suffix
		return path
	}
	return suffix ? suffix : "/"
}