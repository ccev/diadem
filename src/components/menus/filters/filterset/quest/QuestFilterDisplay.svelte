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
	import {
		getAttributeLabelAr,
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
	{#if data.ar}
		<AttributeDisplay label={m.ar_layer()} value={getAttributeLabelAr(data.ar)} />
	{/if}

	{#if data.tasks}
		<AttributeDisplay label={data.tasks.length === 1 ? m.task() : m.tasks()}>
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
		<PokemonDisplay label={m.pogo_pokemon()} pokemon={data.pokemon} />
	{/if}

	{#if data.item}
		<HorizontalScrollDisplay label={m.items()}>
			{#each data.item as item (`${item.id}-${item.amount ?? 0}`)}
				{@const name = item.amount
					? m.quest_item({ count: item.amount, item: mItem(item.id) })
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
		<HorizontalScrollDisplay label={m.mega_energy()}>
			{#each data.megaResource as megaResource (`${megaResource.id}-${megaResource.amount ?? 0}`)}
				{@const pokemonName = mPokemon({
					pokemon_id: Number(megaResource.id)
				})}
				{@const name = megaResource.amount
					? m.quest_mega_resource({
							count: megaResource.amount,
							pokemon: pokemonName
						})
					: m.pokemon_mega_resource({ pokemon: pokemonName })}
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
		<HorizontalScrollDisplay label={m.candy()}>
			{#each data.candy as candy (`${candy.id}-${candy.amount ?? 0}`)}
				{@const pokemonName = mPokemon({ pokemon_id: Number(candy.id) })}
				{@const name = candy.amount
					? m.quest_candy({
							count: candy.amount,
							pokemon: pokemonName
						})
					: m.pokemon_candy({ pokemon: pokemonName })}
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
		<HorizontalScrollDisplay label={m.xl_candy()}>
			{#each data.xlCandy as candy (`${candy.id}-${candy.amount ?? 0}`)}
				{@const pokemonName = mPokemon({ pokemon_id: Number(candy.id) })}
				{@const name = candy.amount
					? m.quest_xl_candy({
							count: candy.amount,
							pokemon: pokemonName
						})
					: m.pokemon_xl_candy({ pokemon: pokemonName })}
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
		<AttributeDisplay label={m.stardust()} value={getAttributeLabelStardust(data.stardust)} />
	{/if}

	{#if data.xp}
		<AttributeDisplay label={m.xp()} value={getAttributeLabelXp(data.xp)} />
	{/if}
</FilterDisplay>
