<script lang="ts">
	import { getConfig } from '@/lib/services/config/config';
	import * as m from '@/lib/paraglide/messages';
	import Card from '@/components/ui/Card.svelte';
	import { getUserSettings, updateUserSettings } from '@/lib/services/userSettings.svelte.js';
	import { ChevronDown, ChevronUp, Eye, EyeOff, Filter, Plus } from 'lucide-svelte';
	import MenuGeneric from '@/components/menus/MenuGeneric.svelte';
	import Button from '@/components/ui/input/Button.svelte';
	import { getIconPokemon } from '@/lib/services/uicons.svelte.js';
	import Switch from '@/components/ui/input/Switch.svelte';
	import FilterTypeSelect from '@/components/menus/filters/FilterTypeSelect.svelte';

	import { slide } from 'svelte/transition';
	import Select from '@/components/ui/input/Select.svelte';
	import { hasFeatureAnywhere } from '@/lib/services/user/checkPerm';
	import { getUserDetails } from '@/lib/services/user/userDetails.svelte';
	import Metadata from '@/components/utils/Metadata.svelte';

	let test: boolean = $state(false);

	function onS2CellChange(value) {
		getUserSettings().filters.s2cell.filters.levels = [value];
		updateUserSettings();
	}
</script>

<svelte:head>
	<Metadata title={m.nav_filters()} />
</svelte:head>

{#snippet showWhat()}
	<FilterTypeSelect category="pokestopMajor">
	</FilterTypeSelect>
	<!--	<div class="grid grid-cols-3 gap-2">-->
	<!--		<Button variant="outline">-->
	<!--			<Eye size="16" />-->
	<!--			<span>All</span>-->
	<!--		</Button>-->
	<!--		<Button variant="outline">-->
	<!--			<EyeOff size="16" />-->
	<!--			<span>None</span>-->
	<!--		</Button>-->
	<!--		<Button variant="outline">-->
	<!--			<Filter size="16" />-->
	<!--			<span>Filtered</span>-->
	<!--		</Button>-->
	<!--	</div>-->
{/snippet}

{#snippet showWhat2()}
	<div class="grid grid-cols-3 gap-2">
		<Button variant="outline">
			<Eye size="16" />
			<span>All</span>
		</Button>
		<Button variant="outline">
			<EyeOff size="16" />
			<span>None</span>
		</Button>
		<Button variant="outline">
			<Filter size="16" />
			<span>Filtered</span>
		</Button>
	</div>
{/snippet}
<!--{#snippet showWhat()}-->
<!--	<SelectGroup-->
<!--		value={"" + getUserSettings().isDarkMode}-->
<!--		onValueChange={() => {}}-->
<!--		class="self-center"-->
<!--	>-->
<!--		<SelectGroupItem class="p-4" value="false">-->
<!--			<Eye size="20" />-->
<!--			All-->
<!--		</SelectGroupItem>-->
<!--		<SelectGroupItem class="p-4" value="null">-->
<!--			<EyeOff size="20" />-->
<!--			None-->
<!--		</SelectGroupItem>-->
<!--		<SelectGroupItem class="p-4" value="true">-->
<!--			<Filter size="20" />-->
<!--			Filtered-->
<!--		</SelectGroupItem>-->
<!--	</SelectGroup>-->
<!--{/snippet}-->

<div class="mt-2" style="container-name: menu; container-type: inline-size">
	{#if hasFeatureAnywhere(getUserDetails().permissions, "pokemon")}
		<Card class="pt-4 pb-2 px-2 mb-4">
			<MenuGeneric title="Pokémon">
				<FilterTypeSelect category="pokemonMajor" />

				{#if getUserSettings().filters.pokemonMajor.type === "filtered"}
					<div class="w-full flex flex-col gap-2" transition:slide={{ duration: 90 }}>
						<Button variant="outline" size="" class="px-2 py-2 border-2 rounded-md gap-2">
							<span>💯</span>
							<span>100% IV</span>
							<Switch class="ml-auto" checked={true} />
						</Button>
						<Button variant="outline" size="" class="px-2 py-2 border-2 rounded-md gap-2">
							<span>🔍</span>
							<span>Unown, Mesprit, Azelf, Tyranit...</span>
							<Switch class="ml-auto" checked={true} />
						</Button>
						<Button variant="outline" size="" class="px-2 py-2 border-2 rounded-md gap-2">
							<img class="w-5 h-5" alt="Pikachu Icon" src={getIconPokemon({ pokemon_id: 25 })}>
							<span>97%+ IV Pikachu</span>
							<Switch class="ml-auto" checked={true} />
						</Button>
						<Button variant="outline" size="" class="px-2 py-2 border-2 rounded-md gap-2">
							<span>🏆</span>
							<span>Rank 1 Great League</span>
							<Switch class="ml-auto" checked={true} />
						</Button>
						<Button variant="secondary">
							<Plus size="16" />
							<span>Add Filterset</span>
						</Button>
					</div>
				{/if}
			</MenuGeneric>
		</Card>
	{/if}

	{#if hasFeatureAnywhere(getUserDetails().permissions, "pokestop")}
		<Card class="pt-4 pb-2 px-2 mb-4">
			<MenuGeneric title="Plain Pokéstops">
				<FilterTypeSelect category="pokestopPlain" />
			</MenuGeneric>
			{#if test}
				<div transition:slide={{ duration: 80 }}>
					<MenuGeneric title="Quests">
						<FilterTypeSelect category="quest" />
					</MenuGeneric>
					<MenuGeneric title="Team Rocket">
						<FilterTypeSelect category="invasion" />
					</MenuGeneric>
					<MenuGeneric title="Showcases">
						<FilterTypeSelect category="contest" />
					</MenuGeneric>
					<MenuGeneric title="Lures">
						<FilterTypeSelect category="lure" />
					</MenuGeneric>
				</div>
			{/if}
			<Button class="w-full" variant="ghost" onclick={() => test = !test}>
				{#if test}
					<ChevronUp size="18" />
					<span>Less</span>
				{:else}
					<ChevronDown size="18" />
					<span>More</span>
				{/if}

			</Button>
		</Card>
	{/if}

	{#if hasFeatureAnywhere(getUserDetails().permissions, "gym")}
		<Card class="pt-4 pb-2 px-2 mb-4">
			<MenuGeneric title="Plain Gyms">
				<FilterTypeSelect category="gymPlain" />
			</MenuGeneric>
			<MenuGeneric title="Raids">
				{@render showWhat()}
			</MenuGeneric>
		</Card>
	{/if}

	{#if hasFeatureAnywhere(getUserDetails().permissions, "station")}
		<Card class="pt-4 pb-2 px-2 mb-4">
			<MenuGeneric title="Plain Power Spots">
				<FilterTypeSelect category="stationMajor" />
			</MenuGeneric>
		</Card>
	{/if}

	{#if hasFeatureAnywhere(getUserDetails().permissions, "s2cell")}
		<Card class="pt-4 pb-2 px-2">
			<MenuGeneric title="S2 Cells">
				<FilterTypeSelect category="s2cell" />

				{#if getUserSettings().filters.s2cell.type === "all"}
					<Select
						onselect={onS2CellChange}
						value={getUserSettings().filters.s2cell.filters.levels[0]}
						title="Level"
						options={[
						{ value: 10, label: "Level 10" },
						{ value: 15, label: "Level 15" },
						{ value: 16, label: "Level 16" },
						{ value: 17, label: "Level 17" },
						{ value: 18, label: "Level 18" },
					]}
					/>
				{/if}
			</MenuGeneric>
		</Card>
	{/if}
</div>
