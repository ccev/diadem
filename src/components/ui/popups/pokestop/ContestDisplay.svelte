<script lang="ts">
	import { UsersRound } from "lucide-svelte";
	import { getIconContest, getIconPokemon, getIconType } from "@/lib/services/uicons.svelte.js";
	import { mAlignment, mGeneration, mPokemon, mType } from "@/lib/services/ingameLocale.js";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import TimeWithCountdown from "@/components/ui/popups/common/TimeWithCountdown.svelte";
	import IconValue from "@/components/ui/popups/common/IconValue.svelte";
	import type {
		ContestFocus,
		ContestRankings,
		Incident,
		PokestopData
	} from "@/lib/types/mapObjectData/pokestop.js";
	import * as m from "@/lib/paraglide/messages";
	import { CONTEST_SLOTS, getContestIcon, getContestText } from "@/lib/utils/pokestopUtils";
	import { currentTimestamp } from "@/lib/utils/currentTimestamp";
	import PokestopSection from "@/components/ui/popups/pokestop/PokestopSection.svelte";

	let {
		expanded,
		incident,
		data
	}: {
		expanded: boolean;
		incident: Incident;
		data: PokestopData;
	} = $props();

	const image = $derived(getContestIcon(data.contest_focus));

	const name: string = $derived(
		data.showcase_ranking_standard && data.contest_focus
			? getContestText(data.showcase_ranking_standard, data.contest_focus)
			: m.unknown_contest()
	);

	const hasNoDetails = $derived((data?.showcase_expiry ?? 0) < currentTimestamp());
	let titleParts = $derived.by(() => {
		const parts = [m.contest()] as string[];
		if (name) parts.push(name);
		return parts;
	});
</script>

<PokestopSection {titleParts}>
	<div class="flex items-center gap-2">
		{#if !hasNoDetails}
			<div class="w-7 h-7 shrink-0">
				<ImagePopup src={image} alt={name} class="w-7" />
			</div>
		{/if}
		<div>
			<div>
				{m.raid_ends()}
				<TimeWithCountdown expireTime={incident.expiration} showHours={true} />
			</div>
		</div>
	</div>

	{#if expanded && !hasNoDetails}
		{#if data.contest_rankings}
			<div class="mt-2">
				<IconValue Icon={UsersRound}>
					Entries: <b>{data.contest_rankings.total_entries}</b>/{CONTEST_SLOTS}
				</IconValue>
			</div>
		{/if}
		{#each data?.contest_rankings?.contest_entries ?? [] as entry}
			<div class="flex gap-1 items-center">
				<div class="rounded-full w-4 h-4 flex items-center justify-center">
					<span>{entry.rank}.</span>
				</div>
				<div class="w-5 shrink-0">
					<ImagePopup src={getIconPokemon(entry)} alt={mPokemon(entry)} class="w-5" />
				</div>
				<div>
					<b>{mPokemon(entry)}</b>
					(Score: {entry.score.toFixed(0)})
				</div>
			</div>
		{/each}
	{/if}
</PokestopSection>
