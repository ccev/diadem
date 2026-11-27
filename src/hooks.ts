import type { Reroute } from "@sveltejs/kit";
import { allMapObjectTypes } from "@/lib/mapObjects/mapObjectTypes";
import { localizedPagePaths, splitLocalePath } from "@/lib/utils/localePaths";

const publicPages = new Set<string>(localizedPagePaths);
const shareSections = new Set<string>(["a", "filter", ...allMapObjectTypes]);

export const reroute: Reroute = ({ url }) => {
	const { locale, path } = splitLocalePath(url.pathname);
	if (!locale) return;

	// Match only public pages and share routes, not API, auth or assets.
	try {
		const decoded = decodeURI(path);
		const [, section] = decoded.split("/", 2);
		if (publicPages.has(decoded.replace(/([^/])\/$/, "$1")) || shareSections.has(section)) {
			return path;
		}
	} catch {
		// Leave malformed paths for SvelteKit to handle.
	}
};
