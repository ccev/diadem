<script lang="ts">
	import FiltersetModal from "@/components/menus/filters/filterset/FiltersetModal.svelte";
	import AttributeChip from "@/components/menus/filters/filterset/AttributeChip.svelte";
	import Attribute from "@/components/menus/filters/filterset/Attribute.svelte";
	import AttributesOverview from "@/components/menus/filters/filterset/AttributesOverview.svelte";
	import * as m from "@/lib/paraglide/messages";
	import type { FiltersetInvasion } from "@/lib/features/filters/filtersets";
	import { getCurrentSelectedFilterset } from "@/lib/features/filters/filtersetPageData.svelte";
	import { makeAttributePokemonLabel } from "@/lib/features/filters/makeAttributeChipLabel";
	import RaidBossAttribute from "@/components/menus/filters/filterset/raid/RaidBossAttribute.svelte";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import { getActiveCharacters } from "@/lib/features/masterStats.svelte";
	import { mCharacter } from "@/lib/services/ingameLocale";
	import LongSelectItem from "@/components/menus/filters/LongSelectItem.svelte";
	import { resize } from "@/lib/services/assets";
	import { getIconInvasion } from "@/lib/services/uicons.svelte";
	import { InvasionFilterType, makeAttributeCharacterLabel } from "@/lib/features/filters/filterUtilsInvasion";
	import { INVASION_CHARACTER_LEADERS } from "@/lib/utils/pokestopUtils";
	import InvasionFilterDisplay from "@/components/menus/filters/filterset/invasion/InvasionFilterDisplay.svelte";

	let data: FiltersetInvasion | undefined = $derived(getCurrentSelectedFilterset()?.data) as | FiltersetInvasion | undefined;

	let filterType: InvasionFilterType = $derived(Object.hasOwn(data ?? {}, "rewards") ? InvasionFilterType.REWARDS : InvasionFilterType.CHARACTERS);

	function getCharacters() {
		return getActiveCharacters()
			.map(item => item.character)
			.sort((a, b) => {
				const aIsLeader = INVASION_CHARACTER_LEADERS.includes(a);
				const bIsLeader = INVASION_CHARACTER_LEADERS.includes(b);

				return Number(bIsLeader) - Number(aIsLeader);
			});
	}
</script>

<FiltersetModal
	modalType="filtersetInvasion"
	mapObject={MapObjectType.POKESTOP}
	majorCategory="pokestop"
	subCategory="invasion"
	titleBase={m.invasion_filter()}
	titleShared={m.shared_invasion_filter()}
	titleNew={m.new_invasion_filter()}
	titleEdit={m.edit_invasion_filter()}
	height={136}
>
	{#snippet base()}
		{#if data}
			<InvasionFilterDisplay {data} />
		{/if}
	{/snippet}
	{#snippet overview()}
		{#if data}
			<!--			<Card class="w-full px-4 pt-2 pb-3">-->
			<!--				<InvasionTypeAttribute {data} bind:filterType />-->
			<!--			</Card>-->

			{#if filterType === InvasionFilterType.REWARDS}
				<AttributesOverview>
					<Attribute label={m.rewards()}>
						<AttributeChip
							label={makeAttributePokemonLabel(data.rewards ?? [])}
							isEmpty={!data.rewards}
							onremove={() => delete data.rewards}
						/>
						{#snippet page(thisData: FiltersetInvasion)}
							<RaidBossAttribute data={thisData} />
						{/snippet}
					</Attribute>
				</AttributesOverview>
			{:else}
				<AttributesOverview>
					<Attribute label={m.grunts()}>
						<AttributeChip
							label={makeAttributeCharacterLabel(data.characters ?? [])}
							isEmpty={!data.characters}
							onremove={() => delete data.characters}
						/>
						{#snippet page(thisData: FiltersetInvasion)}
							<div class="overflow-y-auto h-118  flex flex-wrap -mx-4 px-4 mt-2">
								{#each getCharacters() as character (character)}
									<LongSelectItem
										isSelected={thisData.characters?.includes(character) ?? false}
										onselect={(isSelected) => {
											if (isSelected) {
												if (!thisData.characters) thisData.characters = [];
												thisData.characters.push(character);
											} else {
												thisData.characters = thisData.characters?.filter(c => c !== character);
											}

											if (thisData.characters?.length === 0) delete thisData.characters;
										}}
									>
										<img
											class="size-10"
											alt={mCharacter(character)}
											src={resize(getIconInvasion(character, true), { width: 64 })}
											loading="lazy"
										>
										<span>
											{mCharacter(character)}
										</span>
									</LongSelectItem>
								{/each}
							</div>
						{/snippet}
					</Attribute>
				</AttributesOverview>
			{/if}
		{/if}
	{/snippet}
</FiltersetModal>