import  { closeModal, type ModalType } from '@/lib/ui/modal.svelte';
import type { AnyFilterset, BaseFilterset } from "@/lib/features/filters/filtersets";
import type { AnyFilter, FilterCategory } from "@/lib/features/filters/filters";
import { getUserSettings, updateUserSettings } from "@/lib/services/userSettings.svelte";
import { updateAllMapObjects } from '@/lib/mapObjects/updateMapObject';

let filtersetPageData: {
	category: FilterCategory,
	selectedAttribute: AnyFilterset | undefined,
	inEdit: boolean,
	data: AnyFilterset
} | undefined = $state(undefined)

export function setCurrentSelectedFilterset(category: FilterCategory, data: AnyFilterset, inEdit: boolean) {
	filtersetPageData = { category, data, inEdit, selectedAttribute: undefined }
}

export function resetCurrentSelectedFilterset() {
	filtersetPageData = undefined
}

export function getCurrentSelectedFilterset() {
	return filtersetPageData
}

export function existsCurrentSelectedFilterset() {
	if (!getCurrentSelectedFilterset()) {
		return false
	} else {
		return getUserSettings().filters[getCurrentSelectedFilterset()?.category]?.filters.some(f => f.id === getCurrentSelectedFilterset().data.id)
	}
}

export function getCurrentSelectedFiltersetInEdit() {
	return filtersetPageData?.inEdit || false
}

export function saveSelectedFilterset() {
	const filterset = filtersetPageData

	if (filterset) {
		const filters: AnyFilterset[] | undefined = getUserSettings().filters[filterset.category]?.filters
		if (!filters) return

		const exists = filters.some(f => f.id === filterset.data.id)
		if (exists) {
			getUserSettings().filters[filterset.category].filters = filters.map(f => f.id === filterset.data.id ? filterset.data : f)
		} else {
			getUserSettings().filters[filterset.category].filters.push(filterset.data)
		}

		updateUserSettings();
		updateAllMapObjects().then();
	}
}

export function deleteCurrentSelectedFilterset() {
	const filterset = filtersetPageData

	if (filterset) {
		const filters: AnyFilterset[] | undefined = getUserSettings().filters[filterset.category]?.filters
		if (!filters) return

		getUserSettings().filters[filterset.category].filters = filters.filter(f => f.id !== filterset.data.id)

		updateUserSettings();
		updateAllMapObjects().then();
	}
}


export function getCurrentSelectedAttribute() {
	return filtersetPageData?.selectedAttribute
}

export function setCurrentSelectedAttribute() {
	if (filtersetPageData) filtersetPageData.selectedAttribute = $state.snapshot(filtersetPageData.data)
}

export function resetCurrentSelectedAttribute() {
	if (filtersetPageData) filtersetPageData.selectedAttribute = undefined
}

export function saveCurrentSelectedAttribute() {
	if (filtersetPageData && filtersetPageData.selectedAttribute) filtersetPageData.data = filtersetPageData.selectedAttribute
}

export function getNewFilterset(): BaseFilterset {
	return {
		id: crypto.randomUUID(),
		title: "?",
		icon: "💯",
		enabled: true
	}
}

export function getCurrentSelectedFiltersetEncoded() {
	if (!filtersetPageData) return ""
	const thisData = $state.snapshot(filtersetPageData.data)
	thisData.id = ""
	thisData.enabled = true
	const jsonStr = JSON.stringify(thisData)
	return btoa(encodeURIComponent(jsonStr))
}

export function decodeFilterset(str: string) {
	const decoded: AnyFilterset = JSON.parse(decodeURIComponent(atob(str)))
	// TODO: check if object is ok (i.e. with zod)
	decoded.id = crypto.randomUUID()
	return decoded
}