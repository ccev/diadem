import { closeModal, type ModalType, openModal } from "@/lib/ui/modal.svelte";
import type { AnyFilterset, BaseFilterset } from "@/lib/features/filters/filtersets";
import type { AnyFilter, FilterCategory } from "@/lib/features/filters/filters";
import { getUserSettings, updateUserSettings, type UserSettings } from "@/lib/services/userSettings.svelte";
import { updateAllMapObjects } from "@/lib/mapObjects/updateMapObject";
import { FiltersetPokemonSchema } from "@/lib/features/filters/filtersetSchemas";
import { getId } from "@/lib/utils/uuid";
import * as m from "@/lib/paraglide/messages";
import { deleteAllFeaturesOfType } from "@/lib/map/featuresGen.svelte";
import type { MapObjectType } from "@/lib/types/mapObjectData/mapObjects";
import { generateFilterDetails } from "@/lib/features/filters/filtersetUtils";

type DataGeneric<M extends keyof UserSettings["filters"]> = {
	majorCategory: M
	subCategory: keyof UserSettings["filters"][M] | undefined;
	selectedAttribute: AnyFilterset | undefined;
	inEdit: boolean;
	isShared: boolean;
	data: AnyFilterset;
}
export type SelectedFiltersetData = DataGeneric<keyof UserSettings["filters"]>

let filtersetPageData: SelectedFiltersetData | undefined = $state(undefined);

export function setCurrentSelectedFilterset(
	majorCategory: FilterCategory,
	subCategory: FilterCategory | undefined,
	data: AnyFilterset,
	inEdit: boolean,
	isShared: boolean = false
) {
	// @ts-ignore my IDE doesn't allow the correct subCategory as defined in DataGeneric here, so this is easier with autocomplete
	filtersetPageData = { majorCategory, subCategory, data, inEdit, isShared, selectedAttribute: undefined };
}

export function resetCurrentSelectedFilterset() {
	filtersetPageData = undefined;
}

export function getCurrentSelectedFilterset() {
	return filtersetPageData;
}

function getFilter<Filterset extends AnyFilter>(): Filterset | undefined {
	const selectedFilterset = getCurrentSelectedFilterset()
	if (!selectedFilterset) return

	const majorFilterset = getUserSettings().filters[selectedFilterset.majorCategory]
	if (selectedFilterset.subCategory) {
		// @ts-ignore
		return majorFilterset[selectedFilterset.subCategory] as Filterset
	}
	// @ts-ignore
	return majorFilterset as Filterset
}

export function existsCurrentSelectedFilterset() {
	return getFilter()?.filters.some(
		(f) => f.id === getCurrentSelectedFilterset()?.data.id
	) ?? false;
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

export function saveSelectedFilterset(mapObject: MapObjectType) {
	const filterset = filtersetPageData?.data
	if (!filterset) return
	const filter = getFilter()
	if (!filter) return

	const exists = filter.filters.some((f) => f.id === filterset.id) ?? false;
	if (exists) {
		filter.filters = filter.filters.map((f) =>
			f.id === filterset.id ? filterset : f
		);
	} else {
		// @ts-ignore
		filter.filters.push(filterset)
	}

	updateUserSettings();
	deleteAllFeaturesOfType(mapObject)
	updateAllMapObjects().then();
}

export function deleteCurrentSelectedFilterset(mapObject: MapObjectType) {
	const filterset = filtersetPageData?.data
	if (!filterset) return
	const filter = getFilter()
	if (!filter) return

	filter.filters = filter.filters.filter(
		(f) => f.id !== filterset.id
	);

	updateUserSettings();
	deleteAllFeaturesOfType(mapObject)
	updateAllMapObjects().then();
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
	if (filtersetPageData && filtersetPageData.selectedAttribute) {
		filtersetPageData.data = filtersetPageData.selectedAttribute;
	}
}

export function updateDetailsCurrentSelectedFilterset() {
	const filterset = getCurrentSelectedFilterset()
	if (filterset) generateFilterDetails(filterset.majorCategory, filterset.subCategory, filterset.data)
}

export function toggleFilterset(filterset: AnyFilterset, mapObject: MapObjectType) {
	filterset.enabled = !filterset.enabled

	updateUserSettings();
	deleteAllFeaturesOfType(mapObject)
	updateAllMapObjects().then();
}

export function getNewFilterset(): BaseFilterset {
	return {
		id: getId(),
		title: {
			message: "unknown_filter",
			title: undefined
		},
		icon: {
			isUserSelected: false,
			emoji: "📂"
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

export function openFiltersetModal() {
	const filterset = getCurrentSelectedFilterset()
	if (!filterset) return

	const { majorCategory, subCategory } = filterset

	if (majorCategory === "pokemon") {
		openModal("filtersetPokemon")
	} else if (majorCategory === "pokestop" && subCategory === "quest") {
		openModal("filtersetQuest")
	} else if (majorCategory === "gym" && subCategory === "raid") {
		openModal("filtersetRaid")
	}
}