import type { Snippet } from "svelte";
import { FiniteStateMachine } from "runed";
import { closeModal, type ModalType } from "@/lib/ui/modal.svelte";
import { addOrUpdateFilterset, editFiltersetNoCommit } from '@/lib/features/filters/manageFilters';

export type FiltersetPage = "new" | "overview" | "attribute";
type PageEvents = "newFilter" | "save" | "close" | "reset" | "editAttribute";

export let isFilterPageTransitionReverse = false
let attributePageDetails: { snippet?: Snippet, label?: string } = $state({
	snippet: undefined,
	label: undefined
});

const pageStates = new FiniteStateMachine<FiltersetPage, PageEvents>("new", {
	new: {
		_enter: () => {
			isFilterPageTransitionReverse = false
		},
		newFilter: "overview",
		reset: "new"
	},
	overview: {
		close: "new",
		reset: "new",
		editAttribute: "attribute",
		save: (modalType: ModalType) => {
			addOrUpdateFilterset()
			closeModal(modalType)
		}
	},
	attribute: {
		_enter: () => {
			isFilterPageTransitionReverse = true
		},
		close: "overview",
		reset: "new",
		save: () => {
			editFiltersetNoCommit()
			return "overview"
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

export function filtersetPageSave(modalType: ModalType) {
	pageStates.send("save", modalType)
}

export function getCurrentFiltersetPage() {
	return pageStates.current;
}

export function setCurrentAttributePage(snippet: Snippet, label: string) {
	attributePageDetails = { snippet, label };
}

export function getCurrentAttributePage() {
	return attributePageDetails;
}
