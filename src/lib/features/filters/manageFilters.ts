import  { closeModal, type ModalType } from '@/lib/ui/modal.svelte';
import type { BaseFilterset } from '@/lib/features/filters/filtersets';

export function addOrUpdateFilterset() {
	// TODO
}

export function editFiltersetNoCommit() {

}

export function getNewFilterset(): BaseFilterset {
	return {
		id: crypto.randomUUID(),
		title: "?",
		icon: "💯",
		enabled: true
	}
}