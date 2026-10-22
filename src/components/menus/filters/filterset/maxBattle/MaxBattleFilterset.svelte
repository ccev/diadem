<script lang="ts">
	import FiltersetModal from "@/components/menus/filters/filterset/FiltersetModal.svelte";
	import AttributeChip from "@/components/menus/filters/filterset/AttributeChip.svelte";
	import Attribute from "@/components/menus/filters/filterset/Attribute.svelte";
	import AttributesOverview from "@/components/menus/filters/filterset/AttributesOverview.svelte";

	import type { FiltersetMaxBattle } from "@/lib/features/filters/filtersets";
	import { getCurrentSelectedFilterset } from "@/lib/features/filters/filtersetPageData.svelte";
	import { makeAttributePokemonLabel } from "@/lib/features/filters/makeAttributeChipLabel";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import MaxBattleBossAttribute from "@/components/menus/filters/filterset/maxBattle/MaxBattleBossAttribute.svelte";
	import MaxBattleFilterDisplay from "@/components/menus/filters/filterset/maxBattle/MaxBattleFilterDisplay.svelte";
	import AttributeToggle from "@/components/menus/filters/filterset/AttributeToggle.svelte";

	let data: FiltersetMaxBattle | undefined = $derived(getCurrentSelectedFilterset()?.data) as
		FiltersetMaxBattle | undefined;
</script>

<FiltersetModal
	modalType="filtersetMaxBattle"
	mapObject={MapObjectType.STATION}
	majorCategory="station"
	subCategory="maxBattle"
	titleBase="Max Battle Filter"
	titleShared="Shared Max Battle Filter"
	titleNew="New Max Battle Filter"
	titleEdit="Edit Max Battle Filter"
>
	{#snippet base()}
		{#if data}
			<MaxBattleFilterDisplay {data} />
		{/if}
	{/snippet}
	{#snippet overview()}
		{#if data}
			<AttributesOverview>
				<Attribute label="Bosses">
					<AttributeChip
						label={makeAttributePokemonLabel(data.bosses ?? [])}
						isEmpty={!data.bosses}
						onremove={() => delete data.bosses}
					/>
					{#snippet page(thisData: FiltersetMaxBattle)}
						<MaxBattleBossAttribute data={thisData} />
					{/snippet}
				</Attribute>
			</AttributesOverview>
			<AttributesOverview>
				<AttributeToggle
					label="Only show active"
					value={data.isActive ?? false}
					onchange={(v) => (data.isActive = v)}
				/>
				<AttributeToggle
					label="Has Gigantamax"
					value={data.hasGmax ?? false}
					onchange={(v) => (data.hasGmax = v)}
				/>
			</AttributesOverview>
		{/if}
	{/snippet}
</FiltersetModal>
