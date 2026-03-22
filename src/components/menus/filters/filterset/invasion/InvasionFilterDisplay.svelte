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
	import ModifierPreview from "@/components/menus/filters/filterset/modifiers/ModifierPreview.svelte";
	import { getIconPokemon } from "@/lib/services/uicons.svelte";

	let {
		data
	}: {
		data: FiltersetInvasion;
	} = $props();

	let previewIconUrl = $derived.by(() => {
		const reward = data.rewards?.[data.rewards.length - 1];
		if (reward) return getIconPokemon({ pokemon_id: reward.pokemon_id, form: reward.form });
		const character = data.characters?.[data.characters.length - 1];
		return getIconInvasion(character ?? 4, true);
	});
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
					/>
					{mCharacter(character)}
				</HorizontalScrollElement>
			{/each}
		</HorizontalScrollDisplay>
	{/if}

	{#if data.modifiers}
		<div class="flex items-center gap-4 w-full">
			<div class="bg-border h-px w-full"></div>
			<span class="text-muted-foreground text-sm whitespace-nowrap">{m.modifier_visual()}</span>
			<div class="bg-border h-px w-full"></div>
		</div>
		<div class="w-full">
			<ModifierPreview modifiers={data.modifiers} iconUrl={previewIconUrl} filterset={data} />
		</div>
	{/if}
</FilterDisplay>
