<script module lang="ts">
	import type { MapObjectPopupProps } from "@/components/ui/popups2/common/PopupBaseStatic.svelte";
	import * as m from "$lib/paraglide/messages";
	import { mPokemon } from "$lib/services/ingameLocale";
	import { MapObjectType, type MapData } from "$lib/mapObjects/mapObjectTypes";
	import Button from "@/components/ui/input/Button.svelte";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import BasicMainCard from "@/components/ui/popups2/common/BasicMainCard.svelte";
	import SimpleOverviewCard from "@/components/ui/popups2/common/SimpleOverviewCard.svelte";
	import TitledMainSection from "@/components/ui/popups2/common/TitledMainSection.svelte";
	import StatsMainCard from "@/components/ui/popups2/common/StatsMainCard.svelte";
	import { getIconPokemon, getIconPokestop } from "$lib/services/uicons.svelte";
	import { timestampToLocalTime } from "$lib/utils/timestampToLocalTime";
	import {
		CircleDot,
		Clock,
		Globe,
		Info,
		MapPin,
		Medal,
		Rat,
		Signpost,
		SlidersHorizontal,
		Sword,
		Target, UsersRound
	} from "@lucide/svelte";
	import type { Incident, PokestopData } from "$lib/types/mapObjectData/pokestop";
	import FortImage from "@/components/ui/popups/common/FortImage.svelte";
	import { getIconInvasion, getIconReward } from "$lib/services/uicons.svelte";
	import {
		CONTEST_SLOTS,
		getContestText,
		getRewardText,
		isIncidentContest,
		isIncidentInvasion,
		isIncidentKecleon,
		KECLEON_ID
	} from "$lib/utils/pokestopUtils";
	import { mCharacter, mQuest } from "$lib/services/ingameLocale";
	import IconValue from "@/components/ui/popups/common/IconValue.svelte";
	import QuestIcon2 from "@/components/icons/QuestIcon2.svelte";
	import InvasionIcon2 from "@/components/icons/InvasionIcon2.svelte";
	import {
		getInvasionCatchable,
		getInvasionLineup,
		getInvasionPokemon,
		hasInvasionLineup
	} from "$lib/features/masterStats.svelte";
	import TimeWithCountdown from "@/components/ui/popups/common/TimeWithCountdown.svelte";
	import { currentTimestamp } from "$lib/utils/currentTimestamp";
	import MainAccessMap from "@/components/ui/popups2/common/MainAccessMap.svelte";
	import { resize } from "$lib/services/assets";
	import UpdatedTimes from "@/components/ui/popups2/common/UpdatedTimes.svelte";
	import { getUserSettings } from "$lib/services/userSettings.svelte";
	import { matchInvasionFilterset, matchQuestFilterset } from "$lib/features/filterLogic/pokestop";
	import FiltersetIcon from "$lib/features/filters/FiltersetIcon.svelte";
	import { filterTitle } from "$lib/features/filters/filtersetUtils.svelte";
	import type { AnyFilterset } from "$lib/features/filters/filtersets";

	export { image, overview, main };

	export function getPopupPropsPokestop(data: MapData) {
		data = data as PokestopData;
		return {
			type: m.pogo_pokestop(),
			title: data.name ?? m.unknown_pokestop(),
			image,
			overview,
			main
		} as MapObjectPopupProps;
	}

	function getIncidents(data: PokestopData) {
		const invasions: Incident[] = [];
		const kecleons: Incident[] = [];
		const contests: Incident[] = [];

		for (const incident of data.incident) {
			if (incident.id && incident.expiration > currentTimestamp()) {
				if (isIncidentInvasion(incident)) {
					invasions.push(incident);
				} else if (isIncidentContest(incident)) {
					contests.push(incident);
				} else if (isIncidentKecleon(incident)) {
					kecleons.push(incident);
				}
			}
		}
		return [invasions, kecleons, contests];
	}

	function getMatchingFiltersets(quest: PokestopData["quests"][number] | undefined, invasions: Incident[]) {
		const filtersets: AnyFilterset[] = [];
		const questFilterset = quest ? matchQuestFilterset(quest) : undefined;
		if (questFilterset) filtersets.push(questFilterset);

		for (const invasion of invasions) {
			const invasionFilterset = matchInvasionFilterset(invasion);
			if (invasionFilterset && !filtersets.includes(invasionFilterset)) filtersets.push(invasionFilterset);
		}

		return filtersets;
	}

	function showMatchingFiltersets() {
		const filter = getUserSettings().filters.pokestop;
		return (
			filter.enabled &&
			(filter.quest.filters.find((f) => f.enabled) || filter.invasion.filters.find((f) => f.enabled))
		);
	}
</script>
<script>
	import MainCardBigIcon from "@/components/ui/popups2/common/MainCardBigIcon.svelte";
	import { getContestIcon } from "$lib/utils/pokestopUtils.ts";
	import StatsMainCardEntry from "@/components/ui/popups2/common/StatsMainCardEntry.svelte";
	import { hasTimer } from "$lib/utils/pokemonUtils.ts";
	import Countdown from "@/components/utils/Countdown.svelte";
	import { Flower } from "@lucide/svelte";
	import { getIconItem } from "$lib/services/uicons.svelte.ts";
	import { mItem } from "$lib/services/ingameLocale.ts";
	import { isFortOutdated } from "$lib/utils/gymUtils.ts";
</script>

{#snippet image(d: MapData)}
	{@const data = d as PokestopData}
	<FortImage
		alt={data.name ?? m.pogo_pokestop()}
		fortUrl={data.url}
		fortIcon={getIconPokestop(data)}
		fortName={data.name}
		fortDescription={data.description}
	/>
{/snippet}

{#snippet overview(d: MapData)}
	{@const data = d as PokestopData}

	<SimpleOverviewCard title="Team Rocket">
		grunt
	</SimpleOverviewCard>
{/snippet}

{#snippet main(d: MapData)}
	{@const data = d as PokestopData}
	{@const quest = data.quests[0]}
	{@const [invasions, kecleons, contests] = getIncidents(data)}

	{#if isFortOutdated(data?.updated)}
		<BasicMainCard>
			This Pokestop is outdated! It was last scanned {timestampToLocalTime(data.updated, true, false, { showTime: false })}
		</BasicMainCard>
	{/if}

	<TitledMainSection
		Icon={QuestIcon2}
		title={m.pogo_quest()}
	>
		<BasicMainCard>
			{#if !quest}
				No Quest was scanned here today
			{:else}
				<div class="flex items-center gap-2 mb-3">
					<div class="w-7 h-7 shrink-0">
						{#if quest.reward}
							<ImagePopup
								src={getIconReward(quest.reward.type, quest.reward.info)}
								alt={getRewardText(quest.reward)}
								class="w-7 h-7"
							/>
						{/if}
					</div>
					<h3 class="font-semibold">
						{getRewardText(quest.reward)}
					</h3>
				</div>

				<IconValue Icon={Target}>
					{m.task()}: <b>{mQuest(quest.title, quest.target)}</b>
				</IconValue>


				<IconValue Icon={Clock}>
					{m.popup_found()} <b>{timestampToLocalTime(quest.timestamp, true)}</b>
				</IconValue>

				<Button class="mt-3" variant="secondary">
					<Globe class="size-3.5" />
					Find more {getRewardText(quest.reward)} Quests
				</Button>
			{/if}
		</BasicMainCard>
	</TitledMainSection>

	<TitledMainSection
		Icon={InvasionIcon2}
		title={m.pogo_invasion()}
	>
		<div class="space-y-4">
			{#if invasions.length === 0}
				<BasicMainCard>
					No grunts available here
				</BasicMainCard>
			{/if}
			{#each invasions as invasion (invasion.id)}
				{@const hasLineup = hasInvasionLineup(invasion.character)}
				{@const lineup = getInvasionLineup(invasion.character)}
				{@const catchables = getInvasionCatchable(invasion.character) ?? []}
				<BasicMainCard>
					<div class="flex items-center gap-2 mb-3">
						<div class="w-7 h-7 shrink-0">
							<ImagePopup
								src={getIconInvasion(invasion.character, invasion.confirmed)}
								alt={mCharacter(invasion.character)}
								class="w-7"
							/>
						</div>
						<h3 class="font-semibold">
							{mCharacter(invasion.character)}
						</h3>
					</div>

					<IconValue Icon={Clock}>
						{m.lasts_until()}
						<b>
							<TimeWithCountdown
								expireTime={invasion.expiration}
								showHours={invasion.display_type !== 1}
							/>
						</b>
					</IconValue>

					<div class="-mx-4">
						<!--{#if num}-->
						<!--	<div class="border border-border rounded-sm flex justify-center items-center h-9 px-1.5">-->
						<!--		<p class="text-sm text-muted-foreground">-->
						<!--			#{num}-->
						<!--		</p>-->
						<!--	</div>-->
						<!--{/if}-->

						{#if lineup}
							<IconValue class="mb-1.5 mt-2 px-4" Icon={Sword}>
								Possible Lineup:
							</IconValue>
							<div class="w-full flex overflow-x-auto *:shrink-0 gap-3 px-4">
								<div class="rounded-sm px-2 py-1 bg-indigo-950/50">
									<div class="flex items-center">
										<p class="text-muted-foreground font-semibold text-sm pr-1">
											#1
										</p>
										{#each lineup.first as slotMon (`${slotMon.pokemon_id}-${slotMon.form}`)}
											{@const pokemon = getInvasionPokemon(slotMon)}
											<div class="p-1 size-10">
												<ImagePopup
													src={getIconPokemon(pokemon)}
													alt={mPokemon(pokemon)}
												/>
											</div>
										{/each}
									</div>
									<p class="w-full text-center px-2 text-muted-foreground text-sm font-semibold mt-1">
										Catchable
									</p>
								</div>

								<div class="flex rounded-sm px-2 py-1 items-center bg-border/50">
									<p class="text-muted-foreground font-semibold text-sm pr-1">
										#2
									</p>
									{#each lineup.second as slotMon (`${slotMon.pokemon_id}-${slotMon.form}`)}
										{@const pokemon = getInvasionPokemon(slotMon)}
										<div class="p-1 size-10">
											<ImagePopup
												src={getIconPokemon(pokemon)}
												alt={mPokemon(pokemon)}
											/>
										</div>
									{/each}
								</div>

								<div class="flex rounded-sm px-2 py-1 items-center bg-border/50">
									<p class="text-muted-foreground font-semibold text-sm pr-1">
										#3
									</p>
									{#each lineup.third as slotMon (`${slotMon.pokemon_id}-${slotMon.form}`)}
										{@const pokemon = getInvasionPokemon(slotMon)}
										<div class="p-1 size-10">
											<ImagePopup
												src={getIconPokemon(pokemon)}
												alt={mPokemon(pokemon)}
											/>
										</div>
									{/each}
								</div>
								<!--{#each catchables as slotMon (`${slotMon.pokemon_id}-${slotMon.form}`)}-->
								<!--	{@const pokemon = getInvasionPokemon(slotMon)}-->
								<!--	<div class="p-1 size-14">-->
								<!--		<ImagePopup-->
								<!--			src={getIconPokemon(pokemon)}-->
								<!--			alt={mPokemon(pokemon)}-->
								<!--		/>-->
								<!--	</div>-->
								<!--{/each}-->
							</div>
						{/if}

						<!--								<div-->
						<!--									class="flex flex-wrap border border-border rounded-sm w-fit h-9"-->
						<!--								>-->
						<!--									{#each catchables as slotMon (`${slotMon.pokemon_id}-${slotMon.form}`)}-->
						<!--										{@const pokemon = getInvasionPokemon(slotMon)}-->
						<!--										<div class="p-1 size-8">-->
						<!--											<ImagePopup src={getIconPokemon(pokemon)} alt={mPokemon(pokemon)} />-->
						<!--										</div>-->
						<!--									{/each}-->
						<!--								</div>-->
					</div>

					<Button class="mt-3" variant="secondary">
						<Globe class="size-3.5" />
						Find more {mCharacter(invasion.character)}s
					</Button>
				</BasicMainCard>
			{/each}
		</div>
	</TitledMainSection>

	<TitledMainSection
		Icon={Flower}
		title={m.lure_module()}
	>
		<BasicMainCard>
			{#if !data?.lure_expire_timestamp}
				No Lure Module was ever seen here
			{:else if data.lure_expire_timestamp < currentTimestamp()}
				<IconValue Icon={Clock}>
					Last Lure module ended {timestampToLocalTime(data.lure_expire_timestamp, true, false)}
				</IconValue>
			{:else}
				<MainCardBigIcon
					src={getIconItem(data?.lure_id ?? 501)}
					alt={mItem(data?.lure_id ?? 501)}
					title={mItem(data?.lure_id ?? 501)}
				/>

				<div class="flex justify-between items-center gap-3">
					<div
						class="justify-center font-medium flex gap-2 items-center rounded-md bg-accent-highlight- border-2 border-accent-highlight pl-4 pr-6 py-2 w-full"
					>
						<Clock class="size-4" />
						<p>
							{timestampToLocalTime(
								data.lure_expire_timestamp,
								false,
								true
							)}
						</p>
					</div>

					<div
						class="justify-center font-medium flex gap-2 items-center rounded-md bg-accent-highlight- border-2 border-accent-highlight pl-4 pr-6 py-2 w-full"
					>
						<Countdown
							expireTime={data.lure_expire_timestamp}
						/>
					</div>
				</div>
			{/if}
		</BasicMainCard>
	</TitledMainSection>

	<TitledMainSection
		Icon={Rat}
		title={m.kecleon()}
	>
		<BasicMainCard>
			{#if kecleons.length === 0}
				There's no Kecleon hiding here
			{:else}
				<MainCardBigIcon
					src={getIconPokemon({ pokemon_id: KECLEON_ID })}
					alt={mPokemon({ pokemon_id: KECLEON_ID })}
					title="A Kecleon is hiding here"
				/>

				<div class="flex justify-between items-center gap-3">
					<div
						class="justify-center font-medium flex gap-2 items-center rounded-md bg-accent-highlight- border-2 border-accent-highlight pl-4 pr-6 py-2 w-full"
					>
						<Clock class="size-4" />
						<p>
							{timestampToLocalTime(
								kecleons[0]?.expiration ?? 0,
								false,
								true
							)}
						</p>
					</div>

					<div
						class="justify-center font-medium flex gap-2 items-center rounded-md bg-accent-highlight- border-2 border-accent-highlight pl-4 pr-6 py-2 w-full"
					>
						<Countdown
							expireTime={kecleons[0]?.expiration ?? 0}
						/>
					</div>
				</div>

				<Button class="mt-3 w-full" variant="secondary">
					<Globe class="size-3.5" />
					Find more Kecleon
				</Button>
			{/if}
		</BasicMainCard>
	</TitledMainSection>

	<TitledMainSection
		Icon={Medal}
		title={m.contest()}
	>
		{#if contests.length === 0 || (data?.showcase_expiry ?? 0) < currentTimestamp()}
			<BasicMainCard>
				{#if !data.showcase_expiry}
					This Pokestop never hosted a showcase
				{:else}
					<IconValue Icon={Clock}>
						Last showcase ended {timestampToLocalTime(data.showcase_expiry, true, false)}
					</IconValue>
				{/if}
			</BasicMainCard>
		{:else}
			<BasicMainCard>
				{@const name = data.showcase_ranking_standard && data.contest_focus
					? getContestText(data.showcase_ranking_standard, data.contest_focus)
					: m.unknown_contest()}

				<MainCardBigIcon
					src={getContestIcon(data.contest_focus)}
					alt={name}
					title={name}
				/>

				<div class="space-y-3">
					<StatsMainCardEntry
						Icon={UsersRound}
						name="Entries"
					>
						{#snippet value()}
						<span>
							{#if data.contest_rankings}
								<b>{data.contest_rankings.total_entries}</b>/{CONTEST_SLOTS}
							{:else}
								{m.unavailable()}
							{/if}
						</span>
						{/snippet}
					</StatsMainCardEntry>

					<div class="w-full flex gap-2 flex-col">
						{#each data?.contest_rankings?.contest_entries ?? [] as entry}
							<div
								class="w-full rounded-md bg-accent-highlight px-4 relative flex justify-between items-center">
								<div class="py-3">
									<p class=" font-semibold">
										{mPokemon(entry)}
									</p>

									<p>
										Score: {entry.score.toFixed(0)}
									</p>
								</div>
								<div class="flex items-end text-right">
									<div class="size-12 shrink-0 -mr-5 z-10 mb-3">
										<ImagePopup src={getIconPokemon(entry)} alt={mPokemon(entry)} class="size-12" />
									</div>
									<span class="font-black text-7xl text-muted-foreground/50">
										{entry.rank}
									</span>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</BasicMainCard>
		{/if}
	</TitledMainSection>

	<!--TODO: Routes-->
	<!--	<TitledMainSection-->
	<!--		Icon={Signpost}-->
	<!--		title="Routes"-->
	<!--	>-->
	<!--		<BasicMainCard>-->
	<!--			No routes starting or ending at this Pokestop-->
	<!--		</BasicMainCard>-->
	<!--	</TitledMainSection>-->

	<TitledMainSection Icon={CircleDot} title="Access this Pokestop">
		<MainAccessMap
			lat={data.lat}
			lon={data.lon}
			type={MapObjectType.POKESTOP}
			uiconType="pokestop"
			radius={60}
			zoom={17}
			icon={resize(getIconPokestop({}), { width: 64 })}
		/>
	</TitledMainSection>

	{#if showMatchingFiltersets()}
		<TitledMainSection Icon={SlidersHorizontal} title={m.matching_filtersets()}>
			<BasicMainCard>
				{@const filtersets = getMatchingFiltersets(quest, invasions)}

				{#if filtersets.length === 0}
					<p>
						None of your filters match this Pokestop
					</p>
				{/if}
				<div class="flex flex-wrap gap-3">
					{#each filtersets as filterset (filterset.id)}
						<div class="flex gap-3 font-medium items-center bg-accent-highlight px-4 py-2 rounded-md">
							<FiltersetIcon {filterset} size={4} />
							{filterTitle(filterset)}
						</div>
					{/each}
				</div>
			</BasicMainCard>
		</TitledMainSection>
	{/if}

	<TitledMainSection Icon={Info} title="About this Pokestop">
		<BasicMainCard>
			<p class="font-semibold mb-2">
				{data.name}
			</p>

			{#if !data.description}
				<p class="text-muted-foreground">
					No description
				</p>
			{:else}
				<p class="text-muted-foreground">
					{data.description}
				</p>
			{/if}

			{#if data.url}
				<div class="mt-2 relative rounded-md overflow-hidden h-28 w-full">
					<button
						class="size-full absolute z-10 bg-black/50 backdrop-blur-[1px] flex justify-center items-center">
						<Button class="bg-accent/40! backdrop-blur-sm" variant="outline" size="sm">
							Show full image
						</Button>
					</button>
					<img
						class="absolute size-full object-cover"
						alt="Cover Photo of {data.name}"
						src={data.url}
					/>
				</div>
			{/if}

			<Button class="mt-4" variant="secondary">
				<MapPin class="size-3.5" />
				Go to Wayfarer Map
			</Button>
		</BasicMainCard>

		<StatsMainCard class="mt-4">
			<UpdatedTimes
				updated={data.updated}
				lastModified={data.last_modified_timestamp}
				firstSeen={data.first_seen_timestamp}
			/>
		</StatsMainCard>
	</TitledMainSection>
{/snippet}
