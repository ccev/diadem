<script lang="ts">
	import FiltersetModal from '@/components/menus/filters/filterset/FiltersetModal.svelte';
	import AttributeChip from '@/components/menus/filters/filterset/AttributeChip.svelte';
	import Attribute from '@/components/menus/filters/filterset/Attribute.svelte';
	import AttributesOverview from '@/components/menus/filters/filterset/AttributesOverview.svelte';
	import PageAttribute from '@/components/menus/filters/filterset/PageAttribute.svelte';
	import SliderRange from '@/components/ui/input/slider/SliderRange.svelte';
	import * as m from '@/lib/paraglide/messages';
	import type { FiltersetPokemon, FiltersetQuest } from '@/lib/features/filters/filtersets';
	import { getCurrentSelectedFilterset } from '@/lib/features/filters/filtersetPageData.svelte';
	import { makeAttributePokemonLabel } from '@/lib/features/filters/makeAttributeChipLabel';

	let data: FiltersetQuest | undefined = $derived(getCurrentSelectedFilterset()?.data) as | FiltersetQuest | undefined;
</script>

<FiltersetModal
	modalType="filtersetQuest"
	category="quest"
	titleBase={m.quest_filter()}
	titleShared={m.shared_quest_filter()}
	titleNew={m.new_quest_filter()}
	titleEdit={m.edit_quest_filter()}
>
	{#snippet overview()}
		{#if data}
			<AttributesOverview>
				<Attribute label="AR Quests">
					<AttributeChip
						label={makeAttributePokemonLabel(data.pokemon ?? [])}
						isEmpty={!data.pokemon}
						onremove={() => delete data.pokemon}
					/>
					{#snippet page()}
						todo
					{/snippet}
				</Attribute>
			</AttributesOverview>
			<AttributesOverview>
				<Attribute
					label="Pokemon"
				>
					<AttributeChip
						label="Any"
						color="muted"
					/>
					{#snippet page()}
						<PageAttribute>
							<div></div>
						</PageAttribute>
					{/snippet}
				</Attribute>
				<Attribute
					label="Items"
				>
					<AttributeChip
						label="Any"
						color="muted"
					/>
					{#snippet page()}
						<PageAttribute>
							<div></div>
						</PageAttribute>
					{/snippet}
				</Attribute>
				<Attribute
					label="Mega Energy"
				>
					<AttributeChip
						label="Any"
						color="muted"
					/>
					{#snippet page()}
						<PageAttribute>
							<div></div>
						</PageAttribute>
					{/snippet}
				</Attribute>
				<Attribute
					label="Candy XL"
				>
					<AttributeChip
						label="Any"
						color="muted"
					/>
					{#snippet page()}
						<PageAttribute>
							<div></div>
						</PageAttribute>
					{/snippet}
				</Attribute>
				<Attribute
					label="Candy"
				>
					<AttributeChip
						label="Any"
						color="muted"
					/>
					{#snippet page()}
						<PageAttribute>
							<div></div>
						</PageAttribute>
					{/snippet}
				</Attribute>
				<Attribute
					label="Stardust"
				>
					<AttributeChip
						label="Any"
						color="muted"
					/>
					{#snippet page()}
						<PageAttribute>
							<div></div>
						</PageAttribute>
					{/snippet}
				</Attribute>
				<Attribute
					label="XP"
				>
					<AttributeChip
						label="Any"
						color="muted"
					/>
					{#snippet page()}
						<PageAttribute>
							<div></div>
						</PageAttribute>
					{/snippet}
				</Attribute>

			</AttributesOverview>
		{/if}
	{/snippet}
</FiltersetModal>