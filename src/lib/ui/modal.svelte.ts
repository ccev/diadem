import {
	clearUpdateMapObjectsInterval,
	resetUpdateMapObjectsInterval
} from "@/lib/map/mapObjectsInterval";
import { setCurrentSearchQuery } from "@/lib/services/search.svelte";
import { resetActiveSearchFilter } from "@/lib/features/activeSearch.svelte";
import type { Snippet } from "svelte";

export type OpenModals = {
	search: boolean;
	fortDetails: boolean;
	select: boolean;
	filtersetPokemon: boolean;
	filtersetPlainPokestop: boolean;
	filtersetQuest: boolean;
	filtersetInvasion: boolean;
	filtersetRaid: boolean;
	filtersetMaxBattle: boolean;
};
export type ModalType = keyof OpenModals;

let openModals: OpenModals = $state({
	search: false,
	fortDetails: false,
	select: false,
	filtersetPokemon: false,
	filtersetPlainPokestop: false,
	filtersetQuest: false,
	filtersetInvasion: false,
	filtersetRaid: false,
	filtersetMaxBattle: false
});

let selectOptions: Snippet | undefined = $state(undefined);

export function openModal(modal: ModalType) {
	openModals[modal] = true;
	clearUpdateMapObjectsInterval();
}

export function openSelectModal(options: Snippet) {
	selectOptions = options;
	openModal("select");
}

export function closeModal(modal: ModalType) {
	openModals[modal] = false;
	selectOptions = undefined;

	if (!isAnyModalOpen()) {
		resetUpdateMapObjectsInterval();
	}
}

export function isOpenModal(modal: ModalType) {
	return openModals[modal];
}

export function isAnyModalOpen() {
	return Boolean(Object.values(openModals).some(Boolean));
}

export function closeSearchModal() {
	closeModal("search");
	setCurrentSearchQuery("");
	resetActiveSearchFilter();
}

export function getSelectOptions() {
	return selectOptions;
}
