<script lang="ts">
	import FiltersetModal from '@/components/menus/filters/filterset/FiltersetModal.svelte';
	import AttributeChip from '@/components/menus/filters/filterset/AttributeChip.svelte';
	import Attribute from '@/components/menus/filters/filterset/Attribute.svelte';
	import AttributesOverview from '@/components/menus/filters/filterset/AttributesOverview.svelte';
	import PageAttribute from '@/components/menus/filters/filterset/PageAttribute.svelte';
	import SliderRange from '@/components/ui/input/slider/SliderRange.svelte';
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

	let {
		isInEdit
	}: {
		isInEdit: boolean;
	} = $props();

</script>

<FiltersetModal
	mapObject={MapObjectType.POKESTOP}
	modalType="filtersetPlainPokestop"
	modalTitle="Plain Pokestop Filter"
	{isInEdit}
	initialPage={isInEdit ? "overview" : "new"}
>
	{#snippet overview()}
		<AttributesOverview>
			<Attribute
				label="Species"
			>
				<AttributeChip
					label="3 Pokemon"
					color="yellow"
				/>
				{#snippet page()}
					<PageAttribute>
						<div>test</div>
					</PageAttribute>
				{/snippet}
			</Attribute>
		</AttributesOverview>
		<AttributesOverview>
			<Attribute
				label="IVs"
			>
				<AttributeChip
					label="97%+"
					color="yellow"
				/>
				{#snippet page()}
					<PageAttribute>
						<SliderRange
							min={0}
							max={100}
							title="IV %"
							valueMin={95}
							valueMax={100}
						/>
						<SliderRange
							min={0}
							max={15}
							title="Attack IV"
							valueMin={0}
							valueMax={15}
						/>
						<SliderRange
							min={0}
							max={15}
							title="Defense IV"
							valueMin={0}
							valueMax={15}
						/>
						<SliderRange
							min={0}
							max={15}
							title="Stamina IV"
							valueMin={0}
							valueMax={15}
						/>
					</PageAttribute>
				{/snippet}
			</Attribute>
			<Attribute
				label="CP"
			>
				<AttributeChip
					label="50-1500"
					color="yellow"
				/>
				{#snippet page()}
					<PageAttribute>
						<SliderRange
							min={0}
							max={5000}
							title="CP"
							valueMin={50}
							valueMax={1500}
						/>
					</PageAttribute>
				{/snippet}
			</Attribute>
			<Attribute
				label="Level"
			>
				<AttributeChip
					label="Any"
					color="muted"
				/>
				{#snippet page()}
					<PageAttribute>
						<SliderRange
							min={1}
							max={50}
							title="Level"
							valueMin={1}
							valueMax={50}
						/>
					</PageAttribute>
				{/snippet}
			</Attribute>
		</AttributesOverview>

		<AttributesOverview>
			<Attribute
				label="Little League"
			>
				<AttributeChip
					label="Any"
					color="muted"
				/>
				{#snippet page()}
					<PageAttribute>
						<SliderRange
							min={1}
							max={100}
							title="Little League Rank"
							valueMin={0}
							valueMax={100}
						/>
					</PageAttribute>
				{/snippet}
			</Attribute>
			<Attribute
				label="Great League"
			>
				<AttributeChip
					label="Any"
					color="muted"
				/>
				{#snippet page()}
					<PageAttribute>
						<SliderRange
							min={1}
							max={100}
							title="Great League Rank"
							valueMin={0}
							valueMax={100}
						/>
					</PageAttribute>
				{/snippet}
			</Attribute>
			<Attribute
				label="Ultra League"
			>
				<AttributeChip
					label="Rank 1-15"
					color="yellow"
				/>
				{#snippet page()}
					<PageAttribute>
						<SliderRange
							min={1}
							max={100}
							title="Ultra League Rank"
							valueMin={1}
							valueMax={15}
						/>
					</PageAttribute>
				{/snippet}
			</Attribute>
		</AttributesOverview>
	{/snippet}
</FiltersetModal>