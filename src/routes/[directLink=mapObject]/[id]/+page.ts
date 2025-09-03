import type { PageLoad } from "./$types";
import { browser } from "$app/environment";
import { setDirectLinkObject } from "@/lib/features/directLinks.svelte.js";

export const ssr = true;

export const load: PageLoad = async ({ params, fetch, data }) => {
	if (browser) {
		setDirectLinkObject(params.id, params.directLink, data);
	}
	return data;
};
