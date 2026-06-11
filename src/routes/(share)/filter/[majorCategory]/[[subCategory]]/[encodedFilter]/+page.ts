import { browser } from "$app/environment";
import type { FilterCategory } from "@/lib/features/filters/filters";
import { setCurrentSelectedFilterset } from "@/lib/features/filters/filtersetPageData.svelte.js";
import type { PageLoad } from "./$types";

export const load: PageLoad = ({ data }) => {
	if (browser && data.majorCategory && data.filterset) {
		setCurrentSelectedFilterset(data.majorCategory as FilterCategory, data.subCategory as FilterCategory | undefined, data.filterset, true, true);
	}
	return data;
};
