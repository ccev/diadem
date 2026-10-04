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
	import { focusFilterset } from "@/lib/features/filters/focusFilterset";
	import { getUserSettings } from "@/lib/services/userSettings.svelte";
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
				label: m.delete(),
				Icon: Trash,
				destructive: true,
				onclick: () => {
					setCurrentSelectedFilterset(majorCategory, subCategory, filter, true);
					deleteCurrentSelectedFilterset(mapObject);
				}
			},
			{
				label: filter.enabled ? m.quick_action_disable() : m.quick_action_enable(),
				Icon: filter.enabled ? EyeClosed : Eye,
				onclick: () => toggleFilterset(filter, mapObject)
			},
			{
				label: m.quick_action_focus(),
				Icon: Focus,
				onclick: () => {
					// Closing the menu is asynchronous when it is the top history entry.
					// Keep the search above it so closing it cannot undo the new search.
					setActiveSearch({
						name: filterTitle($state.snapshot(filter)),
						mapObject,
						filter: focusFilterset(
							$state.snapshot(getUserSettings().filters[majorCategory]),
							$state.snapshot(filter),
							subCategory
						)
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
			}
		];
	}
</script>

<div
	data-filterset={filter.id}
	data-base-ui-swipe-ignore
	class="flex items-center rounded-md border border-input bg-background group select-none cursor-grab active:cursor-grabbing"
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
	<button
		class="flex items-center min-w-0 flex-1 h-12 text-sm font-medium text-left rounded-l-md overflow-hidden hover:bg-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring cursor-inherit"
		aria-haspopup="menu"
		onclick={() => edit()}
	>
		<span
			class="h-12 w-0.5 mr-1.5 shrink-0"
			class:bg-green={filter.enabled}
			class:bg-red={!filter.enabled}
		></span>
		<span class="min-w-0 flex items-center gap-2 pr-2" class:opacity-50={!filter.enabled}>
			<FiltersetIcon filterset={$state.snapshot(filter)} size={5} />
			<span class="truncate">{filterTitle($state.snapshot(filter))}</span>
		</span>
	</button>
	<Button
		data-no-drag
		class="mr-1 shrink-0"
		variant="outline"
		size="icon"
		aria-label={filter.enabled ? m.quick_action_disable() : m.quick_action_enable()}
		onclick={() => toggleFilterset(filter, mapObject)}
	>
		{#if filter.enabled}<Eye size="16" />{:else}<EyeClosed size="16" />{/if}
	</Button>
</div>
