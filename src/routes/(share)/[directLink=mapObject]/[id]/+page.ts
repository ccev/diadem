import type { PageLoad } from "./$types";
import { browser } from "$app/environment";
import { setDirectLinkObject } from "@/lib/features/directLinks.svelte.js";
import type { MapData } from "@/lib/mapObjects/mapObjectTypes";

export const load: PageLoad = async ({ data, fetch }) => {
	if (browser) {
		if (!data.id) {
			setDirectLinkObject({ type: data.type });
		} else {
			try {
				const response = await fetch(`/api/${data.type}/${data.id}`);
				if (response.ok) {
					const mapData: MapData = await response.json();
					setDirectLinkObject(mapData);
				} else if (response.status === 401) {
					setDirectLinkObject({ type: data.type, noPermission: true });
				} else {
					setDirectLinkObject({ type: data.type });
				}
			} catch {
				setDirectLinkObject({ type: data.type });
			}
		}
	}

	return data;
};
