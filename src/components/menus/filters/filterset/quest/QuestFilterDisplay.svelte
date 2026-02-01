<script lang="ts">
	import type { FiltersetQuest } from "@/lib/features/filters/filtersets";
	import PokemonDisplay from "@/components/menus/filters/filterset/display/PokemonDisplay.svelte";
	import FilterDisplay from "@/components/menus/filters/filterset/display/FilterDisplay.svelte";
	import HorizontalScrollDisplay from "@/components/menus/filters/filterset/display/HorizontalScrollDisplay.svelte";
	import HorizontalScrollElement from "@/components/menus/filters/filterset/display/HorizontalScrollElement.svelte";
	import { resize } from "@/lib/services/assets";
	import { getIconItem, getIconReward } from "@/lib/services/uicons.svelte";
	import { mItem, mPokemon, mQuest } from "@/lib/services/ingameLocale";
	import * as m from "@/lib/paraglide/messages";
	import AttributeDisplay from "@/components/menus/filters/filterset/display/AttributeDisplay.svelte";
	import { getAttributeLabelAr } from "@/lib/features/filters/filterUtilsQuest";
	import { makeAttributeRangeLabel } from "@/lib/features/filters/makeAttributeChipLabel";
	import { RewardType } from "@/lib/utils/pokestopUtils";

	let {
		data
	}: {
		data: FiltersetQuest
	} = $props();
</script>

<FilterDisplay>
	{#if data.ar}
		<AttributeDisplay label={m.ar_layer()} value={getAttributeLabelAr(data.ar)} />
	{/if}

	{#if data.tasks}
		<AttributeDisplay label={m.tasks()}>
			{#each data.tasks as task}
				<p class="text-xl mt-1 p-1 border border-border rounded-md">
					{mQuest(task.title, task.target)}
				</p>
			{/each}
		</AttributeDisplay>
	{/if}

	{#if data.pokemon}
		<PokemonDisplay label={m.pogo_pokemon()} pokemon={data.pokemon} />
	{/if}

	{#if data.item}
		<HorizontalScrollDisplay label={m.items()}>
			{#each data.item as item}
				{@const name = item.amount ? m.quest_item({ count: item.amount, item: mItem(item.id) }) : mItem(item.id)}
				<HorizontalScrollElement>
					<img
						class="w-7"
						src={resize(getIconItem(item.id, item.amount), { width: 64 })}
						alt={name}
					>
					{name}
				</HorizontalScrollElement>
			{/each}
		</HorizontalScrollDisplay>
	{/if}

	{#if data.megaResource}
		<HorizontalScrollDisplay label={m.mega_energy()}>
			{#each data.megaResource as megaResource}
				{@const pokemonName = mPokemon({ pokemon_id: Number(megaResource.id), temp_evolution_id: 1 })}
				{@const name = megaResource.amount ? m.quest_mega_resource({
					count: megaResource.amount,
					pokemon: pokemonName
				}) : m.pokemon_mega_resource({ pokemon: pokemonName })}
				<HorizontalScrollElement>
					<img
						class="w-7"
						src={resize(getIconReward(RewardType.MEGA_ENERGY, { amount: megaResource.amount, pokemon_id: Number(megaResource.id) }), { width: 64 })}
						alt={name}
					>
					{name}
				</HorizontalScrollElement>
			{/each}
		</HorizontalScrollDisplay>
	{/if}

	{#if data.candy}
		<HorizontalScrollDisplay label={m.candy()}>
			{#each data.candy as candy}
				{@const pokemonName = mPokemon({ pokemon_id: Number(candy.id) })}
				{@const name = candy.amount ? m.quest_candy({
					count: candy.amount,
					pokemon: pokemonName
				}) : m.pokemon_candy({ pokemon: pokemonName })}
				<HorizontalScrollElement>
					<img
						class="w-7"
						src={resize(getIconReward(RewardType.CANDY, { amount: candy.amount, pokemon_id: Number(candy.id) }), { width: 64 })}
						alt={name}
					>
					{name}
				</HorizontalScrollElement>
			{/each}
		</HorizontalScrollDisplay>
	{/if}

	{#if data.xlCandy}
		<HorizontalScrollDisplay label={m.xl_candy()}>
			{#each data.xlCandy as candy}
				{@const pokemonName = mPokemon({ pokemon_id: Number(candy.id) })}
				{@const name = candy.amount ? m.quest_xl_candy({
					count: candy.amount,
					pokemon: pokemonName
				}) : m.pokemon_xl_candy({ pokemon: pokemonName })}
				<HorizontalScrollElement>
					<img
						class="w-7"
						src={resize(getIconReward(RewardType.XL_CANDY, { amount: candy.amount, pokemon_id: Number(candy.id) }), { width: 64 })}
						alt={name}
					>
					{name}
				</HorizontalScrollElement>
			{/each}
		</HorizontalScrollDisplay>
	{/if}

	{#if data.stardust}
		<AttributeDisplay label={m.stardust()} value={makeAttributeRangeLabel(data.stardust, 0, 50_000)} />
	{/if}

	{#if data.xp}
		<AttributeDisplay label={m.xp()} value={makeAttributeRangeLabel(data.xp, 0, 50_000)} />
	{/if}
</FilterDisplay>
