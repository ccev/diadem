<script lang="ts" generics="ParentCategory extends keyof UserSettings['filters']">
	import Card from '@/components/ui/Card.svelte';
	import { ChevronDown, ChevronUp, Eye, EyeOff, FunnelX, Plus } from 'lucide-svelte';
	import MenuGeneric from '@/components/menus/MenuGeneric.svelte';
	import Button from '@/components/ui/input/Button.svelte';
	import FilterControl from '@/components/menus/filters/FilterControl.svelte';

	import { slide } from 'svelte/transition';
	import { hasFeatureAnywhere } from '@/lib/services/user/checkPerm';
	import { getUserDetails } from '@/lib/services/user/userDetails.svelte';
	import type { FeaturesKey } from '@/lib/server/auth/permissions';
	import type { AnyFilter, FilterCategory } from '@/lib/features/filters/filters';
	import Switch from '@/components/ui/input/Switch.svelte';
	import { getIconPokemon } from '@/lib/services/uicons.svelte';
	import type { Snippet } from 'svelte';
	import { getUserSettings, updateUserSettings, type UserSettings } from '@/lib/services/userSettings.svelte';
	import { updateAllMapObjects } from '@/lib/mapObjects/updateMapObject';
	import { deleteAllFeaturesOfType } from '@/lib/map/featuresGen.svelte';
	import type { MapObjectType } from '@/lib/types/mapObjectData/mapObjects';
	import type { ModalType } from '@/lib/ui/modal.svelte';

	let {
		requiredPermission,
		title,
		category,
		mapObject,
		filterModal = undefined,
		isFilterable = true,
		subCategories = [],
	}: {
		requiredPermission: FeaturesKey
		title: string
		category: ParentCategory,
		mapObject: MapObjectType
		filterModal?: ModalType | undefined
		isFilterable?: boolean
		subCategories?: { title: string, category: FilterCategory, filterModal?: ModalType, filterable?: boolean }[]
	} = $props();

	let subcategoriesExpanded: boolean = $state(false);

	function onEnabledChange(thisCategory: ParentCategory, value: boolean) {
		const filter: AnyFilter = getUserSettings().filters[thisCategory];
		filter.enabled = value;

		subCategories.forEach(subcategory => {
			getUserSettings().filters[thisCategory][subcategory.category].enabled = value;
		});

		updateUserSettings();
		updateAllMapObjects().then();
	}

	function onSubEnabledChange(thisCategory: FilterCategory, value: boolean) {
		getUserSettings().filters[category][thisCategory].enabled = value;
		console.log(!Object.values(getUserSettings().filters[category]).find(subcategory => subcategory.enabled))
		console.log(Object.values(getUserSettings().filters[category]).find(subcategory => subcategory.enabled))

		if (
			value
			|| !Object.values(getUserSettings().filters[category]).find(subcategory => subcategory.enabled)
		) {
			// if enabled, always enable parent
			// if all siblngs are disabled, disable parent
			getUserSettings().filters[category].enabled = value;
		}

		deleteAllFeaturesOfType(mapObject)
		updateUserSettings();
		updateAllMapObjects().then();
	}
</script>

{#if hasFeatureAnywhere(getUserDetails().permissions, requiredPermission)}
	<Card class="py-1 px-2">
		<FilterControl
			{title}
			{category}
			{isFilterable}
			{filterModal}
			onEnabledChange={onEnabledChange}
			isExpandable={subCategories.length > 0}
			filter={getUserSettings().filters[category]}
			bind:expanded={subcategoriesExpanded}
		/>

		{#if subCategories.length > 0}
			{#if subcategoriesExpanded}
				<div class="mb-2" transition:slide={{ duration: 80 }}>
					{#each subCategories as subcategory}
						<FilterControl
							title={subcategory.title}
							category={subcategory.category}
							filterModal={subcategory.filterModal}
							isFilterable={subcategory.filterable ?? true}
							onEnabledChange={onSubEnabledChange}
							filter={getUserSettings().filters[category][subcategory.category]}
						/>
					{/each}
				</div>
			{/if}
			<!--			<div class="px-4 mb-0.5">-->
			<!--				<Button class="w-full justify-start!" variant="ghost" onclick={() => subcategoriesExpanded = !subcategoriesExpanded}>-->
			<!--					{#if subcategoriesExpanded}-->
			<!--						<span>Less</span>-->
			<!--						<ChevronUp size="18" />-->
			<!--					{:else}-->
			<!--						<span>Show categories</span>-->
			<!--						<ChevronDown size="18" />-->
			<!--					{/if}-->

			<!--				</Button>-->
			<!--			</div>-->
		{/if}
	</Card>
{/if}