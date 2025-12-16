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
	import { getAttributeLabelAr } from '@/lib/features/filters/filterUtilsQuest';
	import ArAttribute from '@/components/menus/filters/filterset/quest/ArAttribute.svelte';
	import RewardAttribute from '@/components/menus/filters/filterset/quest/RewardAttribute.svelte';
	import Card from '@/components/ui/Card.svelte';
	import { pokemonBounds } from '@/lib/features/filters/filterUtilsPokemon';
	import AppearanceChips from '@/components/menus/filters/filterset/pokemon/AppearanceChips.svelte';
	import AppearanceAttribute from '@/components/menus/filters/filterset/pokemon/AppearanceAttribute.svelte';
	import { rewardTypeLabel } from '@/lib/utils/pokestopUtils';

	let data: FiltersetQuest | undefined = $derived(getCurrentSelectedFilterset()?.data) as | FiltersetQuest | undefined;
</script>

<FiltersetModal
	modalType="filtersetQuest"
	mapObject="pokestop"
	majorCategory="pokestop"
	subCategory="quest"
	titleBase={m.quest_filter()}
	titleShared={m.shared_quest_filter()}
	titleNew={m.new_quest_filter()}
	titleEdit={m.edit_quest_filter()}
>
	{#snippet base()}
		{#if data}
			attr overview quests
		{/if}
	{/snippet}
	{#snippet overview()}
		{#if data}
			<Card class="w-full px-4 pt-2 pb-3">
				<ArAttribute data={data} />
			</Card>
			<Card class="w-full px-4 pt-2 pb-3">
				<RewardAttribute data={data} />
			</Card>

			{#if data.rewardType !== undefined}
				<AttributesOverview>
					<Attribute label={rewardTypeLabel(data.rewardType)}>
						<AppearanceChips {data} sizeBounds={pokemonBounds.size} />
						{#snippet page(thisData: FiltersetPokemon)}
							<AppearanceAttribute data={thisData} sizeBounds={pokemonBounds.size} />
						{/snippet}
					</Attribute>
					<Attribute label="Tasks">
						<AppearanceChips {data} sizeBounds={pokemonBounds.size} />
						{#snippet page(thisData: FiltersetPokemon)}
							<AppearanceAttribute data={thisData} sizeBounds={pokemonBounds.size} />
						{/snippet}
					</Attribute>
				</AttributesOverview>
			{/if}
<!--			<ArAttribute data={data} />-->
<!--			<RewardAttribute data={data} />-->
<!--			<AttributesOverview>-->
<!--				<Attribute label={m.ar_layer()}>-->
<!--					<AttributeChip-->
<!--						label={getAttributeLabelAr(data.ar)}-->
<!--						isEmpty={!data.ar}-->
<!--						onremove={() => delete data.ar}-->
<!--					/>-->
<!--					{#snippet page(thisData: FiltersetQuest)}-->
<!--						<ArAttribute data={thisData} />-->
<!--					{/snippet}-->
<!--				</Attribute>-->
<!--			</AttributesOverview>-->
<!--			<AttributesOverview>-->
<!--				<Attribute label={m.reward()}>-->
<!--					<AttributeChip-->
<!--						label={getAttributeLabelAr(data.ar)}-->
<!--						isEmpty={!data.ar}-->
<!--						onremove={() => delete data.ar}-->
<!--					/>-->
<!--					{#snippet page(thisData: FiltersetQuest)}-->
<!--						<RewardAttribute data={thisData} />-->
<!--					{/snippet}-->
<!--				</Attribute>-->
<!--			</AttributesOverview>-->
		{/if}
	{/snippet}
</FiltersetModal>