import { resetActiveSearchFilter } from "@/lib/features/activeSearch.svelte";
import {
	clearUpdateMapObjectsInterval,
	resetUpdateMapObjectsInterval
} from "@/lib/map/mapObjectsInterval";
import { setCurrentSearchQuery } from "@/lib/services/search.svelte";
import type { Snippet } from "svelte";
import {
	closeOverlay,
	isReconcilingOverlays,
	openOverlay,
	registerOverlayHandler
} from "@/lib/ui/overlays.svelte";

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
	stylePicker: boolean;
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
	filtersetMaxBattle: false,
	stylePicker: false
});

let selectOptions: Snippet | undefined = $state(undefined);
const openChangeHandlers = new Map<ModalType, Set<(open: boolean) => void>>();

function setModalOpen(modal: ModalType, open: boolean) {
	if (openModals[modal] === open) return;

	openModals[modal] = open;
	for (const handler of openChangeHandlers.get(modal) ?? []) handler(open);
}

registerOverlayHandler("modal", (entries) => {
	for (const modal of Object.keys(openModals) as ModalType[]) {
		setModalOpen(
			modal,
			entries.some((entry) => entry.id === modal)
		);
	}
	if (!openModals.select) selectOptions = undefined;
	updateMapObjectsInterval();
});

function updateMapObjectsInterval() {
	if (isAnyModalOpen()) clearUpdateMapObjectsInterval();
	else resetUpdateMapObjectsInterval();
}

export function openModal(modal: ModalType) {
	setModalOpen(modal, true);
	if (!isReconcilingOverlays()) openOverlay({ kind: "modal", id: modal });
	updateMapObjectsInterval();
}

export function openSelectModal(options: Snippet) {
	selectOptions = options;
	openModal("select");
}

export function closeModal(modal: ModalType) {
	setModalOpen(modal, false);
	if (modal === "select") selectOptions = undefined;
	if (!isReconcilingOverlays()) closeOverlay({ kind: "modal", id: modal });
	updateMapObjectsInterval();
}

export function registerModalOpenChangeHandler(modal: ModalType, handler: (open: boolean) => void) {
	const handlers = openChangeHandlers.get(modal) ?? new Set<(open: boolean) => void>();
	handlers.add(handler);
	openChangeHandlers.set(modal, handlers);

	return () => {
		handlers.delete(handler);
		if (handlers.size === 0) openChangeHandlers.delete(modal);
	};
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
