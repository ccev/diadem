<script module lang="ts">
	const sessionExpandedState: Record<string, boolean> = {};
</script>

<script lang="ts" generics="ParentCategory extends keyof UserSettings['filters']">
	import Card from "@/components/ui/Card.svelte";
	import { ChevronDown, ChevronUp, Eye, EyeOff, FunnelX, Plus } from "lucide-svelte";
	import MenuGeneric from "@/components/menus/MenuGeneric.svelte";
	import Button from "@/components/ui/input/Button.svelte";
	import FilterControl from "@/components/menus/filters/FilterControl.svelte";

	import { untrack } from "svelte";
	import { slide } from "svelte/transition";
	import { hasFeatureAnywhere } from "@/lib/services/user/checkPerm";
	import { getUserDetails } from "@/lib/services/user/userDetails.svelte";
	import type { AnyFilter, FilterCategory } from "@/lib/features/filters/filters";
	import Switch from "@/components/ui/input/Switch.svelte";
	import { getIconPokemon } from "@/lib/services/uicons.svelte";
	import type { Snippet } from "svelte";
	import {
		getUserSettings,
		updateUserSettings,
		type UserSettings
	} from "@/lib/services/userSettings.svelte";
	import { updateAllMapObjects } from "@/lib/mapObjects/updateMapObject";
	import { deleteAllFeaturesOfType } from "@/lib/map/featuresGen.svelte";
	import type { ModalType } from "@/lib/ui/modal.svelte";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

	import type { FeaturesKey } from "@/lib/utils/features";

	let {
		requiredPermission,
		title,
		category,
		mapObject,
		filterModal = undefined,
		isFilterable = true,
		subCategories = []
	}: {
		requiredPermission: FeaturesKey;
		title: string;
		category: ParentCategory;
		mapObject: MapObjectType;
		filterModal?: ModalType | undefined;
		isFilterable?: boolean;
		subCategories?: {
			title: string;
			category: FilterCategory;
			filterModal?: ModalType;
			filterable?: boolean;
			subPermission?: FeaturesKey;
		}[];
	} = $props();

	const perms = $derived(getUserDetails().permissions);
	// Section visible when at least one row inside it would render. For
	// split families this is "any visible sub-row", which keeps server-only
	// sub-features (e.g. defender) from making the card appear with no rows
	// when that's all the user has.
	const sectionVisible = $derived(
		subCategories.length > 0
			? subCategories.some((s) => !s.subPermission || hasFeatureAnywhere(perms, s.subPermission))
			: hasFeatureAnywhere(perms, requiredPermission)
	);

	let subcategoriesExpanded: boolean = $state(
		untrack(() => sessionExpandedState[category as string] ?? false)
	);

	$effect(() => {
		sessionExpandedState[category as string] = subcategoriesExpanded;
	});

	function onEnabledChange(_, value: boolean) {
		const filter: AnyFilter = getUserSettings().filters[category];
		filter.enabled = value;

		subCategories.forEach((subcategory) => {
			getUserSettings().filters[category][subcategory.category].enabled = value;
		});

		updateUserSettings();
		updateAllMapObjects().then();
	}

	function onSubEnabledChange(thisCategory: FilterCategory, value: boolean) {
		getUserSettings().filters[category][thisCategory].enabled = value;

		if (
			value ||
			!Object.values(getUserSettings().filters[category]).find((subcategory) => subcategory.enabled)
		) {
			// if enabled, always enable parent
			// if all siblngs are disabled, disable parent
			getUserSettings().filters[category].enabled = value;
		}

		deleteAllFeaturesOfType(mapObject);
		updateUserSettings();
		updateAllMapObjects().then();
	}
</script>

{#if sectionVisible}
	<Card class="py-1 px-2">
		<FilterControl
			{title}
			{isFilterable}
			{filterModal}
			{mapObject}
			majorCategory={category}
			{onEnabledChange}
			isExpandable={subCategories.length > 0}
			collapsibleByFiltersets={subCategories.length === 0}
			filter={getUserSettings().filters[category]}
			bind:expanded={subcategoriesExpanded}
		/>

		{#if subCategories.length > 0}
			{#if subcategoriesExpanded}
				<div class="mb-2" transition:slide={{ duration: 80 }}>
					{#each subCategories as subcategory}
						{#if !subcategory.subPermission || hasFeatureAnywhere(perms, subcategory.subPermission)}
							<FilterControl
								{mapObject}
								title={subcategory.title}
								majorCategory={category}
								subCategory={subcategory.category}
								filterModal={subcategory.filterModal}
								isFilterable={subcategory.filterable ?? true}
								onEnabledChange={onSubEnabledChange}
								filter={getUserSettings().filters[category][subcategory.category]}
							/>
						{/if}
					{/each}
				</div>
			{/if}
		{/if}
	</Card>
{/if}
