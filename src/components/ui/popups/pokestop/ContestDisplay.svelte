<script lang="ts">
	import { UsersRound } from 'lucide-svelte';
	import { CONTEST_SLOTS } from '@/lib/pogoUtils.js';
	import { getIconContest, getIconPokemon, getIconType } from '@/lib/uicons.svelte.js';
	import { ingame, pokemonName } from '@/lib/ingameLocale.js';
	import ImagePopup from '@/components/ui/popups/common/ImagePopup.svelte';
	import TimeWithCountdown from '@/components/ui/popups/common/TimeWithCountdown.svelte';
	import IconValue from '@/components/ui/popups/common/IconValue.svelte';
	import type { ContestFocus, ContestRankings, PokestopData } from '@/lib/types/mapObjectData/pokestop.js';
	import * as m from '@/lib/paraglide/messages';

	let {
		expanded,
		data
	}: {
		expanded: boolean
		data: PokestopData
	} = $props()

	const defaultContestRankings: ContestRankings = {
		total_entries: 0,
		last_update: 0,
		contest_entries: []
	}

	const contestRankings: ContestRankings = $derived(data?.showcase_rankings ? JSON.parse(data.showcase_rankings) : defaultContestRankings)

	const image = $derived.by(() => {
		if (data.showcase_pokemon_id) {
			return getIconPokemon({ pokemon_id: data.showcase_pokemon_id, form: data.showcase_pokemon_form_id })
		} else if (data.showcase_pokemon_type_id) {
			return getIconType(data.showcase_pokemon_type_id)
		}
		getIconContest()
	})

	const name: string = $derived.by(() => {
		let metric = m.contest_biggest
		let name = ""

		if (data.showcase_ranking_standard === 1) {
			metric = m.contest_smallest
		}

		const focus: ContestFocus = JSON.parse(data.showcase_focus ?? "{}")

		if (!focus) return metric({ name })

		if (focus.type === "pokemon") {
			name = pokemonName({ pokemon_id: focus.pokemon_id, form: focus.pokemon_form })
		} else if (focus.type === "type") {
			if (focus.pokemon_type_2) {
				name = m.connected_and({
					1: ingame("poke_type_" + focus.pokemon_type_1),
					2:  m.x_type({ type: ingame("poke_type_" + focus.pokemon_type_2) })
				})
			} else {
				name = m.x_type({ type: ingame("poke_type_" + focus.pokemon_type_1) })
			}
		} else if (focus.type === "buddy") {
			name = m.contest_buddy_min_level({ level: focus.min_level })
		} else if (focus.type === "alignment") {
			name = ingame("alignment_" + focus.pokemon_alignment)
		} else if (focus.type === "class") {
			// @ts-ignore
			const func =  m["pokemon_class_" + focus.pokemon_class]
			name = func ? func() : "?"
		} else if (focus.type === "family") {
			name = m.contest_pokemon_family({ pokemon: pokemonName({ pokemon_id: focus.pokemon_family }) })
		} else if (focus.type === "generation") {
			name = ingame("generation_") + focus.generation + " " + m.pogo_pokemon()
		} else if (focus.type === "hatched") {
			name = focus.hatched ? m.contest_hatched() : m.contest_not_hatched()
		} else if (focus.type === "mega") {
			name = focus.restriction === 1 ? m.contest_mega_evolution() : m.contest_not_mega_evolution()
		} else if (focus.type === "shiny") {
			name = focus.shiny ? m.contest_shiny() : m.contest_not_shiny()
		}

		return metric({ name })
	})
</script>

<div class="py-2 border-border border-b group-last:mb-2">
	<div class="flex items-center gap-2">
		<div class="w-7 h-7 shrink-0">
			<ImagePopup
				src={image}
				alt={name}
				class="w-7"
			/>
		</div>
		<div>
			<div>
				Showcase:
				<b>{name}</b>
			</div>

			<div>
				Ends
				<TimeWithCountdown
					expireTime={data.showcase_expiry}
					showHours={true}
				/>
			</div>
		</div>
	</div>

	{#if expanded}
		<div class="mt-2">
			<IconValue Icon={UsersRound}>
				Entries: <b>{contestRankings.total_entries}</b>/{CONTEST_SLOTS}
			</IconValue>
		</div>
		{#each contestRankings.contest_entries as entry}
			<div class="flex gap-1 items-center">
				<div class="rounded-full w-4 h-4  flex items-center justify-center">
					<span>{entry.rank}.</span>
				</div>
				<div class="w-5 shrink-0">
					<ImagePopup
						src={getIconPokemon(entry)}
						alt={pokemonName(entry)}
						class="w-5"
					/>
				</div>
				<div>
					<b>{pokemonName(entry)}</b>
					(Score: {entry.score.toFixed(0)})
				</div>
			</div>
		{/each}
	{/if}
</div>