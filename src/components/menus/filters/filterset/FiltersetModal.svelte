<script lang="ts">
	import Modal from '@/components/ui/modal/Modal.svelte';
	import MenuTitle from '@/components/menus/MenuTitle.svelte';
	import PageNewFilterset from '@/components/menus/filters/filterset/PageNewFilterset.svelte';
	import PageOverview from '@/components/menus/filters/filterset/PageOverview.svelte';
	import PageAttribute from '@/components/menus/filters/filterset/PageAttribute.svelte';
	import {
		type FiltersetPage,
		filtersetPageClose,
		filtersetPageSave,
		getCurrentAttributePage,
		getCurrentFiltersetPage
	} from '@/lib/ui/filtersetPages.svelte';
	import FiltersetButtons from '@/components/menus/filters/filterset/FiltersetButtons.svelte';
	import type { ModalType } from '@/lib/ui/modal.svelte';
	import { type Snippet } from 'svelte';
	import Button from '@/components/ui/input/Button.svelte';

	let {
		modalType,
		modalTitle,
		overview,
		initialPage,
		isInEdit
	}: {
		modalType: ModalType
		modalTitle: string
		overview: Snippet
		initialPage: FiltersetPage
		isInEdit: boolean
	} = $props();

	function onsave() {
		filtersetPageSave(modalType);
	}

	function oncancel() {
		filtersetPageClose(modalType);
	}

	function ondelete() {
		if (!isInEdit) return;
	}
</script>

<Modal {modalType} class="max-h-screen">
	{#snippet title()}
		<p class="pb-2 pl-5 pt-3 font-semibold text-base">
			<span>
				{modalTitle}
			</span>
			{#if getCurrentAttributePage().label && getCurrentFiltersetPage() === "attribute"}
				<span class="font-normal">
					/ {getCurrentAttributePage().label}
				</span>
			{/if}
		</p>
	{/snippet}
	<div class="px-4 py-2 w-128 max-w-full h-130 overflow-hidden ">
		<div class="relative h-full">
			{#if getCurrentFiltersetPage() === "new"}
				<PageNewFilterset />
			{:else if getCurrentFiltersetPage() === "overview"}
				<PageOverview {overview} />
			{:else if getCurrentFiltersetPage() === "attribute" && getCurrentAttributePage().snippet}
				<PageAttribute>
					{@render getCurrentAttributePage().snippet?.()}
				</PageAttribute>
			{/if}

			{#if getCurrentFiltersetPage() !== "new"}
				<FiltersetButtons
					showDelete={isInEdit}
					{oncancel}
					{onsave}
					{ondelete}
				/>
			{/if}
		</div>

	</div>
</Modal>
