import * as m from '@/lib/paraglide/messages';

export function mAny(key: string) {
	if (Object.keys(m).includes(key)) {
		// @ts-ignore
		return m[key]()
	}
	return ""
}