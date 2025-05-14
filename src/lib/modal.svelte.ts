import type { Snippet } from 'svelte';

import { setIsContextMenuOpen } from '@/lib/map/contextmenu.svelte';

type ModalVertical = "top" | "center"
type ModalOptions = {
	isOpen: boolean
	snippet: Snippet | undefined
	vertical: ModalVertical
}
const defaultOptions: ModalOptions = {
	isOpen: false,
	snippet: undefined,
	vertical: "top"
}

let modalOptions: ModalOptions = $state(defaultOptions)

export function isModalOpen() {
	return modalOptions.isOpen
}

export function openModal(snippet: Snippet, vertical: ModalVertical = "center") {
	modalOptions = {
		isOpen: true,
		snippet,
		vertical
	}
}

export function closeModal() {
	modalOptions = defaultOptions
}

export function getModalOptions() {
	return modalOptions
}

