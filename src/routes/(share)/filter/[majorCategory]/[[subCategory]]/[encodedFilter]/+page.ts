import type { PageLoad } from "./$types";
import { browser } from '$app/environment';
import { setCurrentSelectedFilterset } from '@/lib/features/filters/filtersetPageData.svelte.js';

export const load: PageLoad = ({ data }) => {
	if (browser && data.majorCategory && data.filterset) {
		setCurrentSelectedFilterset(data.majorCategory, data.subCategory, data.filterset, true, true)
	}
	return data;
};
