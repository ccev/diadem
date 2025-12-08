import type { ParamMatcher } from '@sveltejs/kit';

export const match = ((param: string): param is "map" => {
	return param === "map";
}) satisfies ParamMatcher;