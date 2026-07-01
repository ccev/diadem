<script lang="ts">
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import { getIconPokemon } from "$lib/services/uicons.svelte";
	import { mPokemon } from "$lib/services/ingameLocale";
	import { getInvasionPokemon } from "$lib/features/masterStats.svelte";
	import type { InvasionPokemonStats } from "$lib/server/api/queryStats";
	import type { PokemonData, PokemonVisual } from "$lib/types/mapObjectData/pokemon";

	let {
		position,
		lineup,
		slotPokemonId,
		slotForm,
	}: {
		position: number,
		lineup: InvasionPokemonStats[],
		slotPokemonId: number | undefined,
		slotForm: number | undefined,
	} = $props();

	let catchable: boolean = $derived(lineup[0]?.encounter ?? false)
	let pokemon: Partial<PokemonVisual>[] | undefined = $derived.by(() => {
		if (slotPokemonId) {
			return [getInvasionPokemon({ pokemon_id: slotPokemonId, form: slotForm })]
		}
		if (lineup) {
			return lineup.map(getInvasionPokemon)
		}
	})
</script>

<div>

	<div
		class="rounded-t-md px-4 py-4 bg-indigo-950- bg-accent-highlight relative"
		class:rounded-b-md={!catchable}
		class:pb-1.5={catchable}
	>
		<div class="flex items-center">
			<p class="text-muted-foreground/50 font-bold text-3xl">
				{position}
			</p>

			<div class="ml-2">
				<div class="flex items-center">
					{#each pokemon as slotMon}
						{@const pokemon = getInvasionPokemon(slotMon)}
						<div class="p-1 size-12">
							<ImagePopup src={getIconPokemon(pokemon)} alt={mPokemon(pokemon)} />
						</div>
					{/each}
				</div>

			</div>

		</div>

	</div>

	{#if catchable}
		<p class="w-full text-center px-2 py-1 my-1 text-sm font-medium text-indigo-200 bg-indigo-950 rounded-b-md outline outline-indigo-800">
			Catchable
		</p>
	{/if}
</div>
