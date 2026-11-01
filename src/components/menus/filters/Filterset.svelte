<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import { ArrowDown, ArrowUp, Eye, EyeClosed, Focus, Pencil, Share2, Trash } from "@lucide/svelte";
	import { m } from "@/lib/paraglide/messages";

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
					setActiveSearch({ name: filterTitle(filter), mapObject, filter, subCategory });
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
	class="flex min-w-0 items-center gap-1 rounded-md border border-input bg-background pr-1 transition-colors hover:bg-accent hover:text-accent-foreground active:bg-accent active:text-accent-foreground select-none cursor-grab active:cursor-grabbing"
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
		title={filterTitle($state.snapshot(filter))}
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
			<FiltersetIcon filterset={$state.snapshot(filter)} size={5} />
			<span class="text-fade text-left flex-1">{filterTitle($state.snapshot(filter))}</span>
		</div>
	</Button>
	<Button
		data-no-drag
		class="shrink-0"
		variant="outline"
		size="icon"
		title={filter.enabled ? m.disable_filters() : m.enable_filters()}
		aria-label={filterTitle($state.snapshot(filter))}
		aria-pressed={filter.enabled}
		onclick={() => toggleFilterset(filter, mapObject)}
	>
		{#if filter.enabled}
			<Eye size="16" />
		{:else}
			<EyeClosed size="16" />
		{/if}
	</Button>
</div>
