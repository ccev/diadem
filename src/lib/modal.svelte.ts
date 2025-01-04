import { setIsContxtMenuOpen } from '@/components/ui/contextmenu/utils.svelte';
import type { Snippet } from 'svelte';

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
	setIsContxtMenuOpen(false)
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

