<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import { ArrowDown, ArrowUp, Eye, EyeClosed, Focus, Pencil, Share2, Trash } from "@lucide/svelte";
	import type { AnyFilterset } from "@/lib/features/filters/filtersets";
	import { type ModalType, openModal } from "@/lib/ui/modal.svelte";
	import {
		type SelectedFiltersetData,
		setCurrentSelectedFilterset,
		deleteCurrentSelectedFilterset,
		getCurrentSelectedFiltersetEncoded,
		toggleFilterset
	} from "@/lib/features/filters/filtersetPageData.svelte";
	import {
		filtersetPageReset,
		filtersetPageEdit
	} from "@/lib/features/filters/filtersetPages.svelte";
	import { filterTitle } from "@/lib/features/filters/filtersetUtils.svelte";
	import FiltersetIcon from "@/lib/features/filters/FiltersetIcon.svelte";
	import type { FilterCategory } from "@/lib/features/filters/filters";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import { openQuickActions, type QuickAction } from "@/lib/ui/quickActions.svelte";
	import { quickPress } from "@/lib/ui/actions/quickPress";
	import { setActiveSearch } from "@/lib/features/activeSearch.svelte";
	import { closeMenu } from "@/lib/ui/menus.svelte";
	import { backupShareUrl } from "@/lib/utils/device";
	import { getRootOrigin } from "@/lib/native/runtime";
	import { m } from "@/lib/paraglide/messages";

	let {
		filter,
		majorCategory,
		subCategory,
		filterModal,
		mapObject,
		index,
		count,
		onMove
	}: {
		filter: AnyFilterset;
		majorCategory: SelectedFiltersetData["majorCategory"];
		subCategory?: FilterCategory;
		filterModal: ModalType;
		mapObject: MapObjectType;
		index: number;
		count: number;
		onMove: (to: number) => void;
	} = $props();

	function edit(direct = false) {
		setCurrentSelectedFilterset(majorCategory, subCategory, $state.snapshot(filter), true);
		filtersetPageReset();
		if (direct) filtersetPageEdit();
		openModal(filterModal);
	}

	function actions(): QuickAction[] {
		return [
			{ label: m.edit(), Icon: Pencil, onclick: () => edit(true) },
			{
				label: filter.enabled ? m.quick_action_disable() : m.quick_action_enable(),
				Icon: filter.enabled ? EyeClosed : Eye,
				onclick: () => toggleFilterset(filter, mapObject)
			},
			{
				label: m.quick_action_focus(),
				Icon: Focus,
				onclick: () => {
					setActiveSearch({
						name: filterTitle(filter),
						mapObject,
						filter,
						subCategory
					});
					closeMenu();
				}
			},
			{
				label: m.quick_action_move_up(),
				Icon: ArrowUp,
				disabled: index === 0,
				onclick: () => onMove(index - 1)
			},
			{
				label: m.quick_action_move_down(),
				Icon: ArrowDown,
				disabled: index === count - 1,
				onclick: () => onMove(index + 1)
			},
			{
				label: m.popup_share(),
				Icon: Share2,
				onclick: () => {
					setCurrentSelectedFilterset(majorCategory, subCategory, filter, true);
					const path = subCategory ? `${majorCategory}/${subCategory}` : majorCategory;
					void backupShareUrl(
						`${getRootOrigin()}/filter/${path}/${getCurrentSelectedFiltersetEncoded()}`
					);
				}
			},
			{
				label: m.delete(),
				Icon: Trash,
				destructive: true,
				onclick: () => {
					setCurrentSelectedFilterset(majorCategory, subCategory, filter, true);
					deleteCurrentSelectedFilterset(mapObject);
				}
			}
		];
	}
</script>

<div
	data-filterset={filter.id}
	class="inline-flex items-center gap-1.5 pr-1 relative overflow-hidden rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent active:text-accent-foreground transition-colors group select-none cursor-grab active:cursor-grabbing"
	style="-webkit-touch-callout: none"
	{@attach (node) =>
		quickPress(node, (x, y) =>
			openQuickActions({
				x,
				y,
				title: filterTitle($state.snapshot(filter)),
				getActions: actions,
				trigger: node.querySelector("button") ?? undefined
			})
		)}
>
	<Button
		class="pl-0! pr-0! h-fit! min-w-0 flex-1 cursor-inherit"
		variant=""
		size=""
		aria-haspopup="menu"
		onclick={() => edit()}
	>
		<div
			class="h-12 w-0.5 mr-1.5 transition-colors shrink-0"
			class:bg-green={filter.enabled}
			class:bg-red={!filter.enabled}
		></div>
		<div
			class="shrink-1 min-w-0 w-full flex gap-2 items-center justify-start rounded-md py-2 h-12 m-0! pr-0 transition-opacity relative"
			class:opacity-50={!filter.enabled}
		>
			<div
				class="absolute right-0 h-full w-4 bg-linear-to-l from-background to-transparent group-hover:from-accent transition-colors"
			></div>
			<FiltersetIcon filterset={$state.snapshot(filter)} size={5} />
			<span class="overflow-x-hidden">{filterTitle($state.snapshot(filter))}</span>
		</div>
	</Button>
	<Button
		data-no-drag
		class="ml-auto my-0! shrink-0"
		variant="outline"
		size="icon"
		aria-label={filter.enabled ? m.quick_action_disable() : m.quick_action_enable()}
		onclick={() => toggleFilterset(filter, mapObject)}
	>
		{#if filter.enabled}
			<Eye size="16" />
		{:else}
			<EyeClosed size="16" />
		{/if}
	</Button>
</div>
