<script module lang="ts">
	import type { MapObjectPopupProps } from "@/components/ui/popups2/common/PopupBaseStatic.svelte";
	import * as m from "$lib/paraglide/messages";
	import { mCharacter, mPokemon, mQuest } from "$lib/services/ingameLocale";
	import { type MapData, MapObjectType } from "$lib/mapObjects/mapObjectTypes";
	import Button from "@/components/ui/input/Button.svelte";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import BasicMainCard from "@/components/ui/popups2/common/BasicMainCard.svelte";
	import SimpleOverviewCard from "@/components/ui/popups2/common/SimpleOverviewCard.svelte";
	import TitledMainSection from "@/components/ui/popups2/common/TitledMainSection.svelte";
	import StatsMainCard from "@/components/ui/popups2/common/StatsMainCard.svelte";
	import { getIconInvasion, getIconPokemon, getIconPokestop, getIconReward } from "$lib/services/uicons.svelte";
	import { timestampToLocalTime } from "$lib/utils/timestampToLocalTime";
	import {
		BadgeCheck,
		CircleAlert,
		CircleDot,
		Clock,
		Flower,
		Info,
		Medal,
		Rat,
		SlidersHorizontal,
		UsersRound,
		ArrowRight
	} from "@lucide/svelte";
	import type { Incident, PokestopData } from "$lib/types/mapObjectData/pokestop";
	import FortImage from "@/components/ui/popups/common/FortImage.svelte";
	import {
		CONTEST_SLOTS,
		getContestText,
		getRewardText,
		isIncidentContest,
		isIncidentInvasion,
		isIncidentKecleon,
		KECLEON_ID
	} from "$lib/utils/pokestopUtils";
	import IconValue from "@/components/ui/popups/common/IconValue.svelte";
	import QuestIcon2 from "@/components/icons/QuestIcon2.svelte";
	import InvasionIcon2 from "@/components/icons/InvasionIcon2.svelte";
	import { getInvasionLineup, getInvasionPokemon } from "$lib/features/masterStats.svelte";
	import { currentTimestamp } from "$lib/utils/currentTimestamp";
	import MainAccessMap from "@/components/ui/popups2/common/MainAccessMap.svelte";
	import { resize } from "$lib/services/assets";
	import UpdatedTimes from "@/components/ui/popups2/common/UpdatedTimes.svelte";
	import { getUserSettings } from "$lib/services/userSettings.svelte";
	import { matchInvasionFilterset, matchQuestFilterset } from "$lib/features/filterLogic/pokestop";
	import FiltersetIcon from "$lib/features/filters/FiltersetIcon.svelte";
	import { filterTitle } from "$lib/features/filters/filtersetUtils.svelte";
	import type { AnyFilterset } from "$lib/features/filters/filtersets";
	import type { ActiveInvasionCharacterStats } from "$lib/server/api/queryStats";
	import type { PokemonData } from "$lib/types/mapObjectData/pokemon";
	import MainCardBigIcon from "@/components/ui/popups2/common/MainCardBigIcon.svelte";
	import { getContestIcon } from "$lib/utils/pokestopUtils";
	import StatsMainCardEntry from "@/components/ui/popups2/common/StatsMainCardEntry.svelte";
	import { getIconItem } from "$lib/services/uicons.svelte";
	import { mAlignment, mItem } from "$lib/services/ingameLocale";
	import { isFortOutdated } from "$lib/utils/gymUtils";
	import BigExpireTime from "@/components/ui/popups2/common/BigExpireTime.svelte";
	import InvasionLineupEntry from "@/components/ui/popups2/common/InvasionLineupEntry.svelte";

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

	function getMatchingFiltersets(
		quest: PokestopData["quests"][number] | undefined,
		invasions: Incident[]
	) {
		const filtersets: AnyFilterset[] = [];
		const questFilterset = quest ? matchQuestFilterset(quest) : undefined;
		if (questFilterset) filtersets.push(questFilterset);

		for (const invasion of invasions) {
			const invasionFilterset = matchInvasionFilterset(invasion);
			if (invasionFilterset && !filtersets.includes(invasionFilterset))
				filtersets.push(invasionFilterset);
		}

		return filtersets;
	}

	function showMatchingFiltersets() {
		const filter = getUserSettings().filters.pokestop;
		return (
			filter.enabled &&
			(filter.quest.filters.find((f) => f.enabled) ||
				filter.invasion.filters.find((f) => f.enabled))
		);
	}

	function getInvasionReward(invasion: Incident, lineup: ActiveInvasionCharacterStats | undefined): Partial<PokemonData> | undefined {
		const first = lineup?.first?.[0];
		const second = lineup?.second?.[0];
		const third = lineup?.third?.[0];

		// assuming giovanni logic
		if (third && lineup.third.length === 1 && third.encounter) {
			return getInvasionPokemon(third);
		}

		if (invasion.confirmed && invasion.slot_1_pokemon_id) {
			return getInvasionPokemon({
				pokemon_id: invasion.slot_1_pokemon_id,
				form: invasion.slot_1_form
			});
		}

		if (first?.encounter && !second?.encounter && !third?.encounter && (lineup?.first?.length ?? 0) === 1) {
			return getInvasionPokemon(first);
		}
	}
</script>
<script>
	import { ShieldHalf } from "@lucide/svelte";
	import QuickSearchButton from "@/components/ui/popups2/common/QuickSearchButton.svelte";
	import {
		setActiveSearchInvasion,
		setActiveSearchKecleon,
		setActiveSearchQuest
	} from "$lib/features/activeSearch.svelte";
	import { getActiveSearchQuestParams } from "$lib/services/search.svelte";
	import { openWayfarerMap } from "$lib/features/wayfarerMap.svelte.ts";
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

	<SimpleOverviewCard title="Team Rocket">grunt</SimpleOverviewCard>
{/snippet}

{#snippet main(d: MapData)}
	{@const data = d as PokestopData}
	{@const quest = data.quests[0]}
	{@const [invasions, kecleons, contests] = getIncidents(data)}

	{#if isFortOutdated(data?.updated)}
		<BasicMainCard class="font-medium">
			<IconValue Icon={CircleAlert}>
				This Pokestop is outdated! It was last seen {timestampToLocalTime(data.updated, {
				showDate: true,
				showSeconds: false,
				showTime: false,
				longMonth: true
			})}
			</IconValue>

		</BasicMainCard>
	{:else}

		<TitledMainSection
			Icon={QuestIcon2}
			title={m.pogo_quest()}
			disabled={!Boolean(quest)}
		>
			<BasicMainCard>
				{#if !quest}
					No Quest was scanned here today
				{:else}
					<MainCardBigIcon
						src={getIconReward(quest.reward.type, quest.reward.info)}
						alt={getRewardText(quest.reward)}
						title={getRewardText(quest.reward)}
					/>

					<div class="bg-accent-highlight rounded-md py-3 px-4">
						<p class="text-muted-foreground text-sm">
							{m.task()}
						</p>
						<p class="font-medium">
							{mQuest(quest.title, quest.target)}
						</p>
					</div>

					<StatsMainCardEntry
						class="mt-3"
						Icon={Clock}
						name={m.popup_found()}
						value={timestampToLocalTime(quest.timestamp, { showDate: true, showSeconds: false })}
					/>

					<QuickSearchButton
						label="Find more {getRewardText(quest.reward)} Quests"
						onclick={() => {
							const { name, reward } = getActiveSearchQuestParams(quest.reward)
							setActiveSearchQuest(name, reward)
						}}
					/>
				{/if}
			</BasicMainCard>
		</TitledMainSection>

		<TitledMainSection
			Icon={InvasionIcon2}
			title={m.pogo_invasion()}
			disabled={invasions.length === 0}
		>
			<div class="space-y-4">
				{#if invasions.length === 0}
					<BasicMainCard>
						No Team Rocket Grunts are currently at this Pokestop
					</BasicMainCard>
				{/if}
				{#each invasions as invasion (invasion.id)}
					{@const lineup = getInvasionLineup(invasion.character)}
					<BasicMainCard>
						{@const reward = getInvasionReward(invasion, lineup)}
						{@const name = mCharacter(invasion.character, { confirmed: invasion.confirmed })}

						<MainCardBigIcon
							src={getIconInvasion(invasion.character, invasion.confirmed)}
							alt={name}
							title={name}
						/>

						<BigExpireTime expire={invasion.expiration} />

						{#if reward}
							<IconValue class="mt-5" Icon={BadgeCheck}>
								Confirmed Reward
							</IconValue>
							<div class="bg-accent-highlight rounded-md p-3 mt-2">
								<div class="flex gap-4 w-full justify-center items-center">
									<div class="size-10 shrink-0">
										<ImagePopup
											class="size-10"
											src={getIconPokemon(reward)}
											alt={mPokemon(reward)}
										/>
									</div>

									<span class="font-semibold">
									 	{mAlignment(reward.alignment)} {mPokemon(reward)}
									</span>
								</div>
								{#if lineup?.second?.[0]?.encounter}
									<div class="flex flex-col items-center mt-5 mb-1">
										<p class="">
											or 16% chance to get:
										</p>

										<div class="flex gap-3 mt-2">
											{#each lineup.second as extraReward}
												{@const pokemon = getInvasionPokemon(extraReward)}
												{#if !(pokemon.pokemon_id === reward.pokemon_id && pokemon.form === reward.form)}
													<div>
														<div class="size-8 shrink-0">
															<ImagePopup
																class="size-8"
																src={getIconPokemon(pokemon)}
																alt={mPokemon(pokemon)}
															/>
														</div>
													</div>
												{/if}
											{/each}
										</div>
									</div>

								{/if}
							</div>
						{/if}

						{#if lineup}
							<div class="-mx-4 mt-5">
								<IconValue class="mb-1.5 px-4" Icon={ShieldHalf}>
									Possible Lineup
								</IconValue>
								<div class="w-full flex overflow-x-auto *:shrink-0 gap-3 px-4 mt-2">
									<InvasionLineupEntry
										position={1}
										lineup={lineup.first}
										slotPokemonId={invasion.slot_1_pokemon_id}
										slotForm={invasion.slot_1_form}
									/>
									<InvasionLineupEntry
										position={2}
										lineup={lineup.second}
										slotPokemonId={invasion.slot_2_pokemon_id}
										slotForm={invasion.slot_2_form}
									/>
									<InvasionLineupEntry
										position={3}
										lineup={lineup.third}
										slotPokemonId={invasion.slot_3_pokemon_id}
										slotForm={invasion.slot_3_form}
									/>
								</div>
							</div>
						{/if}

						<QuickSearchButton
							label="Find more {mCharacter(invasion.character, { plural: true })}"
							onclick={() => {
								setActiveSearchInvasion(name, invasion.character);
							}}
						/>
					</BasicMainCard>
				{/each}
			</div>
		</TitledMainSection>

		<TitledMainSection
			Icon={Flower}
			title={m.lure_module()}
			disabled={(data?.lure_expire_timestamp ?? 0) < currentTimestamp()}
		>
			<BasicMainCard>
				{#if !data?.lure_expire_timestamp}
					No Lure Module was ever seen here
				{:else if data.lure_expire_timestamp < currentTimestamp()}
					<IconValue Icon={Clock}>
						Last Lure module ended {timestampToLocalTime(data.lure_expire_timestamp, {
						showDate: true,
						showSeconds: false,
						longMonth: true
					})}
					</IconValue>
				{:else}
					<MainCardBigIcon
						src={getIconItem(data?.lure_id ?? 501)}
						alt={mItem(data?.lure_id ?? 501)}
						title={mItem(data?.lure_id ?? 501)}
					/>

					<BigExpireTime expire={data.lure_expire_timestamp} />
				{/if}
			</BasicMainCard>
		</TitledMainSection>

		<TitledMainSection
			Icon={Rat}
			title={m.kecleon()}
			disabled={kecleons.length === 0}
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

					<BigExpireTime expire={kecleons[0]?.expiration ?? 0} />

					<QuickSearchButton
						label="Find more Kecleon"
						onclick={setActiveSearchKecleon}
					/>
				{/if}
			</BasicMainCard>
		</TitledMainSection>

		<TitledMainSection
			Icon={Medal}
			title={m.contest()}
			disabled={contests.length === 0 || (data?.showcase_expiry ?? 0) < currentTimestamp()}
		>
			{#if contests.length === 0 || (data?.showcase_expiry ?? 0) < currentTimestamp()}
				<BasicMainCard>
					{#if !data.showcase_expiry}
						This Pokestop never hosted a showcase
					{:else}
						<IconValue Icon={Clock}>
							Last showcase ended {timestampToLocalTime(data.showcase_expiry, {
							showDate: true,
							showSeconds: false,
							longMonth: true
						})}
						</IconValue>
					{/if}
				</BasicMainCard>
			{:else}
				<BasicMainCard>
					{@const name =
						data.showcase_ranking_standard && data.contest_focus
							? getContestText(data.showcase_ranking_standard, data.contest_focus)
							: m.unknown_contest()}

					<MainCardBigIcon src={getContestIcon(data.contest_focus)} alt={name} title={name} />

					<div class="space-y-3">
						<StatsMainCardEntry Icon={UsersRound} name="Entries">
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
									class="w-full rounded-md bg-accent-highlight px-4 relative flex justify-between items-center"
								>
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
											<ImagePopup src={getIconPokemon(entry)} alt={mPokemon(entry)}
											            class="size-12" />
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

	{/if}

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
			radius={80}
			zoom={15.5}
			icon={resize(getIconPokestop({}), { width: 64 })}
		/>
	</TitledMainSection>

	{#if showMatchingFiltersets()}
		<TitledMainSection Icon={SlidersHorizontal} title={m.matching_filtersets()}>
			<BasicMainCard>
				{@const filtersets = getMatchingFiltersets(quest, invasions)}

				{#if filtersets.length === 0}
					<p>None of your filters match this Pokestop</p>
				{/if}
				<div class="flex flex-wrap gap-3">
					{#each filtersets as filterset (filterset.id)}
						<div
							class="flex gap-3 font-medium items-center bg-accent-highlight px-4 py-2 rounded-md"
						>
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
				<p class="text-muted-foreground">No description</p>
			{:else}
				<p class="text-muted-foreground">
					{data.description}
				</p>
			{/if}

			{#if data.url}
				<div class="mt-2 relative rounded-md overflow-hidden h-28 w-full">
					<button
						class="size-full absolute z-10 bg-black/50 backdrop-blur-[1px] flex justify-center items-center"
					>
						<div>
							
						</div>
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

			<Button class="mt-3 mb-2 w-full" variant="link" onclick={openWayfarerMap}>
				Go to Wayfarer Map
				<ArrowRight class="size-3.5" />
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
