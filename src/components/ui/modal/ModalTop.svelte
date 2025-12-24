<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Dialog, type WithoutChild } from 'bits-ui';
	import { closeModal, isOpenModal, type ModalType, openModal } from '@/lib/ui/modal.svelte.js';
	import Button from '@/components/ui/input/Button.svelte';
	import Modal from '@/components/ui/modal/Modal.svelte';

	let {
		modalType,
		children,
		onopenchange = undefined
	}: {
		modalType: ModalType,
		children?: Snippet
		onopenchange?: Dialog.RootProps["onOpenChange"]
	} = $props();
</script>

<Modal
	{modalType}
	{onopenchange}
	class="data-[state=closed]:slide-out-to-top-10 data-[state=open]:slide-in-from-top-10! zoom-in-100! zoom-out-100! top-2! translate-y-0!"
>
	{@render children?.()}
</Modal>