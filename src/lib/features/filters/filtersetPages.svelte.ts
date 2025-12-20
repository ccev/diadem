import type { Snippet } from "svelte";
import { FiniteStateMachine } from "runed";
import { closeModal, type ModalType } from "@/lib/ui/modal.svelte.js";
import {
	getCurrentSelectedFilterset,
	getCurrentSelectedFiltersetInEdit,
	getNewFilterset,
	saveCurrentSelectedAttribute,
	saveSelectedFilterset,
	setCurrentSelectedFilterset, updateDetailsCurrentSelectedFilterset
} from "@/lib/features/filters/filtersetPageData.svelte.js";
import type { AnyFilterset } from '@/lib/features/filters/filtersets';
import type { MapObjectType } from "@/lib/types/mapObjectData/mapObjects";
import { generateFilterDetails } from "@/lib/features/filters/filtersetUtils";

export type FiltersetPage = "base" | "new" | "overview" | "attribute";
export type FiltersetSnippet<T extends AnyFilterset> = Snippet<[T]>
type PageEvents = "newFilter" | "save" | "close" | "reset" | "editAttribute" | "edit" | "select";

let isFilterPageBack = $state(false)
let isFilterPageReset = $state(false)
let hasSelectedSuggestedFilter = false

let attributePageDetails: { snippet?: FiltersetSnippet<AnyFilterset>, label?: string } = $state({
	snippet: undefined,
	label: undefined
});

function pageBack(page: FiltersetPage) {
	isFilterPageBack = true
	return page
}

function pageForward(page: FiltersetPage) {
	isFilterPageBack = false
	return page
}

function resetPages() {
	isFilterPageReset = true
	hasSelectedSuggestedFilter = false
	setTimeout(() => isFilterPageReset = false, 100)
	return getCurrentSelectedFiltersetInEdit() ? "base" : "new"
}

const pageStates = new FiniteStateMachine<FiltersetPage, PageEvents>("base", {
	base: {
		reset: resetPages,
		edit: () => pageForward('overview'),
		// @ts-ignore
		close: (modalType: ModalType) => {
			if (getCurrentSelectedFiltersetInEdit()) {
				closeModal(modalType)
			} else {
				return pageBack("new")
			}
		},
		// @ts-ignore
		save: (modalType: ModalType, mapObject: MapObjectType) => {
			saveSelectedFilterset(mapObject)
			closeModal(modalType)
		}
	},
	new: {
		_enter: () => {
			hasSelectedSuggestedFilter = false
		},
		reset: resetPages,
		newFilter: () => {
			const majorCategory = getCurrentSelectedFilterset()?.majorCategory
			const subCategory = getCurrentSelectedFilterset()?.subCategory
			// @ts-ignore
			if (majorCategory) setCurrentSelectedFilterset(majorCategory, subCategory, getNewFilterset(), false);
			updateDetailsCurrentSelectedFilterset()
			return pageForward("overview")
		},
		select: () => {
			hasSelectedSuggestedFilter = true
			return pageForward("base")
		}
	},
	overview: {
		reset: resetPages,
		close: () => {
			if (getCurrentSelectedFiltersetInEdit() || hasSelectedSuggestedFilter) {
				return pageBack("base")
			} else {
				return pageBack("new")
			}
		},
		editAttribute: () => pageForward("attribute"),
		// @ts-ignore
		save: (modalType: ModalType, mapObject: MapObjectType) => {
			if (!hasSelectedSuggestedFilter) {
				saveSelectedFilterset(mapObject)
				closeModal(modalType)
			} else {
				return pageBack("base")
			}
		}
	},
	attribute: {
		reset: resetPages,
		close: () => pageBack("overview"),
		save: () => {
			saveCurrentSelectedAttribute()
			updateDetailsCurrentSelectedFilterset()
			return pageBack("overview")
		}
	}
});

export function filtersetPageReset() {
	pageStates.send("reset")
}

export function filtersetPageNew() {
	pageStates.send("newFilter")
}

export function filtersetPageEditAttribute() {
	pageStates.send("editAttribute")
}

export function filtersetPageClose(modalType: ModalType) {
	pageStates.send("close", modalType)
}

export function filtersetPageSave(modalType: ModalType, mapObject: MapObjectType) {
	pageStates.send("save", modalType, mapObject)
}

export function filtersetPageEdit() {
	pageStates.send("edit")
}

export function filtersetPageSelect() {
	pageStates.send("select")
}

export function getCurrentFiltersetPage() {
	return pageStates.current;
}

export function setCurrentAttributePage<T extends AnyFilterset>(snippet: FiltersetSnippet<T>, label: string) {
	attributePageDetails = {
		snippet: snippet as FiltersetSnippet<AnyFilterset>,
		label
	};
}

export function getCurrentAttributePage() {
	return attributePageDetails;
}

export function getFiltersetPageTransition() {
	const duration = isFilterPageReset ? 0 : 100
	return {
		out: {duration, x: isFilterPageBack ? 80 : -80},
		in: {duration, x: isFilterPageBack ? -80 : 80}
	}
}
