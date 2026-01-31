<script lang="ts">
	import type { FiltersetInvasion } from "@/lib/features/filters/filtersets";
	import PokemonDisplay from "@/components/menus/filters/filterset/display/PokemonDisplay.svelte";
	import FilterDisplay from "@/components/menus/filters/filterset/display/FilterDisplay.svelte";
	import HorizontalScrollDisplay from "@/components/menus/filters/filterset/display/HorizontalScrollDisplay.svelte";
	import HorizontalScrollElement from "@/components/menus/filters/filterset/display/HorizontalScrollElement.svelte";
	import { resize } from "@/lib/services/assets";
	import { getIconInvasion } from "@/lib/services/uicons.svelte";
	import { mCharacter } from "@/lib/services/ingameLocale";
	import * as m from "@/lib/paraglide/messages";

	let {
		data
	}: {
		data: FiltersetInvasion
	} = $props();
</script>

<FilterDisplay>
	{#if data.rewards}
		<PokemonDisplay label={m.rewards()} pokemon={data.rewards} />
	{/if}
	{#if data.characters}
		<HorizontalScrollDisplay label={m.grunts()}>
			{#each data.characters as character (character)}
				<HorizontalScrollElement>
					<img
						class="w-7"
						src={resize(getIconInvasion(character, true), { width: 64 })}
						alt={mCharacter(character)}
					>
					{mCharacter(character)}
				</HorizontalScrollElement>
			{/each}
		</HorizontalScrollDisplay>
	{/if}
</FilterDisplay>
