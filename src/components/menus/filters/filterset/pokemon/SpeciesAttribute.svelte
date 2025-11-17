<script lang="ts">
	import { changeAttributeMinMax } from '@/lib/features/filters/filtersetUtils';
	import SliderRange from '@/components/ui/input/slider/SliderRange.svelte';
	import type { FiltersetPokemon, MinMax } from '@/lib/features/filters/filtersets';
	import { getSpawnablePokemon } from '@/lib/services/masterfile';
	import { getIconPokemon } from '@/lib/services/uicons.svelte';
	import { mPokemon } from '@/lib/services/ingameLocale';
	import Button from '@/components/ui/input/Button.svelte';
	import { ToggleGroup } from 'bits-ui';

	let {
		data
	}: {
		data: FiltersetPokemon
	} = $props();

	let isCompact = $state(false)

	function pokemonValue(pokemon: { pokemon_id: number, form: number }) {
		return `${pokemon.pokemon_id}-${pokemon.form}`;
	}

	let selected = $derived(data.pokemon?.map(p => pokemonValue(p)) ?? []);
</script>

<Button
	variant="default"
	size="sm"
	onclick={() => isCompact = !isCompact}
>
	Compact
</Button>

<div class="overflow-y-auto h-110 flex flex-wrap -mx-4 px-4">
	{#each getSpawnablePokemon() as pokemon}
		<button
			class="p-1 flex flex-col items-center text-sm cursor-pointer hover:bg-accent"
			class:w-20={!isCompact}
			class:h-22={!isCompact}
			class:py-1={!isCompact}
			class:rounded-sm={!isCompact}
			class:size-10={isCompact}
			data-pokemon-id={pokemon.pokemon_id}
			data-form-id={pokemon.form}
			class:bg-sky-100={selected.includes(pokemonValue(pokemon))}
			onclick={() => {
				if (selected.includes(pokemonValue(pokemon))) {
					console.log(data.pokemon)
					console.log(pokemon)
					data.pokemon = data.pokemon?.filter(p => p.pokemon_id !== pokemon.pokemon_id || p.form !== pokemon.form)
					console.log(data.pokemon)
				} else {
					if (!data.pokemon) data.pokemon = []
					data.pokemon.push(pokemon)
				}

				if (data.pokemon?.length === 0) delete data.pokemon
			}}
		>
			<img
				class:size-10={!isCompact}
				alt={mPokemon(pokemon)}
				src={getIconPokemon(pokemon)}
				loading="lazy"
			>
			{#if !isCompact}
				<span>
					{mPokemon(pokemon)}
				</span>
			{/if}

		</button>
	{/each}
</div>
