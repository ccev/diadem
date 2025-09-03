<script lang="ts">
	import type { PokemonData } from '@/lib/types/mapObjectData/pokemon';
	import { mPokemon } from '@/lib/services/ingameLocale';
	import { getIconPokemon } from '@/lib/services/uicons.svelte.js';
	import ImagePopup from '@/components/ui/popups/common/ImagePopup.svelte';
	import { getStationPokemon } from '@/lib/utils/stationUtils';

	let {
		stationed,
	}: {
		stationed: string | undefined
	} = $props()

	let parsedStationed: Partial<PokemonData>[] = $derived.by(() => {
		const parsed: Partial<PokemonData>[] = JSON.parse(stationed ?? "[]")
		return parsed.sort((p1, p2) => (p1.pokemon_id ?? 0) - (p2.pokemon_id ?? 0))
	})
</script>

<!--TODO: make the stationedPokemon hover better (clickable for mobile + styling)-->
<div class="flex gap-1 flex-wrap mb-3">
	{#each parsedStationed as data}
		<div class="rounded-sm border border-border p-2 relative group">
			<div class="absolute hidden group-hover:block group-active:block whitespace-nowrap">
				{mPokemon(data)}
			</div>
			<ImagePopup
				alt={mPokemon(data)}
				src={getIconPokemon(data)}
				class="w-5"
			/>
		</div>
	{/each}
</div>