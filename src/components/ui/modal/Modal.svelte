<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Dialog, type WithoutChild } from 'bits-ui';
	import { closeModal, isOpenModal, type ModalType, openModal } from '@/lib/ui/modal.svelte.js';
	import Button from '@/components/ui/input/Button.svelte';

	let {
		modalType,
		class: class_ = "",
		children
	}: {
		modalType: ModalType,
		class?: string,
		children?: Snippet
	} = $props();

	function isOpen() {
		return isOpenModal(modalType)
	}

	function setIsOpen(value: boolean) {
		if (value) {
			openModal(modalType)
		} else {
			closeModal(modalType)
		}
	}
</script>

<Dialog.Root bind:open={isOpen, setIsOpen}>
	<Dialog.Portal>
		<Dialog.Overlay
			class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 backdrop-blur-[1px] backdrop-brightness-95 transition-all"
		/>
		<Dialog.Content
			class="{class_} rounded-md shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 outline-hidden fixed left-1/2 top-1/2 z-50 max-w-[calc(100%-1rem)] -translate-x-1/2 -translate-y-1/2 border "
			trapFocus={false}
		>
			{@render children?.()}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>

