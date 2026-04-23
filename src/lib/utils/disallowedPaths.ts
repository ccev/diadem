import { getConfig } from "@/lib/services/config/config";

export function getDisallowedPaths() {
	return [
		...(getConfig().general.disallowedPaths ?? []),
		"/map",
		"/login",
		"/logout",
		"/coverage",
		"/filter"
	];
}
