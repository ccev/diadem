<script lang="ts">
	import FiltersetModal from "@/components/menus/filters/filterset/FiltersetModal.svelte";
	import AttributeChip from "@/components/menus/filters/filterset/AttributeChip.svelte";
	import Attribute from "@/components/menus/filters/filterset/Attribute.svelte";
	import AttributesOverview from "@/components/menus/filters/filterset/AttributesOverview.svelte";
	import * as m from "@/lib/paraglide/messages";
	import type { FiltersetQuest } from "@/lib/features/filters/filtersets";
	import { getCurrentSelectedFilterset } from "@/lib/features/filters/filtersetPageData.svelte";
	import {
		makeAttributeItemLabel,
		makeAttributeMegaResourceLabel,
		makeAttributePokemonLabel,
		makeAttributeRewardPokemonLabel
	} from "@/lib/features/filters/makeAttributeChipLabel";
	import { RewardType, rewardTypeLabel } from "@/lib/utils/pokestopUtils";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import QuestFilterDisplay from "@/components/menus/filters/filterset/quest/QuestFilterDisplay.svelte";
	import PokemonSelectPage from "@/components/menus/filters/filterset/multiselect/PokemonSelectPage.svelte";
	import QuestRewardSelectPage from "@/components/menus/filters/filterset/quest/QuestRewardSelectPage.svelte";
	import SliderRange from "@/components/ui/input/slider/SliderRange.svelte";
	import { changeAttributeMinMax } from "@/lib/features/filters/filtersetUtils";
	import { getQuestRewards } from "@/lib/features/masterStats.svelte";
	import { makeAttributeRangeLabel } from "@/lib/features/filters/makeAttributeChipLabel";

	let data: FiltersetQuest | undefined = $derived(getCurrentSelectedFilterset()?.data) as
		| FiltersetQuest
		| undefined;

	const hasReward = (type: RewardType) => getQuestRewards(type).length > 0;
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
			<AttributesOverview>
				{#if hasReward(RewardType.POKEMON)}
					<Attribute label={rewardTypeLabel(RewardType.POKEMON)}>
						<AttributeChip
							label={makeAttributePokemonLabel(data.pokemon ?? [])}
							isEmpty={!data.pokemon}
							onremove={() => delete data.pokemon}
						/>
						{#snippet page(thisData: FiltersetQuest)}
							<PokemonSelectPage
								data={thisData}
								attribute="pokemon"
								pokemonList={getQuestRewards(RewardType.POKEMON).map(r => r.reward.info)}
							/>
						{/snippet}
					</Attribute>
				{/if}

				{#if hasReward(RewardType.ITEM)}
					<Attribute label={rewardTypeLabel(RewardType.ITEM)}>
						<AttributeChip
							label={makeAttributeItemLabel(data.item ?? [])}
							isEmpty={!data.item}
							onremove={() => delete data.item}
						/>
						{#snippet page(thisData: FiltersetQuest)}
							<QuestRewardSelectPage
								data={thisData}
								attribute="item"
								rewardType={RewardType.ITEM}
								getId={(info) => String(info.item_id)}
							/>
						{/snippet}
					</Attribute>
				{/if}

				{#if hasReward(RewardType.MEGA_ENERGY)}
					<Attribute label={rewardTypeLabel(RewardType.MEGA_ENERGY)}>
						<AttributeChip
							label={makeAttributeMegaResourceLabel(data.megaResource ?? [])}
							isEmpty={!data.megaResource}
							onremove={() => delete data.megaResource}
						/>
						{#snippet page(thisData: FiltersetQuest)}
							<QuestRewardSelectPage
								data={thisData}
								attribute="megaResource"
								rewardType={RewardType.MEGA_ENERGY}
								getId={(info) => String(info.pokemon_id)}
							/>
						{/snippet}
					</Attribute>
				{/if}

				{#if hasReward(RewardType.CANDY)}
					<Attribute label={rewardTypeLabel(RewardType.CANDY)}>
						<AttributeChip
							label={makeAttributeRewardPokemonLabel(data.candy ?? [])}
							isEmpty={!data.candy}
							onremove={() => delete data.candy}
						/>
						{#snippet page(thisData: FiltersetQuest)}
							<QuestRewardSelectPage
								data={thisData}
								attribute="candy"
								rewardType={RewardType.CANDY}
								getId={(info) => String(info.pokemon_id)}
							/>
						{/snippet}
					</Attribute>
				{/if}

				{#if hasReward(RewardType.XL_CANDY)}
					<Attribute label={rewardTypeLabel(RewardType.XL_CANDY)}>
						<AttributeChip
							label={makeAttributeRewardPokemonLabel(data.xlCandy ?? [])}
							isEmpty={!data.xlCandy}
							onremove={() => delete data.xlCandy}
						/>
						{#snippet page(thisData: FiltersetQuest)}
							<QuestRewardSelectPage
								data={thisData}
								attribute="xlCandy"
								rewardType={RewardType.XL_CANDY}
								getId={(info) => String(info.pokemon_id)}
							/>
						{/snippet}
					</Attribute>
				{/if}

				{#if hasReward(RewardType.STARDUST)}
					<Attribute label={rewardTypeLabel(RewardType.STARDUST)}>
						<AttributeChip
							label={makeAttributeRangeLabel(data.stardust, 0, 5_000)}
							isEmpty={!data.stardust}
							onremove={() => delete data.stardust}
						/>
						{#snippet page(thisData: FiltersetQuest)}
							<SliderRange
								min={0}
								max={5_000}
								step={100}
								title={rewardTypeLabel(RewardType.STARDUST)}
								valueMin={thisData.stardust?.min ?? 0}
								valueMax={thisData.stardust?.max ?? 5_000}
								onchange={([min, max]) =>
									changeAttributeMinMax(thisData, "stardust", 0, 5_000, min, max)}
							/>
						{/snippet}
					</Attribute>
				{/if}

				{#if hasReward(RewardType.XP)}
					<Attribute label={rewardTypeLabel(RewardType.XP)}>
						<AttributeChip
							label={makeAttributeRangeLabel(data.xp, 0, 10_000)}
							isEmpty={!data.xp}
							onremove={() => delete data.xp}
						/>
						{#snippet page(thisData: FiltersetQuest)}
							<SliderRange
								min={0}
								max={10_000}
								step={100}
								title={rewardTypeLabel(RewardType.XP)}
								valueMin={thisData.xp?.min ?? 0}
								valueMax={thisData.xp?.max ?? 10_000}
								onchange={([min, max]) =>
									changeAttributeMinMax(thisData, "xp", 0, 10_000, min, max)}
							/>
						{/snippet}
					</Attribute>
				{/if}
			</AttributesOverview>
		{/if}
	{/snippet}
</FiltersetModal>
