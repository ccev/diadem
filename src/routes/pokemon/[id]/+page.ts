import type { PageLoad } from "./$types";
import { browser } from "$app/environment";
import { setDirectLinkObject } from "@/lib/directLinks.svelte";
import { getOneMapObject } from "@/lib/mapObjects/updateMapObject";
import { redirect } from '@sveltejs/kit';

export const load: PageLoad = async ({ params, fetch }) => {
	if (!browser) return;

	const data = await getOneMapObject("pokemon", params.id, fetch);
	setDirectLinkObject(params.id, "pokemon", data);
	redirect(302, "/");
};