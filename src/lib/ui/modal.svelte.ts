import {
	clearUpdateMapObjectsInterval,
	resetUpdateMapObjectsInterval
} from "@/lib/map/mapObjectsInterval";
import { setCurrentSearchQuery } from "@/lib/services/search.svelte";
import { resetActiveSearchFilter } from "@/lib/features/activeSearch.svelte";

export type OpenModals = {
	search: boolean;
	fortDetails: boolean;
	select: boolean;
	filtersetPokemon: boolean;
	filtersetPlainPokestop: boolean;
	filtersetQuest: boolean;
	filtersetInvasion: boolean;
	filtersetRaid: boolean;
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
	filtersetRaid: false
});

export function openModal(modal: ModalType) {
	openModals[modal] = true;
	clearUpdateMapObjectsInterval();
}

export function closeModal(modal: ModalType) {
	openModals[modal] = false;

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
	closeModal("search")
	setCurrentSearchQuery("")
	resetActiveSearchFilter()
}
