<script lang="ts">
	import { UsersRound } from "lucide-svelte";
	import { getIconContest, getIconPokemon, getIconType } from "@/lib/services/uicons.svelte.js";
	import { mAlignment, mGeneration, mPokemon, mType } from "@/lib/services/ingameLocale.js";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import TimeWithCountdown from "@/components/ui/popups/common/TimeWithCountdown.svelte";
	import IconValue from "@/components/ui/popups/common/IconValue.svelte";
	import type { ContestFocus, ContestRankings, Incident, PokestopData } from "@/lib/types/mapObjectData/pokestop.js";
	import * as m from "@/lib/paraglide/messages";
	import { CONTEST_SLOTS, getContestIcon, getContestText } from "@/lib/utils/pokestopUtils";
	import { currentTimestamp } from "@/lib/utils/currentTimestamp";

	let {
		expanded,
		incident,
		data
	}: {
		expanded: boolean
		incident: Incident
		data: PokestopData
	} = $props();

	const defaultContestRankings: ContestRankings = {
		total_entries: 0,
		last_update: 0,
		contest_entries: []
	};

	const contestRankings: ContestRankings = $derived(data?.showcase_rankings ? JSON.parse(data.showcase_rankings) : defaultContestRankings);

	const image = $derived(getContestIcon(data.contest_focus));

	const name: string = $derived(data.showcase_ranking_standard && data.contest_focus ? getContestText(data.showcase_ranking_standard, data.contest_focus) : m.unknown_contest());

	const hasNoDetails = $derived((data?.showcase_expiry ?? 0) < currentTimestamp());
</script>

<div class="py-2 border-border border-b group-last:mb-2">
	<div class="flex items-center gap-2">
		{#if !hasNoDetails}
			<div class="w-7 h-7 shrink-0">
				<ImagePopup
					src={image}
					alt={name}
					class="w-7"
				/>
			</div>
		{/if}
		<div>
			<div>
				{#if !hasNoDetails}
					{m.contest()}: <b>{name}</b>
				{:else}
					{m.contest()}
				{/if}

			</div>

			<div>
				Ends
				<TimeWithCountdown
					expireTime={incident.expiration}
					showHours={true}
				/>
			</div>
		</div>
	</div>

	{#if expanded && !hasNoDetails}
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
						alt={mPokemon(entry)}
						class="w-5"
					/>
				</div>
				<div>
					<b>{mPokemon(entry)}</b>
					(Score: {entry.score.toFixed(0)})
				</div>
			</div>
		{/each}
	{/if}
</div>