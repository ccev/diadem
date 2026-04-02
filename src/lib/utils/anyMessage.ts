import * as m from "@/lib/paraglide/messages";

export function mAny(key: string | keyof typeof m) {
	if (Object.keys(m).includes(key)) {
		// @ts-ignore
		return m[key]();
	}
	return "";
}
