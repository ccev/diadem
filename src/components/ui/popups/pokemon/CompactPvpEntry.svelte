<script lang="ts">
	import { m } from "@/lib/paraglide/messages";
	import { resize } from "@/lib/services/assets";
	import { getIconLeague } from "@/lib/services/uicons.svelte";
	import type { PokemonData } from "@/lib/types/mapObjectData/pokemon";
	import { getBestRank, League } from "@/lib/utils/pokemonUtils";
	import { mLeague } from "@/lib/services/ingameLocale";

	let {
		data,
		league
	}: {
		data: PokemonData;
		league: League;
	} = $props();
</script>

<div class="flex">
	<img
		class="shrink-0 size-4.5 mt-1"
		src={resize(getIconLeague(league), { width: 64 })}
		alt={mLeague(league)}
	/>

	<p class="ml-1">
		{m.league_rank({ league: mLeague(league) })}:
		<b>#{getBestRank(data, league)}</b>
	</p>
</div>
