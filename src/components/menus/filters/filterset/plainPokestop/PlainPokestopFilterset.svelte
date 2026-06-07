<script lang="ts">
	import FiltersetModal from "@/components/menus/filters/filterset/FiltersetModal.svelte";
	import AttributeChip from "@/components/menus/filters/filterset/AttributeChip.svelte";
	import Attribute from "@/components/menus/filters/filterset/Attribute.svelte";
	import AttributesOverview from "@/components/menus/filters/filterset/AttributesOverview.svelte";
	import SliderRange from "@/components/ui/input/slider/SliderRange.svelte";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import type { FiltersetPokestopPlain } from "@/lib/features/filters/filtersets";
</script>

<FiltersetModal
	mapObject={MapObjectType.POKESTOP}
	modalType="filtersetPlainPokestop"
	majorCategory="pokestop"
	subCategory="pokestopPlain"
	titleBase="Plain Pokestop Filter"
	titleShared="Shared Plain Pokestop Filter"
	titleNew="New Plain Pokestop Filter"
	titleEdit="Edit Plain Pokestop Filter"
>
	{#snippet base()}{/snippet}
	{#snippet overview()}
		<AttributesOverview>
			<Attribute label="Species">
				<AttributeChip label="3 Pokemon" isEmpty={false} color="yellow" />
				{#snippet page(_thisData: FiltersetPokestopPlain)}
					<div>test</div>
				{/snippet}
			</Attribute>
		</AttributesOverview>
		<AttributesOverview>
			<Attribute label="IVs">
				<AttributeChip label="97%+" isEmpty={false} color="yellow" />
				{#snippet page(_thisData: FiltersetPokestopPlain)}
					<SliderRange min={0} max={100} title="IV %" valueMin={95} valueMax={100} />
					<SliderRange min={0} max={15} title="Attack IV" valueMin={0} valueMax={15} />
					<SliderRange min={0} max={15} title="Defense IV" valueMin={0} valueMax={15} />
					<SliderRange min={0} max={15} title="Stamina IV" valueMin={0} valueMax={15} />
				{/snippet}
			</Attribute>
			<Attribute label="CP">
				<AttributeChip label="50-1500" isEmpty={false} color="yellow" />
				{#snippet page(_thisData: FiltersetPokestopPlain)}
					<SliderRange min={0} max={5000} title="CP" valueMin={50} valueMax={1500} />
				{/snippet}
			</Attribute>
			<Attribute label="Level">
				<AttributeChip isEmpty={true} color="muted" />
				{#snippet page(_thisData: FiltersetPokestopPlain)}
					<SliderRange min={1} max={50} title="Level" valueMin={1} valueMax={50} />
				{/snippet}
			</Attribute>
		</AttributesOverview>

		<AttributesOverview>
			<Attribute label="Little League">
				<AttributeChip isEmpty={true} color="muted" />
				{#snippet page(_thisData: FiltersetPokestopPlain)}
					<SliderRange min={1} max={100} title="Little League Rank" valueMin={0} valueMax={100} />
				{/snippet}
			</Attribute>
			<Attribute label="Great League">
				<AttributeChip isEmpty={true} color="muted" />
				{#snippet page(_thisData: FiltersetPokestopPlain)}
					<SliderRange min={1} max={100} title="Great League Rank" valueMin={0} valueMax={100} />
				{/snippet}
			</Attribute>
			<Attribute label="Ultra League">
				<AttributeChip label="Rank 1-15" isEmpty={false} color="yellow" />
				{#snippet page(_thisData: FiltersetPokestopPlain)}
					<SliderRange min={1} max={100} title="Ultra League Rank" valueMin={1} valueMax={15} />
				{/snippet}
			</Attribute>
		</AttributesOverview>
	{/snippet}
</FiltersetModal>
