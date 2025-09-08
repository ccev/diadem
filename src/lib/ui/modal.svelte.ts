export type OpenModals = {
	search: boolean
	fortDetails: boolean
	select: boolean
	filtersetPokemon: boolean
}
export type ModalType = keyof OpenModals

let openModals: OpenModals = $state({
	search: false,
	fortDetails: false,
	select: false,
	filtersetPokemon: false
})

export function openModal(modal: ModalType) {
	openModals[modal] = true
}

export function closeModal(modal: ModalType) {
	openModals[modal] = false
}

export function isOpenModal(modal: ModalType) {
	return openModals[modal]
}

export function isAnyModalOpen() {
	return Boolean(Object.values(openModals).some(Boolean))
}
