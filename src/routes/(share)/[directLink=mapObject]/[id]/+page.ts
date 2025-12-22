import type { PageLoad } from "./$types";
import { browser } from "$app/environment";
import { setDirectLinkObject } from "@/lib/features/directLinks.svelte.js";

export const ssr = true;

export const load: PageLoad = async ({ data }) => {
	if (browser) {
		setDirectLinkObject(data);
	}
	return data;
};
