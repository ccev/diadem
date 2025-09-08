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

	let {
		requiredPermission,
		title,
		category,
		isFilterable = true,
		subCategories = [],
	}: {
		requiredPermission: FeaturesKey
		title: string
		category: ParentCategory,
		isFilterable?: boolean
		subCategories?: { title: string, category: FilterCategory, filterable?: boolean }[]
	} = $props();

	let subcategoriesExpanded: boolean = $state(false);

	const test = getUserSettings().filters[category]

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

		updateUserSettings();
		updateAllMapObjects().then();
	}
</script>

{#if hasFeatureAnywhere(getUserDetails().permissions, requiredPermission)}
	<Card class="py-0 px-2">
		<FilterControl
			{title}
			{category}
			{isFilterable}
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