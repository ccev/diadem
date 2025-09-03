import type { PageLoad } from "./$types";
import { browser } from "$app/environment";
import { setDirectLinkObject } from "@/lib/features/directLinks.svelte.js";
import { getOneMapObject } from "@/lib/mapObjects/getOneMapObject";
import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";

export const load: PageLoad = async ({ params, fetch }) => {
	const data = (await getOneMapObject("pokemon", params.id, fetch)) as PokemonData | undefined;

	if (!browser) return data;

	setDirectLinkObject(params.id, "pokemon", data);
	return data;
};