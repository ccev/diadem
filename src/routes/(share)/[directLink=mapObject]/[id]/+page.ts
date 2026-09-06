import { browser } from "$app/environment";
import { setDirectLinkObject } from "@/lib/features/directLinks.svelte.js";
import type { MapData } from "@/lib/mapObjects/mapObjectTypes";
import { getHeaders, parseResponse } from "@/lib/utils/requests";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ data, fetch }) => {
	if (browser) {
		if (!data.id) {
			setDirectLinkObject({ type: data.type });
		} else {
			try {
				const response = await fetch(`/api/${data.type}/${data.id}`, { headers: getHeaders() });
				if (response.ok) {
					const mapData = await parseResponse<MapData>(response);
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
