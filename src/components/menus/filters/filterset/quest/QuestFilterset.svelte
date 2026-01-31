<script lang="ts">
	import FiltersetModal from "@/components/menus/filters/filterset/FiltersetModal.svelte";
	import AttributeChip from "@/components/menus/filters/filterset/AttributeChip.svelte";
	import Attribute from "@/components/menus/filters/filterset/Attribute.svelte";
	import AttributesOverview from "@/components/menus/filters/filterset/AttributesOverview.svelte";
	import * as m from "@/lib/paraglide/messages";
	import type { FiltersetQuest } from "@/lib/features/filters/filtersets";
	import { getCurrentSelectedFilterset } from "@/lib/features/filters/filtersetPageData.svelte";
	import { makeAttributePokemonLabel } from "@/lib/features/filters/makeAttributeChipLabel";
	import RewardAttribute from "@/components/menus/filters/filterset/quest/RewardAttribute.svelte";
	import Card from "@/components/ui/Card.svelte";
	import { RewardType, rewardTypeLabel } from "@/lib/utils/pokestopUtils";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import QuestRewardPokemonAttribute
		from "@/components/menus/filters/filterset/quest/QuestRewardPokemonAttribute.svelte";
	import { makeAttributeItemLabel } from "@/lib/features/filters/makeAttributeChipLabel";
	import QuestRewardItemAttribute from "@/components/menus/filters/filterset/quest/QuestRewardItemAttribute.svelte";
	import QuestFilterDisplay from "@/components/menus/filters/filterset/quest/QuestFilterDisplay.svelte";

	let data: FiltersetQuest | undefined = $derived(getCurrentSelectedFilterset()?.data) as | FiltersetQuest | undefined;
</script>

<FiltersetModal
	modalType="filtersetQuest"
	mapObject={MapObjectType.POKESTOP}
	majorCategory="pokestop"
	subCategory="quest"
	titleBase={m.quest_filter()}
	titleShared={m.shared_quest_filter()}
	titleNew={m.new_quest_filter()}
	titleEdit={m.edit_quest_filter()}
>
	{#snippet base()}
		{#if data}
			<QuestFilterDisplay {data} />
		{/if}
	{/snippet}
	{#snippet overview()}
		{#if data}
			<!--			<Card class="w-full px-4 pt-2 pb-3">-->
			<!--				<ArAttribute data={data} />-->
			<!--			</Card>-->
			<Card class="w-full px-4 pt-2 pb-3">
				<RewardAttribute data={data} />
			</Card>

			{#if data.rewardType !== undefined}
				<AttributesOverview>
					{#if data.rewardType === RewardType.POKEMON}
						<Attribute label={rewardTypeLabel(data.rewardType)}>
							<AttributeChip
								label={makeAttributePokemonLabel(data.pokemon ?? [])}
								isEmpty={!data.pokemon}
								onremove={() => delete data.pokemon}
							/>
							{#snippet page(thisData: FiltersetQuest)}
								<QuestRewardPokemonAttribute data={thisData} />
							{/snippet}
						</Attribute>
					{:else if data.rewardType === RewardType.ITEM}
						<Attribute label={rewardTypeLabel(data.rewardType)}>
							<AttributeChip
								label={makeAttributeItemLabel(data.item ?? [])}
								isEmpty={!data.item}
								onremove={() => delete data.item}
							/>
							{#snippet page(thisData: FiltersetQuest)}
								<QuestRewardItemAttribute data={thisData} />
							{/snippet}
						</Attribute>
					{/if}


					<!--					<Attribute label="Tasks">-->
					<!--						<AppearanceChips {data} sizeBounds={pokemonBounds.size} />-->
					<!--						{#snippet page(thisData: FiltersetPokemon)}-->
					<!--							<AppearanceAttribute data={thisData} sizeBounds={pokemonBounds.size} />-->
					<!--						{/snippet}-->
					<!--					</Attribute>-->
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