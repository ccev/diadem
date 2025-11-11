import {
	clearUpdateMapObjectsInterval,
	resetUpdateMapObjectsInterval
} from "@/lib/map/mapObjectsInterval";
import { filtersetPageReset } from '@/lib/ui/filtersetPages.svelte';

export type OpenModals = {
	search: boolean
	fortDetails: boolean
	select: boolean
	filtersetPokemon: boolean
	filtersetPlainPokestop: boolean
	filtersetQuest: boolean
	filtersetInvasion: boolean
}
export type ModalType = keyof OpenModals

let openModals: OpenModals = $state({
	search: false,
	fortDetails: false,
	select: false,
	filtersetPokemon: false,
	filtersetPlainPokestop: false,
	filtersetQuest: false,
	filtersetInvasion: false,
})

export function openModal(modal: ModalType) {
	openModals[modal] = true
	clearUpdateMapObjectsInterval()
}

export function closeModal(modal: ModalType) {
	openModals[modal] = false

	if (!isAnyModalOpen()) {
		resetUpdateMapObjectsInterval();
	}

	// this would only need to be done on filterset modal closes
	// delay to account for animations
	setTimeout(filtersetPageReset, 100)
}

export function isOpenModal(modal: ModalType) {
	return openModals[modal]
}

export function isAnyModalOpen() {
	return Boolean(Object.values(openModals).some(Boolean))
}
