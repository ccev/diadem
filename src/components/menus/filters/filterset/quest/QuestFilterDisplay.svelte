<script lang="ts">
	import type { FiltersetQuest } from "@/lib/features/filters/filtersets";
	import PokemonDisplay from "@/components/menus/filters/filterset/display/PokemonDisplay.svelte";
	import FilterDisplay from "@/components/menus/filters/filterset/display/FilterDisplay.svelte";
	import HorizontalScrollDisplay from "@/components/menus/filters/filterset/display/HorizontalScrollDisplay.svelte";
	import HorizontalScrollElement from "@/components/menus/filters/filterset/display/HorizontalScrollElement.svelte";
	import { resize } from "@/lib/services/assets";
	import { getIconItem, getIconReward } from "@/lib/services/uicons.svelte";
	import { mItem, mPokemon, mQuest } from "@/lib/services/ingameLocale";

	import AttributeDisplay from "@/components/menus/filters/filterset/display/AttributeDisplay.svelte";
	import {
		getAttributeLabelPokecoins,
		getAttributeLabelStardust,
		getAttributeLabelXp
	} from "@/lib/features/filters/filterUtilsQuest";
	import { RewardType } from "@/lib/utils/pokestopUtils";

	let {
		data
	}: {
		data: FiltersetQuest;
	} = $props();
</script>

<FilterDisplay>
	{#if data.tasks}
		<AttributeDisplay label={data.tasks.length === 1 ? "Task" : "Tasks"}>
			<ul>
				{#each data.tasks as task (`${task.title}-${task.target}`)}
					<li class="text-base font-semibold">
						{mQuest(task.title, task.target)}
					</li>
				{/each}
			</ul>
		</AttributeDisplay>
	{/if}

	{#if data.pokemon}
		<PokemonDisplay label="Pokémon" pokemon={data.pokemon} />
	{/if}

	{#if data.item}
		<HorizontalScrollDisplay label="Items">
			{#each data.item as item (`${item.id}-${item.amount ?? 0}`)}
				{@const name = item.amount
					? /* @wc-include */ `${item.amount}x ${mItem(item.id)}`
					: mItem(item.id)}
				<HorizontalScrollElement>
					<img
						class="w-7"
						src={resize(getIconItem(item.id, item.amount), { width: 64 })}
						alt={name}
					/>
					{name}
				</HorizontalScrollElement>
			{/each}
		</HorizontalScrollDisplay>
	{/if}

	{#if data.megaResource}
		<HorizontalScrollDisplay label="Mega Energy">
			{#each data.megaResource as megaResource (`${megaResource.id}-${megaResource.amount ?? 0}`)}
				{@const pokemonName = mPokemon({
					pokemon_id: Number(megaResource.id)
				})}
				{@const name = megaResource.amount
					? `${megaResource.amount} ${pokemonName} Mega Energy`
					: `${pokemonName} Mega Energy`}
				<HorizontalScrollElement>
					<img
						class="w-7"
						src={resize(
							getIconReward(RewardType.MEGA_ENERGY, {
								amount: megaResource.amount,
								pokemon_id: Number(megaResource.id)
							}),
							{ width: 64 }
						)}
						alt={name}
					/>
					{name}
				</HorizontalScrollElement>
			{/each}
		</HorizontalScrollDisplay>
	{/if}

	{#if data.candy}
		<HorizontalScrollDisplay label="Candy">
			{#each data.candy as candy (`${candy.id}-${candy.amount ?? 0}`)}
				{@const pokemonName = mPokemon({ pokemon_id: Number(candy.id) })}
				{@const name = candy.amount
					? `${candy.amount} ${pokemonName} Candy`
					: `${pokemonName} Candy`}
				<HorizontalScrollElement>
					<img
						class="w-7"
						src={resize(
							getIconReward(RewardType.CANDY, {
								amount: candy.amount,
								pokemon_id: Number(candy.id)
							}),
							{ width: 64 }
						)}
						alt={name}
					/>
					{name}
				</HorizontalScrollElement>
			{/each}
		</HorizontalScrollDisplay>
	{/if}

	{#if data.xlCandy}
		<HorizontalScrollDisplay label="Candy XL">
			{#each data.xlCandy as candy (`${candy.id}-${candy.amount ?? 0}`)}
				{@const pokemonName = mPokemon({ pokemon_id: Number(candy.id) })}
				{@const name = candy.amount
					? `${candy.amount} ${pokemonName} Candy XL`
					: `${pokemonName} Candy XL`}
				<HorizontalScrollElement>
					<img
						class="w-7"
						src={resize(
							getIconReward(RewardType.XL_CANDY, {
								amount: candy.amount,
								pokemon_id: Number(candy.id)
							}),
							{ width: 64 }
						)}
						alt={name}
					/>
					{name}
				</HorizontalScrollElement>
			{/each}
		</HorizontalScrollDisplay>
	{/if}

	{#if data.stardust}
		<AttributeDisplay label="Stardust" value={getAttributeLabelStardust(data.stardust)} />
	{/if}

	{#if data.pokecoins}
		<AttributeDisplay label="Pokécoins" value={getAttributeLabelPokecoins(data.pokecoins)} />
	{/if}

	{#if data.xp}
		<AttributeDisplay label={/* @wc-include */ "XP"} value={getAttributeLabelXp(data.xp)} />
	{/if}
</FilterDisplay>
