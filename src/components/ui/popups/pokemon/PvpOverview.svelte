<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import IconValue from "@/components/ui/popups/common/IconValue.svelte";
	import TextSeparator from "@/components/utils/TextSeparator.svelte";
	import * as m from "@/lib/paraglide/messages";
	import { mLeague, mPokemon } from "@/lib/services/ingameLocale";
	import { getIconLeague, getIconPokemon } from "@/lib/services/uicons.svelte.js";
	import { resize } from "@/lib/services/assets";
	import type { PokemonData, PvpStats } from "@/lib/types/mapObjectData/pokemon";
	import { League } from "@/lib/utils/pokemonUtils";
	import { ChartSpline, Gauge, Info, Trophy } from "lucide-svelte";
	import { slide } from "svelte/transition";
	import Separator from "@/components/ui/Separator.svelte";
	import CompactPvpEntry from "@/components/ui/popups/pokemon/CompactPvpEntry.svelte";
	import { formatPercentage } from "@/lib/utils/numberFormat";

	type PvpEntry = {
		data: PvpStats;
		league: League;
	};

	let {
		data,
		maxLittleRank,
		maxGreatRank,
		maxUltraRank
	}: {
		data: PokemonData;
		maxLittleRank: number;
		maxGreatRank: number;
		maxUltraRank: number;
	} = $props();

	let entries: PvpEntry[] = $derived([
		...(data.pvp?.[League.LITTLE] ?? [])
			.filter((entry) => (entry.rank ?? 100000) <= maxLittleRank)
			.map((entry) => ({ data: entry, league: League.LITTLE })),
		...(data.pvp?.[League.GREAT] ?? [])
			.filter((entry) => (entry.rank ?? 100000) <= maxGreatRank)
			.map((entry) => ({ data: entry, league: League.GREAT })),
		...(data.pvp?.[League.ULTRA] ?? [])
			.filter((entry) => (entry.rank ?? 100000) <= maxUltraRank)
			.map((entry) => ({ data: entry, league: League.ULTRA }))
	]);

	$effect(() => {
		if (!entries) {
			selectedEntry = undefined;
			return;
		}

		if (!entries.map((d) => getEntryId(d)).includes(getEntryId(selectedEntry))) {
			selectedEntry = undefined;
		}
	});

	let selectedEntry: PvpEntry | undefined = $state(undefined);

	function getEntryId(entry: PvpEntry | undefined) {
		if (!entry) return "-";
		return `${entry.league}-${entry.data.pokemon_id}-${entry.data.form}-${entry.data.value}-${entry.data.cap}`;
	}

	function selectEntry(entry: PvpEntry) {
		if (getEntryId(entry) === getEntryId(selectedEntry)) {
			selectedEntry = undefined
		} else {
			selectedEntry = entry
		}
	}
</script>

{#if entries.length}
	<div class="mb-3">
		<IconValue Icon={Trophy}>PVP Rankings</IconValue>

		<div class="flex gap-1 mt-1.5 flex-wrap pb-2">
			{#each entries as entry (getEntryId(entry))}
				<Button
					variant="outline"
					size=""
					class="flex-col p-0 rounded-sm"
					onclick={() => selectEntry(entry)}
				>
					<div class="pt-1 pb-0.5">
						<div class="size-7">
							<ImagePopup src={getIconPokemon(entry.data)} alt={mPokemon(entry.data)} class="w-full" />
						</div>
					</div>
					<div class="flex gap-0.5 border-t font-semibold px-2 py-1 items-center">
						<img
							class="size-4"
							src={resize(getIconLeague(entry.league), { width: 64 })}
							alt={mLeague(entry.league)}
						/>
						#{entry.data.rank}
					</div>
				</Button>
			{/each}

			{#if selectedEntry}
				<div
					class="py-1 px-3 border-border border rounded-sm w-full"
					transition:slide={{ duration: 90 }}
				>
					<div class="flex items-center gap-1 flex-wrap">
						<b>{mPokemon(selectedEntry.data)}</b>
					</div>

					<div class="">
						<div class="flex">
							<img
								class="shrink-0 size-4.5 mt-1"
								src={resize(getIconLeague(selectedEntry.league), { width: 64 })}
								alt={mLeague(selectedEntry.league)}
							/>

							<p class="ml-1">
								{m.league_rank({ league: mLeague(selectedEntry.league) })}:
								<b>#{selectedEntry.data.rank}</b>
								({formatPercentage(selectedEntry.data.percentage)})
							</p>
						</div>
						<IconValue Icon={ChartSpline}>
							{m.target_cp()}:
							<b>{selectedEntry.data.cp}</b>
							({m.pogo_level({ level: selectedEntry.data.level })})
						</IconValue>
						<IconValue class="text-muted-foreground" Icon={Info}>
							{m.considered_max_level()}: <b>{selectedEntry.data.cap}</b>
						</IconValue>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
