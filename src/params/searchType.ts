import type { ParamMatcher } from "@sveltejs/kit";
import { SearchType } from "@/lib/services/search.svelte";

export const match = ((param: string) => {
	// @ts-ignore
	return Object.values(SearchType).includes(param);
}) satisfies ParamMatcher;
