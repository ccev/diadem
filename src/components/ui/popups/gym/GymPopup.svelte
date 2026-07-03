<script module lang="ts">
	import type { MapObjectPopupProps } from "@/components/ui/popups/common/PopupBaseStatic.svelte";
	import * as m from "$lib/paraglide/messages";
	import { mMove, mPokemon, mRaid, mTeam } from "$lib/services/ingameLocale";
	import { type MapData, MapObjectType } from "$lib/mapObjects/mapObjectTypes";
	import type { GymData, GymDefender } from "$lib/types/mapObjectData/gym";
	import { getIconGym, getIconPokemon, getIconRaidEgg, getIconTeam } from "$lib/services/uicons.svelte";
	import { resize } from "$lib/services/assets";
	import { timestampToLocalTime } from "$lib/utils/timestampToLocalTime";
	import { getRaidPokemon, GYM_SLOTS, hasActiveRaid, isFortOutdated, isRaidHatched } from "$lib/utils/gymUtils";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import IconValue from "@/components/ui/popups/common/IconValue.svelte";
	import FortImage from "@/components/ui/popups/common/FortImage.svelte";
	import Countdown from "@/components/utils/Countdown.svelte";
	import RaidIcon from "@/components/icons/RaidIcon.svelte";
	import BasicMainCard from "@/components/ui/popups/common/BasicMainCard.svelte";
	import BigIconOverview from "@/components/ui/popups/common/BigIconOverview.svelte";
	import MainAccessMap from "@/components/ui/popups/common/MainAccessMap.svelte";
	import MainCardBigIcon from "@/components/ui/popups/common/MainCardBigIcon.svelte";
	import OverviewCard from "@/components/ui/popups/common/OverviewCard.svelte";
	import StatsMainCardEntry from "@/components/ui/popups/common/StatsMainCardEntry.svelte";
	import TitledMainSection from "@/components/ui/popups/common/TitledMainSection.svelte";
	import AboutFort from "@/components/ui/popups/common/AboutFort.svelte";
	import BasicPokemonDisplayMultiple from "@/components/ui/popups/common/BasicPokemonDisplayMultiple.svelte";
	import BasicPokemonDisplayOne from "@/components/ui/popups/common/BasicPokemonDisplayOne.svelte";
	import {
		BadgeCheck,
		Candy,
		CircleAlert,
		CircleDot,
		Clock,
		Heart,
		Shield,
		ShieldHalf,
		SquareEqual,
		Star,
		Swords,
		UserRoundCheck,
		UsersRound
	} from "@lucide/svelte";
	import { getActiveRaidsForLevel } from "$lib/features/masterStats.svelte";
	import { currentTimestamp } from "$lib/utils/currentTimestamp";
	import { formatPercentage } from "$lib/utils/numberFormat";

	export { image, overview, main };

	export function getPopupPropsGym(data: MapData) {
		data = data as GymData;
		return {
			type: m.pogo_gym(),
			title: data.name ?? m.unknown_gym(),
			image,
			overview,
			main
		} as MapObjectPopupProps;
	}

	function getDefenderId(defender: GymDefender) {
		return `${defender.pokemon_id}-${defender.form}-${defender.deployed_time}`;
	}

	function getOccupiedSlots(data: GymData) {
		return GYM_SLOTS - (data.availble_slots ?? 0);
	}

	function getRaidTitle(data: GymData) {
		if (data.raid_pokemon_id) return mPokemon(getRaidPokemon(data));
		return mRaid(data.raid_level);
	}

	function getRaidIcon(data: GymData) {
		if (data.raid_pokemon_id) return getIconPokemon(getRaidPokemon(data));
		return getIconRaidEgg(data.raid_level ?? 0, isRaidHatched(data));
	}

	function getRaidExpire(data: GymData) {
		return isRaidHatched(data) ? data.raid_end_timestamp : data.raid_battle_timestamp;
	}

	function hasRaidData(data: GymData) {
		return Boolean(data.raid_level && data.raid_end_timestamp);
	}
</script>

{#snippet image(d: MapData)}
	{@const data = d as GymData}
	<FortImage
		alt={data.name ?? m.pogo_gym()}
		fortUrl={data.url}
		fortIcon={getIconGym(data)}
		fortName={data.name}
		fortDescription={data.description}
	/>
{/snippet}

{#snippet overview(d: MapData)}
	{@const data = d as GymData}
	{@const activeRaid = hasActiveRaid(data) && hasRaidData(data)}

	{#if activeRaid}
		<OverviewCard Icon={RaidIcon} title={m.raid()}>
			<BigIconOverview>
				{#snippet image()}
					<ImagePopup class="h-12" src={getRaidIcon(data)} alt={getRaidTitle(data)} />
				{/snippet}

				{#snippet title()}
					{getRaidTitle(data)}
				{/snippet}

				{#snippet extra()}
					<span class="flex items-center gap-1">
						<Clock class="size-3" />
						<Countdown expireTime={getRaidExpire(data)} />
					</span>
				{/snippet}
			</BigIconOverview>
		</OverviewCard>
	{/if}

	{#if data.team_id && data.team_id !== 0 && !isFortOutdated(data.updated)}
		<OverviewCard Icon={Shield} title={m.defending()}>
			<BigIconOverview>
				{#snippet image()}
					<ImagePopup
						class="size-12"
						src={getIconTeam(data.team_id ?? 0)}
						alt={mTeam(data.team_id)}
					/>
				{/snippet}

				{#snippet title()}
					{m.gym_team({ team: mTeam(data.team_id) })}
				{/snippet}

				{#snippet extra()}
					{m.gym_slots({ occupied: getOccupiedSlots(data), total: GYM_SLOTS })}
				{/snippet}
			</BigIconOverview>
		</OverviewCard>
	{/if}
{/snippet}

{#snippet main(d: MapData)}
	{@const data = d as GymData}
	{@const activeRaid = hasActiveRaid(data) && hasRaidData(data)}

	{#if isFortOutdated(data.updated)}
		<BasicMainCard class="font-medium">
			<IconValue Icon={CircleAlert}>
				{m.gym_outdated_notice({
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
		<TitledMainSection Icon={RaidIcon} title={m.raid()} disabled={!activeRaid}>
			<BasicMainCard>
				{#if !hasRaidData(data)}
					{m.no_raid_at_gym()}
				{:else if !activeRaid}
					<IconValue Icon={Clock}>
						{m.last_raid_ended({
							time: timestampToLocalTime(data.raid_end_timestamp, {
								showDate: true,
								showSeconds: false,
								longMonth: true
							})
						})}
					</IconValue>
				{:else}
					<MainCardBigIcon
						src={getRaidIcon(data)}
						alt={getRaidTitle(data)}
						title={getRaidTitle(data)}
					/>

					<div class="space-y-5">
						<!--Expiration-->
						<div>
							<IconValue class="mb-1" Icon={Clock}>
								{m.battle_time()}
							</IconValue>

							<div
								class="mt-2 border-2 border-accent-highlight rounded-md px-3 py-2 text-center font-semibold"
							>
								{m.range_to({
									x: timestampToLocalTime(data.raid_battle_timestamp),
									y: timestampToLocalTime(data.raid_end_timestamp)
								})}
							</div>
						</div>

						<!--Hatch Prediction-->
						{#if !data.raid_pokemon_id && data.raid_level}
							{@const possibleBosses = getActiveRaidsForLevel(data.raid_level)}
							{#if possibleBosses}
								<div>
									<IconValue class="" Icon={BadgeCheck}>
										{#if possibleBosses.length === 1}
											{m.possible_hatch()}
										{:else}
											{m.possible_hatches()}
										{/if}
									</IconValue>

									{#if possibleBosses.length === 1}
										{@const boss = possibleBosses[0]}
										<BasicPokemonDisplayOne pokemon={boss} />
									{:else}
										<BasicPokemonDisplayMultiple pokemon={possibleBosses} />
									{/if}
								</div>
							{/if}
						{/if}

						<!--RSVPs-->
						{#if data?.rsvps?.length}
							<div>
								<IconValue Icon={UserRoundCheck}>
									{m.rsvp()}
								</IconValue>
								<div class="mt-1 space-y-3 rounded-md bg-accent-highlight py-3 px-5">
									{#each data.rsvps as rsvp (rsvp.timeslot)}
										<div class="grid items-center gap-x-2" style="grid-template-columns: auto 1fr">
											<b>{timestampToLocalTime(rsvp.timeslot / 1000, { showSeconds: false })}</b>
											<span class="text-right"
											>{m.rsvp_entry({
												going: rsvp.going_count,
												maybe: rsvp.maybe_count
											})}</span
											>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<!--Raid Attributes-->
						{#if data.raid_pokemon_id}
							<div class="space-y-3">
								<StatsMainCardEntry Icon={Star} name={m.tier()} value={mRaid(data.raid_level)} />

								{#if data.raid_pokemon_cp != null}
									<StatsMainCardEntry
										Icon={ShieldHalf}
										name={m.cp()}
										value={data.raid_pokemon_cp}
									/>
								{/if}
								<StatsMainCardEntry Icon={Swords} name={m.popup_pokemon_moves()}>
									{#snippet value()}
										<p class="flex gap-2">
											{#if data.raid_pokemon_move_1 && data.raid_pokemon_move_2}
												<span>{mMove(data.raid_pokemon_move_1)}</span>
												<span>·</span>
												<span>{mMove(data.raid_pokemon_move_2)}</span>
											{:else}
												{m.unknown()}
											{/if}
										</p>
									{/snippet}
								</StatsMainCardEntry>
							</div>
						{/if}
					</div>
				{/if}
			</BasicMainCard>
		</TitledMainSection>

		<TitledMainSection
			Icon={Shield}
			title={m.gym_members()}
			disabled={!data.team_id || data.team_id === 0}
		>
			<BasicMainCard>
				{#if !data.team_id || data.team_id === 0}
					{m.no_defenders_at_gym()}
				{:else}
					<MainCardBigIcon
						src={getIconTeam(data.team_id)}
						alt={mTeam(data.team_id)}
						title={mTeam(data.team_id)}
					/>

					<div class="mt-4 space-y-3">
						<StatsMainCardEntry
							Icon={UsersRound}
							name={m.slots_occupied()}
							value="{getOccupiedSlots(data)}/{GYM_SLOTS}"
						/>
					</div>

					{#if data.defenders?.length}
						<div class="-mx-4 mt-2">
							<div class="flex w-full gap-3 overflow-x-auto px-4 *:shrink-0">
								{#each data.defenders as defender (getDefenderId(defender))}
									<div class="min-w-64 max-w-80 rounded-md bg-accent-highlight p-5">
										<div class="flex items-center gap-3">
											<ImagePopup
												class="size-12 shrink-0"
												src={getIconPokemon(defender)}
												alt={mPokemon(defender)}
											/>
											<div class="min-w-0">
												<p class="truncate font-semibold">
													{mPokemon(defender)}
												</p>
												<div class="text-muted-foreground">
													<div class="flex gap-1.5 items-center">
														<div class="relative size-6 text-muted-foreground">
															<Heart class="absolute inset-0 size-full stroke-1" />
															<div
																class="absolute bottom-0 left-0 w-full overflow-hidden"
																style:height="{defender.motivation_now * 100}%"
															>
																<Heart
																	class="absolute bottom-0 left-0 size-6 fill-rose-400 dark:fill-rose-800 stroke-1" />
															</div>
														</div>
														<p>
															{formatPercentage(defender.motivation_now, {
																maxDecimals: 0,
																minDecimals: 0
															})}
														</p>

													</div>
												</div>
											</div>
										</div>

										<div class="space-y-1 mt-4">
											<StatsMainCardEntry
												Icon={SquareEqual}
												name="CP"
											>
												{#snippet value()}
													<p>
														<span>
															{defender.cp_now}
														</span>
														<span class="text-muted-foreground">
															/ {defender.cp_when_deployed}
														</span>
													</p>

												{/snippet}
											</StatsMainCardEntry>
											<StatsMainCardEntry Icon={Swords} name="Won" value={defender.battles_won} />
											<StatsMainCardEntry Icon={Shield} name="Lost"
											                    value={defender.battles_lost} />
											<StatsMainCardEntry Icon={Candy} name="Fed" value={defender.times_fed} />
											<StatsMainCardEntry Icon={Clock} name="Placed">
												{#snippet value()}
													{#if defender.deployed_time < currentTimestamp() - 60 * 60 * 24}
														{timestampToLocalTime(defender.deployed_time, {
															showDate: true,
															dayLowerCase: false,
															showSeconds: false
														})}
													{:else}
														<Countdown
															expireTime={defender.deployed_time} />
													{/if}
												{/snippet}
											</StatsMainCardEntry>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				{/if}
			</BasicMainCard>
		</TitledMainSection>
	{/if}

	<TitledMainSection Icon={CircleDot} title={m.access_this_gym()}>
		<MainAccessMap
			lat={data.lat}
			lon={data.lon}
			type={MapObjectType.GYM}
			uiconType="gym"
			radius={80}
			zoom={15.5}
			icon={resize(getIconGym(data), { width: 64 })}
		/>
	</TitledMainSection>

	<AboutFort
		title={m.about_this_gym()}
		name={data.name}
		description={data.description}
		imageUrl={data.url}
		sponsorId={data.sponsor_id}
		partnerId={data.partner_id}
		defaultName={m.pogo_gym()}
		updated={data.updated}
		lastModified={data.last_modified_timestamp}
		firstSeen={data.first_seen_timestamp}
	/>
{/snippet}
