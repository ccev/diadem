<script module lang="ts">
	import type { MapObjectPopupProps } from "@/components/ui/popups/common/PopupBaseStatic.svelte";
	import * as m from "$lib/paraglide/messages";
	import { mCharacter, mItem, mPokemon, mQuest } from "$lib/services/ingameLocale";
	import { type MapData, MapObjectType } from "$lib/mapObjects/mapObjectTypes";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import BasicMainCard from "@/components/ui/popups/common/BasicMainCard.svelte";
	import OverviewCard from "@/components/ui/popups/common/OverviewCard.svelte";
	import TitledMainSection from "@/components/ui/popups/common/TitledMainSection.svelte";
	import {
		getIconInvasion,
		getIconItem,
		getIconPokemon,
		getIconPokestop,
		getIconReward
	} from "$lib/services/uicons.svelte";
	import { timestampToLocalTime } from "$lib/utils/timestampToLocalTime";
	import {
		BadgeCheck,
		CircleAlert,
		CircleDot,
		Clock,
		Flower,
		Medal,
		Rat,
		ShieldHalf,
		SlidersHorizontal,
		UsersRound
	} from "@lucide/svelte";
	import type { Incident, PokestopData } from "$lib/types/mapObjectData/pokestop";
	import FortImage from "@/components/ui/popups/common/FortImage.svelte";
	import {
		CONTEST_SLOTS,
		getContestIcon,
		getContestText,
		getRewardText,
		isIncidentContest,
		isIncidentInvasion,
		isIncidentKecleon,
		KECLEON_ID
	} from "$lib/utils/pokestopUtils";
	import IconValue from "@/components/ui/popups/common/IconValue.svelte";
	import QuestIcon from "@/components/icons/QuestIcon.svelte";
	import InvasionIcon from "@/components/icons/InvasionIcon.svelte";
	import { getInvasionLineup, getInvasionPokemon } from "$lib/features/masterStats.svelte";
	import { currentTimestamp } from "$lib/utils/currentTimestamp";
	import MainAccessMap from "@/components/ui/popups/common/MainAccessMap.svelte";
	import { resize } from "$lib/services/assets";
	import { getUserSettings } from "$lib/services/userSettings.svelte";
	import { matchInvasionFilterset, matchQuestFilterset } from "$lib/features/filterLogic/pokestop";
	import FiltersetIcon from "$lib/features/filters/FiltersetIcon.svelte";
	import { filterTitle } from "$lib/features/filters/filtersetUtils.svelte";
	import type { AnyFilterset } from "$lib/features/filters/filtersets";
	import MainCardBigIcon from "@/components/ui/popups/common/MainCardBigIcon.svelte";
	import StatsMainCardEntry from "@/components/ui/popups/common/StatsMainCardEntry.svelte";
	import { isFortOutdated } from "$lib/utils/gymUtils";
	import BigExpireTime from "@/components/ui/popups/common/BigExpireTime.svelte";
	import InvasionLineupEntry from "@/components/ui/popups/common/InvasionLineupEntry.svelte";
	import BigIconOverview from "@/components/ui/popups/common/BigIconOverview.svelte";
	import QuickSearchButton from "@/components/ui/popups/common/QuickSearchButton.svelte";
	import {
		setActiveSearchInvasion,
		setActiveSearchKecleon,
		setActiveSearchQuest
	} from "$lib/features/activeSearch.svelte";
	import { getActiveSearchQuestParams } from "$lib/services/search.svelte";
	import Countdown from "@/components/utils/Countdown.svelte";
	import AboutFort from "@/components/ui/popups/common/AboutFort.svelte";

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
	{@const quest = data.quests[0]}
	{@const [invasions, kecleons, contests] = getIncidents(data)}

	{#if quest}
		<OverviewCard Icon={QuestIcon} title={m.pogo_quest()}>
			<BigIconOverview>
				{#snippet image()}
					<ImagePopup
						src={getIconReward(quest.reward.type, quest.reward.info)}
						alt={getRewardText(quest.reward)}
					/>
				{/snippet}

				{#snippet title()}
					{getRewardText(quest.reward)}
				{/snippet}

				{#snippet extra()}
					{mQuest(quest.title, quest.target)}
				{/snippet}
			</BigIconOverview>
		</OverviewCard>
	{/if}

	{#each invasions as invasion}
		{@const name = mCharacter(invasion.character, { confirmed: invasion.confirmed })}
		{@const reward = invasion.confirmed_reward}
		<OverviewCard Icon={InvasionIcon} title={m.pogo_invasion()}>
			<BigIconOverview>
				{#snippet image()}
					<div class="relative size-12">
						{#if reward}
							<ImagePopup src={getIconPokemon(reward)} alt={name} />
							<ImagePopup
								class="absolute right-0 bottom-0 size-6"
								src={getIconInvasion(invasion.character, invasion.confirmed)}
								alt={name}
							/>
						{:else}
							<ImagePopup
								src={getIconInvasion(invasion.character, invasion.confirmed)}
								alt={name}
							/>
						{/if}
					</div>
				{/snippet}

				{#snippet title()}
					{#if reward}
						{mPokemon(reward)}
					{:else}
						{name}
					{/if}
				{/snippet}

				{#snippet extra()}
					{#if reward}
						<span>{name}</span>
					{/if}
					<span class="flex gap-1 items-center">
						<Clock class="size-3" />
						<Countdown expireTime={invasion.expiration} />
					</span>
				{/snippet}
			</BigIconOverview>
		</OverviewCard>
	{/each}

	{#if data?.lure_expire_timestamp && data.lure_expire_timestamp >= currentTimestamp()}
		{@const lureId = data?.lure_id ?? 501}
		<OverviewCard Icon={Flower} title={m.lure_module()}>
			<BigIconOverview>
				{#snippet image()}
					<ImagePopup src={getIconItem(lureId)} alt={mItem(lureId)} />
				{/snippet}

				{#snippet title()}
					{mItem(lureId)}
				{/snippet}

				{#snippet extra()}
					<span class="flex gap-1 items-center">
						<Clock class="size-3" />
						<Countdown expireTime={data.lure_expire_timestamp} />
					</span>
				{/snippet}
			</BigIconOverview>
		</OverviewCard>
	{/if}

	{#each kecleons as kecleon (kecleon.id)}
		<OverviewCard Icon={Rat} title={m.hidden_here()}>
			<BigIconOverview>
				{#snippet image()}
					<ImagePopup
						src={getIconPokemon({ pokemon_id: KECLEON_ID })}
						alt={mPokemon({ pokemon_id: KECLEON_ID })}
					/>
				{/snippet}

				{#snippet title()}
					{m.kecleon()}
				{/snippet}

				{#snippet extra()}
					<span class="flex gap-1 items-center">
						<Clock class="size-3" />
						<Countdown expireTime={kecleon.expiration} />
					</span>
				{/snippet}
			</BigIconOverview>
		</OverviewCard>
	{/each}

	{#if contests.length > 0 && (data?.showcase_expiry ?? 0) >= currentTimestamp()}
		{@const name =
			data.showcase_ranking_standard && data.contest_focus
				? getContestText(data.showcase_ranking_standard, data.contest_focus)
				: m.unknown_contest()}
		<OverviewCard Icon={Medal} title={m.contest()}>
			<BigIconOverview>
				{#snippet image()}
					<ImagePopup src={getContestIcon(data.contest_focus)} alt={name} />
				{/snippet}

				{#snippet title()}
					{name}
				{/snippet}

				{#snippet extra()}
					<span class="flex gap-1.5 items-center">
						<Clock class="size-3" />
						<Countdown expireTime={data.showcase_expiry ?? 0} />
					</span>
				{/snippet}
			</BigIconOverview>
		</OverviewCard>
	{/if}
{/snippet}

{#snippet main(d: MapData)}
	{@const data = d as PokestopData}
	{@const quest = data.quests[0]}
	{@const [invasions, kecleons, contests] = getIncidents(data)}

	{#if isFortOutdated(data?.updated)}
		<BasicMainCard class="font-medium">
			<IconValue Icon={CircleAlert}>
				{m.pokestop_outdated_notice({
					time: timestampToLocalTime(data.updated, {
						showDate: true,
						showSeconds: false,
						showTime: false,
						longMonth: true
					})
				})}
			</IconValue>
		</BasicMainCard>
	{:else}
		<TitledMainSection Icon={QuestIcon} title={m.pogo_quest()} disabled={!Boolean(quest)}>
			<BasicMainCard>
				{#if !quest}
					{m.no_quest_scanned_today()}
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
						value={timestampToLocalTime(quest.timestamp, { showDate: true, showSeconds: false, dayLowerCase: false })}
					/>

					<QuickSearchButton
						label={m.find_more_x_quests({ x: getRewardText(quest.reward) })}
						onclick={() => {
							const { name, reward } = getActiveSearchQuestParams(quest.reward);
							setActiveSearchQuest(name, reward);
						}}
					/>
				{/if}
			</BasicMainCard>
		</TitledMainSection>

		<TitledMainSection
			Icon={InvasionIcon}
			title={m.pogo_invasion()}
			disabled={invasions.length === 0}
		>
			<div class="space-y-4">
				{#if invasions.length === 0}
					<BasicMainCard>
						{m.no_invasions_at_pokestop()}
					</BasicMainCard>
				{/if}
				{#each invasions as invasion (invasion.id)}
					{@const lineup = getInvasionLineup(invasion.character)}
					<BasicMainCard>
						{@const reward = invasion.confirmed_reward}
						{@const name = mCharacter(invasion.character, { confirmed: invasion.confirmed })}

						<MainCardBigIcon
							src={getIconInvasion(invasion.character, invasion.confirmed)}
							alt={name}
							title={name}
						/>

						<BigExpireTime expire={invasion.expiration} />

						{#if reward}
							<IconValue class="mt-5" Icon={BadgeCheck}>
								{m.confirmed_reward()}
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
										{mPokemon(reward)}
									</span>
								</div>
								{#if lineup?.second?.[0]?.encounter}
									<div class="flex flex-col items-center mt-5 mb-1">
										<p class="">
											{m.or_x_chance_to_get({ chance: 16 })}
										</p>

										<div class="flex gap-3 mt-2">
											{#each lineup.second as extraReward (extraReward.pokemon_id + "-" + extraReward.form)}
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
									{m.possible_lineup()}
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
							label={m.find_more_x({ x: mCharacter(invasion.character, { plural: true }) })}
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
					{m.no_lure_seen_here()}
				{:else if data.lure_expire_timestamp < currentTimestamp()}
					<IconValue Icon={Clock}>
						{m.last_lure_ended({
							time: timestampToLocalTime(data.lure_expire_timestamp, {
								showDate: true,
								showSeconds: false,
								longMonth: true
							})
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

		<TitledMainSection Icon={Rat} title={m.kecleon()} disabled={kecleons.length === 0}>
			<BasicMainCard>
				{#if kecleons.length === 0}
					{m.no_kecleon_hiding_here()}
				{:else}
					<MainCardBigIcon
						src={getIconPokemon({ pokemon_id: KECLEON_ID })}
						alt={mPokemon({ pokemon_id: KECLEON_ID })}
						title={m.kecleon_hiding_here()}
					/>

					<BigExpireTime expire={kecleons[0]?.expiration ?? 0} />

					<QuickSearchButton
						label={m.find_more_x({ x: m.kecleon() })}
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
						{m.pokestop_never_hosted_showcase()}
					{:else}
						<IconValue Icon={Clock}>
							{m.last_showcase_ended({
								time: timestampToLocalTime(data.showcase_expiry, {
									showDate: true,
									showSeconds: false,
									longMonth: true
								})
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
						<StatsMainCardEntry Icon={UsersRound} name={m.entries()}>
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
											{m.score_x({ score: entry.score.toFixed(0) })}
										</p>
									</div>
									<div class="flex items-end text-right">
										<div class="size-12 shrink-0 -mr-5 z-10 mb-3">
											<ImagePopup
												src={getIconPokemon(entry)}
												alt={mPokemon(entry)}
												class="size-12"
											/>
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

	<TitledMainSection Icon={CircleDot} title={m.access_this_pokestop()}>
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
					<p>{m.filters_dont_match_pokestop()}</p>
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

	<AboutFort
		title={m.about_this_pokestop()}
		name={data.name}
		description={data.description}
		imageUrl={data.url}
		sponsorId={data.sponsor_id}
		partnerId={data.partner_id}
		defaultName={m.pogo_pokestop()}
		updated={data.updated}
		lastModified={data.last_modified_timestamp}
		firstSeen={data.first_seen_timestamp}
	/>
{/snippet}
