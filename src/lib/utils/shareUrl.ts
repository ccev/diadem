import { getRootOrigin } from "@/lib/native/runtime";
import { getLocale } from "@/lib/paraglide/runtime";
import { localizePath } from "@/lib/utils/localePaths";

export function getShareUrl(path: string): string {
	const url = new URL(path, getRootOrigin());
	url.pathname = localizePath(url.pathname, getLocale());
	url.searchParams.delete("lang");
	return url.href;
}
