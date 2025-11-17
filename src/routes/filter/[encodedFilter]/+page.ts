import type { PageLoad } from "./$types";
import { decodeFilterset } from '@/lib/features/filters/filtersetPageData.svelte';

export const load: PageLoad = ({ params }) => {
	return {
		filterset: decodeFilterset(params.encodedFilter)
	};
};
