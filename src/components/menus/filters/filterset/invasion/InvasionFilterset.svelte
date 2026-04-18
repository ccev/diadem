<script lang="ts">
	import FiltersetModal from "@/components/menus/filters/filterset/FiltersetModal.svelte";
	import AttributeChip from "@/components/menus/filters/filterset/AttributeChip.svelte";
	import Attribute from "@/components/menus/filters/filterset/Attribute.svelte";
	import AttributesOverview from "@/components/menus/filters/filterset/AttributesOverview.svelte";
	import * as m from "@/lib/paraglide/messages";
	import type { FiltersetInvasion } from "@/lib/features/filters/filtersets";
	import { getCurrentSelectedFilterset } from "@/lib/features/filters/filtersetPageData.svelte";
	import { makeAttributePokemonLabel } from "@/lib/features/filters/makeAttributeChipLabel";
	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";
	import {
		getActiveCharacters,
		getInvasionCatchable,
		getInvasionPokemon
	} from "@/lib/features/masterStats.svelte";
	import { mCharacter } from "@/lib/services/ingameLocale";
	import { resize } from "@/lib/services/assets";
	import { getIconInvasion } from "@/lib/services/uicons.svelte";
	import {
		InvasionFilterType,
		makeAttributeCharacterLabel
	} from "@/lib/features/filters/filterUtilsInvasion";
	import { INVASION_CHARACTER_LEADERS } from "@/lib/utils/pokestopUtils";
	import InvasionFilterDisplay from "@/components/menus/filters/filterset/invasion/InvasionFilterDisplay.svelte";
	import InvasionTypeAttribute from "@/components/menus/filters/filterset/invasion/InvasionTypeAttribute.svelte";
	import Card from "@/components/ui/Card.svelte";
	import PokemonSelectPage from "@/components/menus/filters/filterset/multiselect/PokemonSelectPage.svelte";
	import MultiSelect from "@/components/menus/filters/filterset/multiselect/MultiSelect.svelte";
	import MultiSelectItem from "@/components/menus/filters/filterset/multiselect/MultiSelectItem.svelte";

	type Pokemon = { pokemon_id: number; form: number; alignment?: number };

	let data: FiltersetInvasion | undefined = $derived(getCurrentSelectedFilterset()?.data) as
		| FiltersetInvasion
		| undefined;
	let filterType: InvasionFilterType = $derived(
		Object.hasOwn(data ?? {}, "rewards")
			? InvasionFilterType.REWARDS
			: InvasionFilterType.CHARACTERS
	);

	function getCharacters() {
		return getActiveCharacters()
			.map((item) => item.character)
			.sort((a, b) => {
				const aIsLeader = INVASION_CHARACTER_LEADERS.includes(a);
				const bIsLeader = INVASION_CHARACTER_LEADERS.includes(b);

				return Number(bIsLeader) - Number(aIsLeader);
			});
	}

	function getAllInvasionCatchables(): Pokemon[] {
		const unique = new Map<string, Pokemon>();

		for (const character of getActiveCharacters()) {
			const catchables = getInvasionCatchable(character.character) ?? [];

			for (const pokemon of catchables) {
				const key = `${pokemon.pokemon_id}-${pokemon.form}`;
				if (!unique.has(key)) {
					// @ts-ignore
					unique.set(key, getInvasionPokemon(pokemon));
				}
			}
		}

		return Array.from(unique.values()).sort((a, b) => {
			if (a.pokemon_id !== b.pokemon_id) return a.pokemon_id! - b.pokemon_id!;
			return a.form! - b.form!;
		});
	}

	function onselectReward(
		thisData: FiltersetInvasion,
		pokemon: { pokemon_id: number; form: number },
		isSelected: boolean
	) {
		if (!isSelected) {
			thisData.rewards = thisData.rewards?.filter(
				(p) => p.pokemon_id !== pokemon.pokemon_id || p.form !== pokemon.form
			);
		} else {
			if (!thisData.rewards) thisData.rewards = [];
			thisData.rewards.push(pokemon);
		}

		if (thisData.rewards?.length === 0) delete thisData.rewards;
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
>
	{#snippet base()}
		{#if data}
			<InvasionFilterDisplay {data} />
		{/if}
	{/snippet}
	{#snippet overview()}
		{#if data}
			<Card class="w-full px-4 pt-2 pb-3">
				<InvasionTypeAttribute {data} bind:filterType />
			</Card>

			{#if filterType === InvasionFilterType.REWARDS}
				<AttributesOverview>
					<Attribute label={m.rewards()}>
						<AttributeChip
							label={makeAttributePokemonLabel(data.rewards ?? [])}
							isEmpty={!data.rewards}
							onremove={() => delete data.rewards}
						/>
						{#snippet page(thisData: FiltersetInvasion)}
							<PokemonSelectPage
								data={thisData}
								attribute="rewards"
								pokemonList={getAllInvasionCatchables()}
							/>
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
							<MultiSelect>
								{#each getCharacters() as character (character)}
									<MultiSelectItem
										isSelected={thisData.characters?.includes(character) ?? false}
										onclick={(isSelected) => {
											if (isSelected) {
												if (!thisData.characters) thisData.characters = [];
												thisData.characters.push(character);
											} else {
												thisData.characters = thisData.characters?.filter((c) => c !== character);
											}

											if (thisData.characters?.length === 0) delete thisData.characters;
										}}
									>
										<img
											class="size-8"
											alt={mCharacter(character)}
											src={resize(getIconInvasion(character, true), { width: 64 })}
											loading="lazy"
										/>
										<span>
											{mCharacter(character)}
										</span>
									</MultiSelectItem>
								{/each}
							</MultiSelect>
						{/snippet}
					</Attribute>
				</AttributesOverview>
			{/if}
		{/if}
	{/snippet}
</FiltersetModal>
