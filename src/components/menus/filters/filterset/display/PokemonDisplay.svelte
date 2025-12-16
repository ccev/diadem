<script lang="ts">
	import AttributeDisplay from "@/components/menus/filters/filterset/display/AttributeDisplay.svelte";
	import { getIconPokemon } from "@/lib/services/uicons.svelte";
	import { mPokemon } from "@/lib/services/ingameLocale";
	import HorizontalScrollDisplay from "@/components/menus/filters/filterset/display/HorizontalScrollDisplay.svelte";
	import HorizontalScrollElement from "@/components/menus/filters/filterset/display/HorizontalScrollElement.svelte";

	let {
		label,
		pokemon
	}: {
		label: string
		pokemon: { pokemon_id: number, form: number }[]
	} = $props();
</script>

<HorizontalScrollDisplay {label}>
	{#each pokemon as species (species.pokemon_id + "-" + species.form)}
		<HorizontalScrollElement>
			<img
				class="size-9"
				src={getIconPokemon(species)}
				alt={mPokemon(species)}
			>
			<span class="text-base">
				{mPokemon(species)}
			</span>
		</HorizontalScrollElement>
	{/each}
</HorizontalScrollDisplay>
