<script lang="ts">
	import Modal from "@/components/ui/modal/Modal.svelte";
	import PageNewFilterset from "@/components/menus/filters/filterset/PageNewFilterset.svelte";
	import PageOverview from "@/components/menus/filters/filterset/PageOverview.svelte";
	import PageAttribute from "@/components/menus/filters/filterset/PageAttribute.svelte";
	import {
		getCurrentAttributePage,
		getCurrentFiltersetPage
	} from "@/lib/features/filters/filtersetPages.svelte.js";
	import FiltersetButtons from "@/components/menus/filters/filterset/FiltersetButtons.svelte";
	import { type ModalType } from "@/lib/ui/modal.svelte";
	import { type Snippet } from "svelte";
	import {
		getCurrentSelectedFiltersetInEdit,
		getCurrentSelectedFiltersetIsShared,
		type SelectedFiltersetData
	} from "@/lib/features/filters/filtersetPageData.svelte.js";
	import PageBase from "@/components/menus/filters/filterset/PageBase.svelte";
	import type { FilterCategory } from "@/lib/features/filters/filters";

	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

	let {
		modalType,
		mapObject,
		titleBase,
		titleShared,
		titleNew,
		titleEdit,
		majorCategory,
		subCategory = undefined,
		overview,
		base
	}: {
		modalType: ModalType;
		mapObject: MapObjectType;
		titleBase: string;
		titleShared: string;
		titleNew: string;
		titleEdit: string;
		majorCategory: SelectedFiltersetData["majorCategory"];
		subCategory?: FilterCategory;
		overview: Snippet;
		base: Snippet;
	} = $props();

	let modalTitle = $derived.by(() => {
		if (getCurrentSelectedFiltersetIsShared()) return titleShared;
		if (!getCurrentSelectedFiltersetInEdit()) {
			return titleNew;
		} else {
			if (getCurrentFiltersetPage() === "base") {
				return titleBase;
			} else {
				return titleEdit;
			}
		}
	});
</script>

<Modal
	{modalType}
	class="h-[calc(100vh-8rem)] max-h-200 w-[calc(100%-1rem)] max-w-2xl! flex flex-col pb-4 pt-3"
>
	{#snippet title()}
		<p class="pb-2 font-semibold text-base px-4">
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
		class="h-full w-full grid *:col-start-1 *:row-start-1 *:px-4 *:min-w-0 overflow-y-auto"
		style:grid-template="1fr / 1fr"
	>
		{#if getCurrentFiltersetPage() === "new"}
			<PageNewFilterset {majorCategory} {subCategory} />
		{:else if getCurrentFiltersetPage() === "base"}
			<PageBase {base} />
		{:else if getCurrentFiltersetPage() === "overview"}
			<PageOverview {overview} />
		{:else if getCurrentFiltersetPage() === "attribute" && getCurrentAttributePage().snippet}
			<PageAttribute />
		{/if}
	</div>
	<div class="px-4">
		<div class="relative">
			<FiltersetButtons {modalType} {mapObject} />
		</div>
	</div>
</Modal>
