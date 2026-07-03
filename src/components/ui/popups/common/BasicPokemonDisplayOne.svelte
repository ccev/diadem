<script lang="ts">
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import { mPokemon } from "$lib/services/ingameLocale";
	import { getIconPokemon } from "$lib/services/uicons.svelte";

	type DisplayPokemon = {
		pokemon_id?: number | null;
		temp_evolution_id?: number | null;
		form?: number | null;
		costume?: number | null;
		gender?: number | null;
		alignment?: number | null;
		bread_mode?: number | null;
		shiny?: number | boolean | null;
	};

	let {
		pokemon,
		class: class_ = ""
	}: {
		pokemon: DisplayPokemon;
		class?: string;
	} = $props();
</script>

<div class="mt-2 rounded-md bg-accent-highlight p-3 {class_}">
	<div class="flex w-full items-center justify-center gap-4">
		<div class="size-10 shrink-0">
			<ImagePopup class="size-10" src={getIconPokemon(pokemon)} alt={mPokemon(pokemon)} />
		</div>

		<span class="font-semibold">
			{mPokemon(pokemon)}
		</span>
	</div>
</div>
