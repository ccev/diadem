import { getUserSettings } from "@/lib/services/userSettings.svelte.js";
import { getLocale } from "@/lib/paraglide/runtime";
import { addAddressSearchResults, setIsSearchingAddress } from "@/lib/services/search.svelte";
import { getMap } from "@/lib/map/map.svelte";
import type { BBox } from "geojson";

const searchDebounceMs = 100;

export type AddressData = {
	name: string;
	center: number[];
	id: string;
	bbox?: BBox;
};

let abortController: AbortController | undefined = undefined;
let debounceTimer: ReturnType<typeof setTimeout> | undefined = undefined;

export async function searchAddress(query: string) {
	if (query.length <= 2) return

	setIsSearchingAddress(true)

	const lang = getLocale();

	if (debounceTimer) clearTimeout(debounceTimer);

	let data: AddressData[] = []

	debounceTimer = setTimeout(async () => {
		if (abortController) abortController.abort();
		abortController = new AbortController();

		let lat = ""
		let lon = ""
		const center = getMap()?.getCenter()
		if (center) {
			// 1 decimal is enough precision for address search, allows results to be cached
			lat = center.lat.toFixed(1)
			lon = center.lng.toFixed(1)
		}

		let url = "/api/search/address/" + encodeURIComponent(query) + "?lang=" + lang
		if (lat && lon) {
			url += `&lat=${lat}&lon=${lon}`
		}

		try {
			const result = await fetch(
				url,
				{ signal: abortController.signal }
			);

			if (!result.ok) {
				console.error("Address request failed!");
				return;
			}

			data = await result.json();
			addAddressSearchResults(data, query)

		} catch (error: any) {
			if (error.name !== "AbortError") {
				console.error("Error while searching for address", error);
			}
		}
	}, searchDebounceMs);
}
