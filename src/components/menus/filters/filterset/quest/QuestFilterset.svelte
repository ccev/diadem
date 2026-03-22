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
	import QuestRewardPokemonAttribute from "@/components/menus/filters/filterset/quest/QuestRewardPokemonAttribute.svelte";
	import { makeAttributeItemLabel } from "@/lib/features/filters/makeAttributeChipLabel";
	import QuestRewardItemAttribute from "@/components/menus/filters/filterset/quest/QuestRewardItemAttribute.svelte";
	import QuestFilterDisplay from "@/components/menus/filters/filterset/quest/QuestFilterDisplay.svelte";
	import ModifiersAttribute from "@/components/menus/filters/filterset/modifiers/ModifiersAttribute.svelte";
	import ModifierPreview from "@/components/menus/filters/filterset/modifiers/ModifierPreview.svelte";
	import { getIconPokemon, getIconReward } from "@/lib/services/uicons.svelte";

	let data: FiltersetQuest | undefined = $derived(getCurrentSelectedFilterset()?.data) as
		| FiltersetQuest
		| undefined;

	function getModifierPreviewIcon(data: FiltersetQuest) {
		if (data.rewardType === RewardType.POKEMON) {
			const pokemonList = data.pokemon;
			const pokemon = pokemonList?.[pokemonList.length - 1];
			if (!pokemon) {
				return getIconPokemon({ pokemon_id: 0, form: 0 });
			}
			return getIconReward(RewardType.POKEMON, {
				pokemon_id: pokemon.pokemon_id,
				form: pokemon.form
			});
		}

		if (data.rewardType === RewardType.ITEM) {
			const item = data.item?.[0];
			if (!item) return undefined;
			return getIconReward(RewardType.ITEM, {
				item_id: Number(item.id),
				amount: item.amount
			});
		}

		if (data.rewardType === RewardType.STARDUST) {
			return getIconReward(RewardType.STARDUST, {
				amount: data.stardust?.max ?? data.stardust?.min
			});
		}

		if (data.rewardType === RewardType.XP) {
			return getIconReward(RewardType.XP, {
				amount: data.xp?.max ?? data.xp?.min
			});
		}

		if (data.rewardType === RewardType.MEGA_ENERGY) {
			const megaResource = data.megaResource?.[0];
			if (!megaResource) return undefined;
			return getIconReward(RewardType.MEGA_ENERGY, {
				pokemon_id: Number(megaResource.id),
				amount: megaResource.amount
			});
		}

		if (data.rewardType === RewardType.CANDY) {
			const candy = data.candy?.[0];
			if (!candy) return undefined;
			return getIconReward(RewardType.CANDY, {
				pokemon_id: Number(candy.id),
				amount: candy.amount
			});
		}

		return undefined;
	}
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
	height={156}
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
				<RewardAttribute {data} />
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
			<AttributesOverview>
				<Attribute label={m.modifier_visual()}>
					<ModifierPreview
						modifiers={data.modifiers}
						iconUrl={getModifierPreviewIcon(data)}
						filterset={data}
						compact
					/>
					{#snippet page(thisData: FiltersetQuest)}
						<ModifiersAttribute data={thisData} iconUrl={getModifierPreviewIcon(thisData)} />
					{/snippet}
				</Attribute>
			</AttributesOverview>
		{/if}
	{/snippet}
</FiltersetModal>
