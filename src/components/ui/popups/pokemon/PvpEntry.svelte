<script lang="ts">
	import { ingame, pokemonName } from '@/lib/ingameLocale.js';
	import type { PokemonData, PvpStats } from '@/lib/types/mapObjectData/pokemon';
	import { getIconPokemon, getIconRaidEgg } from '@/lib/uicons.svelte';
	import { getRaidPokemon } from '@/lib/pogoUtils';
	import { currentTimestamp, timestampToLocalTime } from '@/lib/utils.svelte';
	import * as m from '@/lib/paraglide/messages';
	import Countdown from '@/components/utils/Countdown.svelte';
	import ImagePopup from '@/components/ui/popups/common/ImagePopup.svelte';

	let {
		data,
		league
	}: {
		data: PvpStats
		league: "little" | "great" | "ultra"
	} = $props()

	let pokemon: Partial<PokemonData> = $derived({ pokemon_id: data.pokemon, form: data.form })
	let leagueName: string = $derived.by(() => {
		if (league === "little") return m.little_league()
		if (league === "great") return m.great_league()
		if (league === "ultra") return m.ultra_league()
		return ""
	})
</script>

<div class="flex gap-2 items-center">
	<div class="w-6 shrink-0">
		<ImagePopup
			src={getIconPokemon(pokemon)}
			alt={pokemonName(pokemon)}
			class="w-6"
		/>
	</div>
	<div>
		<div>
			#{data.rank}
			{leagueName}
			<b>{pokemonName(pokemon)}</b>
		</div>
		<div>
			{data.cp} CP at level: {data.level} ({(data.percentage * 100).toFixed(1)}%) {data.cap}
		</div>
	</div>
</div>
