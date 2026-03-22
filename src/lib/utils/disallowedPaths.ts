import { getConfig } from "@/lib/services/config/config";

export function getDisallowedPaths() {
	return [
		...(getConfig().general.disallowedPaths ?? []),
		"/api",
		"/map",
		"/login",
		"/logout",
		"/coverage",
		"/assets",
		"/a",
		"/filter"
	];
}