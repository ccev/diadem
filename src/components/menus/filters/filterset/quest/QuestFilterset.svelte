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
		makeAttributeRewardPokemonLabel,
		makeAttributeTaskLabel
	} from "@/lib/features/filters/makeAttributeChipLabel";
	import { RewardType, rewardTypeLabel } from "@/lib/utils/pokestopUtils";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import QuestFilterDisplay from "@/components/menus/filters/filterset/quest/QuestFilterDisplay.svelte";
	import PokemonSelectPage from "@/components/menus/filters/filterset/multiselect/PokemonSelectPage.svelte";
	import QuestRewardSelectPage from "@/components/menus/filters/filterset/quest/QuestRewardSelectPage.svelte";
	import QuestTaskSelectPage from "@/components/menus/filters/filterset/quest/QuestTaskSelectPage.svelte";
	import SliderRange from "@/components/ui/input/slider/SliderRange.svelte";
	import { changeAttributeMinMax } from "@/lib/features/filters/filtersetUtils";
	import { getQuestRewards } from "@/lib/features/masterStats.svelte";
	import {
		getAttributeLabelStardust,
		getAttributeLabelXp,
		questBounds
	} from "@/lib/features/filters/filterUtilsQuest";

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
								pokemonList={getQuestRewards(RewardType.POKEMON).map((r) => r.reward.info)}
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
							label={getAttributeLabelStardust(data.stardust)}
							isEmpty={!data.stardust}
							onremove={() => delete data.stardust}
						/>
						{#snippet page(thisData: FiltersetQuest)}
							<SliderRange
								min={questBounds.stardust.min}
								max={questBounds.stardust.max}
								step={100}
								title={rewardTypeLabel(RewardType.STARDUST)}
								valueMin={thisData.stardust?.min ?? questBounds.stardust.min}
								valueMax={thisData.stardust?.max ?? questBounds.stardust.max}
								onchange={([min, max]) =>
									changeAttributeMinMax(
										thisData,
										"stardust",
										questBounds.stardust.min,
										questBounds.stardust.max,
										min,
										max
									)}
							/>
						{/snippet}
					</Attribute>
				{/if}

				{#if hasReward(RewardType.XP)}
					<Attribute label={rewardTypeLabel(RewardType.XP)}>
						<AttributeChip
							label={getAttributeLabelXp(data.xp)}
							isEmpty={!data.xp}
							onremove={() => delete data.xp}
						/>
						{#snippet page(thisData: FiltersetQuest)}
							<SliderRange
								min={questBounds.xp.min}
								max={questBounds.xp.max}
								step={100}
								title={rewardTypeLabel(RewardType.XP)}
								valueMin={thisData.xp?.min ?? questBounds.xp.min}
								valueMax={thisData.xp?.max ?? questBounds.xp.max}
								onchange={([min, max]) =>
									changeAttributeMinMax(
										thisData,
										"xp",
										questBounds.xp.min,
										questBounds.xp.max,
										min,
										max
									)}
							/>
						{/snippet}
					</Attribute>
				{/if}
			</AttributesOverview>

			<AttributesOverview>
				<Attribute label={m.tasks()}>
					<AttributeChip
						label={makeAttributeTaskLabel(data.tasks ?? [])}
						isEmpty={!data.tasks}
						onremove={() => delete data.tasks}
					/>
					{#snippet page(thisData: FiltersetQuest)}
						<QuestTaskSelectPage data={thisData} />
					{/snippet}
				</Attribute>
			</AttributesOverview>
		{/if}
	{/snippet}
</FiltersetModal>
