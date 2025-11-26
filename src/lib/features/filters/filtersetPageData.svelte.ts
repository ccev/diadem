import { closeModal, type ModalType } from "@/lib/ui/modal.svelte";
import type { AnyFilterset, BaseFilterset } from "@/lib/features/filters/filtersets";
import type { AnyFilter, FilterCategory } from "@/lib/features/filters/filters";
import { getUserSettings, updateUserSettings } from "@/lib/services/userSettings.svelte";
import { updateAllMapObjects } from "@/lib/mapObjects/updateMapObject";
import { FiltersetPokemonSchema } from "@/lib/features/filters/filtersetSchemas";

let filtersetPageData:
	| {
			category: FilterCategory;
			selectedAttribute: AnyFilterset | undefined;
			inEdit: boolean;
			isShared: boolean;
			data: AnyFilterset;
	  }
	| undefined = $state(undefined);

export function setCurrentSelectedFilterset(
	category: FilterCategory,
	data: AnyFilterset,
	inEdit: boolean,
	isShared: boolean = false
) {
	filtersetPageData = { category, data, inEdit, isShared, selectedAttribute: undefined };
}

export function resetCurrentSelectedFilterset() {
	filtersetPageData = undefined;
}

export function getCurrentSelectedFilterset() {
	return filtersetPageData;
}

export function existsCurrentSelectedFilterset() {
	if (!getCurrentSelectedFilterset()) {
		return false;
	} else {
		return getUserSettings().filters[getCurrentSelectedFilterset()?.category]?.filters.some(
			(f) => f.id === getCurrentSelectedFilterset().data.id
		);
	}
}

export function getCurrentSelectedFiltersetIsEmpty() {
	const filterset = getCurrentSelectedFilterset()
	if (!filterset) return true

	return Object.keys(filterset.data).length <= Object.keys(getNewFilterset()).length
}

export function getCurrentSelectedFiltersetInEdit() {
	return filtersetPageData?.inEdit ?? false;
}

export function getCurrentSelectedFiltersetIsShared() {
	return filtersetPageData?.isShared ?? false;
}

export function saveSelectedFilterset() {
	const filterset = filtersetPageData;

	if (filterset) {
		const filters: AnyFilterset[] | undefined =
			getUserSettings().filters[filterset.category]?.filters;
		if (!filters) return;

		const exists = filters.some((f) => f.id === filterset.data.id);
		if (exists) {
			getUserSettings().filters[filterset.category].filters = filters.map((f) =>
				f.id === filterset.data.id ? filterset.data : f
			);
		} else {
			getUserSettings().filters[filterset.category].filters.push(filterset.data);
		}

		updateUserSettings();
		updateAllMapObjects().then();
	}
}

export function deleteCurrentSelectedFilterset() {
	const filterset = filtersetPageData;

	if (filterset) {
		const filters: AnyFilterset[] | undefined =
			getUserSettings().filters[filterset.category]?.filters;
		if (!filters) return;

		getUserSettings().filters[filterset.category].filters = filters.filter(
			(f) => f.id !== filterset.data.id
		);

		updateUserSettings();
		updateAllMapObjects().then();
	}
}

export function getCurrentSelectedAttribute() {
	return filtersetPageData?.selectedAttribute;
}

export function setCurrentSelectedAttribute() {
	if (filtersetPageData)
		filtersetPageData.selectedAttribute = $state.snapshot(filtersetPageData.data);
}

export function resetCurrentSelectedAttribute() {
	if (filtersetPageData) filtersetPageData.selectedAttribute = undefined;
}

export function saveCurrentSelectedAttribute() {
	if (filtersetPageData && filtersetPageData.selectedAttribute)
		filtersetPageData.data = filtersetPageData.selectedAttribute;
}

export function toggleFiltersetEnabled(category: FilterCategory, id: string) {
	getUserSettings().filters[category].filters = getUserSettings().filters[category].filters.map(
		(filter: AnyFilterset) => (
			filter.id === id ? { ...filter, enabled: !filter.enabled } : filter
		)
	);

	updateUserSettings();
	updateAllMapObjects().then();
}

export function getNewFilterset(): BaseFilterset {
	return {
		id: crypto.randomUUID(),
		title: {
			message: "pokemon_filter",
			title: undefined
		},
		icon: {
			isUserSelected: false,
			emoji: "💯"
		},
		enabled: true
	};
}

export function getCurrentSelectedFiltersetEncoded() {
	if (!filtersetPageData) return "";
	const thisData = $state.snapshot(filtersetPageData.data);
	thisData.id = "";
	thisData.enabled = true;
	const jsonStr = JSON.stringify(thisData);
	return btoa(encodeURIComponent(jsonStr));
}

export function decodeFilterset(category: FilterCategory | string, str: string) {
	const decoded: AnyFilterset = JSON.parse(decodeURIComponent(atob(str)));
	decoded.id = crypto.randomUUID();

	let safe: AnyFilterset | undefined = undefined;

	if (category === "pokemon") {
		safe = FiltersetPokemonSchema.safeParse(decoded)?.data;
	}

	return safe;
}
