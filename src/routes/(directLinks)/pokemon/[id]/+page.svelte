<script lang="ts">
	import Metadata from '@/components/utils/Metadata.svelte';
	import { onMount } from 'svelte';
	import { mPokemon } from '@/lib/services/ingameLocale';
	import { goto } from '$app/navigation';
	import * as m from "@/lib/paraglide/messages";
	import { getPokemonShareText } from '@/lib/features/shareTexts';
	import { getIconPokemon } from '@/lib/services/uicons.svelte';
	import { getDefaultIconSet } from '@/lib/services/userSettings.svelte';
	import type { PokemonData } from '@/lib/types/mapObjectData/pokemon';

	let { data }: { data: PokemonData | undefined } = $props();

	onMount(() => {
		goto("/")
	});

</script>

<svelte:head>
	{#if data && Object.keys(data).length}
		<Metadata
			title={mPokemon(data)}
			embedTitle={mPokemon(data)}
			description={getPokemonShareText(data)}
			image={getIconPokemon(data, getDefaultIconSet("pokemon").id)}
		/>
	{:else}
		<Metadata title={m.unknown_pokemon()} />
	{/if}
</svelte:head>

