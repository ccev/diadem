<script lang="ts">
	import Metadata from '@/components/utils/Metadata.svelte';
	import { onMount } from 'svelte';
	import { mPokemon } from '@/lib/services/ingameLocale';
	import { goto } from '$app/navigation';
	import * as m from '@/lib/paraglide/messages';
	import { getShareText } from '@/lib/features/shareTexts';
	import { getIconForMap } from '@/lib/services/uicons.svelte.js';
	import { browser } from '$app/environment';
	import type { MapData } from '@/lib/types/mapObjectData/mapObjects';
	import type { PageProps } from './$types';
	import type { PokemonData } from '@/lib/types/mapObjectData/pokemon';
	import { getDefaultIconSet } from '@/lib/services/userSettings.svelte';
	import { getStationTitle } from '@/lib/utils/stationUtils';
	import type { StationData } from '@/lib/types/mapObjectData/station';

	let { data }: PageProps = $props();

	let title: string = $derived.by(() => {
		if (!data) return '';
		if (data.type === 'pokemon') {
			return mPokemon(data as PokemonData);
		}
		else if (data.type === "station") {
			let title = ""
			if (data.battle_pokemon_id) {
				title = m.pogo_max_battle()
			} else {
				title = m.pogo_station()
			}
			if (data.id) title += ': ' + getStationTitle(data as StationData)
			return title;
		}
		else if (data.type === "gym" || data.type === "pokestop") {
			let title =  m[`pogo_${data.type}`]()
			if (data.name) title += `: ${data.name}`
			return title
		}
		return '';
	});

	let thumbnail: string = $derived.by(() => {
		if (!data || !data.type) return '';

		if (data.type === "pokemon" && !data.id) return ''

		return data.url ?? getIconForMap(data, getDefaultIconSet(data.type).id) ?? '';
	});

	onMount(() => {
		goto('/');
	});
</script>

<svelte:head>
	{#if !browser && data}
		<Metadata
			title={title}
			embedTitle={title}
			description={getShareText(data)}
			thumbnail={thumbnail}
		/>
	{/if}
</svelte:head>

