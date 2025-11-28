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
	} from '@/lib/features/filters/filtersetPages.svelte.js';
	import FiltersetButtons from '@/components/menus/filters/filterset/FiltersetButtons.svelte';
	import { closeModal, type ModalType } from '@/lib/ui/modal.svelte';
	import { onDestroy, type Snippet } from 'svelte';
	import Button from '@/components/ui/input/Button.svelte';
	import {
		existsCurrentSelectedFilterset, getCurrentSelectedFilterset, getCurrentSelectedFiltersetInEdit,
		getCurrentSelectedFiltersetIsShared,
		resetCurrentSelectedFilterset
	} from '@/lib/features/filters/filtersetPageData.svelte.js';
	import PageBase from '@/components/menus/filters/filterset/PageBase.svelte';
	import type { FilterCategory } from '@/lib/features/filters/filters';
	import * as m from '@/lib/paraglide/messages';

	let {
		modalType,
		titleBase,
		titleShared,
		titleNew,
		titleEdit,
		category,
		overview,
		base,
		height = 130
	}: {
		modalType: ModalType
		titleBase: string
		titleShared: string
		titleNew: string
		titleEdit: string
		category: FilterCategory
		overview: Snippet
		base: Snippet
		height?: number
	} = $props();

	let modalTitle = $derived.by(() => {
		if (getCurrentSelectedFiltersetIsShared()) return titleShared
		if (!getCurrentSelectedFiltersetInEdit()) {
			return titleNew
		} else {
			if (getCurrentFiltersetPage() === "base") {
				return titleBase
			} else {
				return titleEdit
			}
		}
	})
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
	<div
		class="px-4 pb-2 pt-1 w-128 max-w-full overflow-hidden"
		style:height="min(calc(100vh - 4rem), {height / 4}rem)"
	>
		<div class="relative h-full">
			{#if getCurrentFiltersetPage() === "new"}
				<PageNewFilterset {category} />
			{:else if getCurrentFiltersetPage() === "base"}
				<PageBase {base} />
			{:else if getCurrentFiltersetPage() === "overview"}
				<PageOverview {overview} />
			{:else if getCurrentFiltersetPage() === "attribute" && getCurrentAttributePage().snippet}
				<PageAttribute />
			{/if}

			<FiltersetButtons {modalType} />
		</div>

	</div>
</Modal>
