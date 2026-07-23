<script module lang="ts">
	import type { MapObjectPopupProps } from "@/components/ui/popups/common/PopupBaseStatic.svelte";
	import * as m from "$lib/paraglide/messages";
	import { mMove, mPokemon } from "$lib/services/ingameLocale";
	import { type MapData, MapObjectType } from "$lib/mapObjects/mapObjectTypes";
	import type { StationData } from "$lib/types/mapObjectData/station";
	import { currentTimestamp } from "$lib/utils/currentTimestamp";
	import { formatNumber } from "$lib/utils/numberFormat";
	import { timestampToLocalTime } from "$lib/utils/timestampToLocalTime";
	import {
		calculateMaxBattleCp,
		getStationPokemon,
		isMaxBattleActive,
		STATION_SLOTS
	} from "$lib/utils/stationUtils";
	import { getIconPokemon, getIconStation } from "$lib/services/uicons.svelte";
	import { resize } from "$lib/services/assets";
	import { setActiveSearchMaxBattleBoss } from "$lib/features/activeSearch.svelte";
	import Countdown from "@/components/utils/Countdown.svelte";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import BasicMainCard from "@/components/ui/popups/common/BasicMainCard.svelte";
	import MainAccessMap from "@/components/ui/popups/common/MainAccessMap.svelte";
	import MainCardBigIcon from "@/components/ui/popups/common/MainCardBigIcon.svelte";
	import OverviewCard from "@/components/ui/popups/common/OverviewCard.svelte";
	import PokemonStatsCard from "@/components/ui/popups/common/PokemonStatsCard.svelte";
	import QuickSearchButton from "@/components/ui/popups/common/QuickSearchButton.svelte";
	import StatsMainCard from "@/components/ui/popups/common/StatsMainCard.svelte";
	import StatsMainCardEntry from "@/components/ui/popups/common/StatsMainCardEntry.svelte";
	import TitledMainSection from "@/components/ui/popups/common/TitledMainSection.svelte";
	import UpdatedTimes from "@/components/ui/popups/common/UpdatedTimes.svelte";
	import IconValue from "@/components/ui/popups/common/IconValue.svelte";
	import {
		ChartSpline,
		CircleDot,
		Clock,
		ClockArrowDown,
		ClockArrowUp,
		Info,
		MapPinned,
		Search,
		Star,
		Swords,
		UsersRound
	} from "@lucide/svelte";

	export { image, overview, main };

	export function getPopupPropsStation(data: MapData) {
		data = data as StationData;
		const active = hasActiveMaxBattle(data);

		return {
			type: active ? m.pogo_max_battle() : m.pogo_station(),
			title: active ? mPokemon(getStationPokemon(data)) : data.name,
			image,
			overview,
			main
		} as MapObjectPopupProps;
	}

	function hasActiveMaxBattle(data: StationData) {
		return Boolean(data.battle_pokemon_id && isMaxBattleActive(data));
	}

	function hasLastMaxBattle(data: StationData) {
		return Boolean(data.battle_pokemon_id && (data.end_time ?? 0) < currentTimestamp());
	}
</script>

<script>
	import DynamaxIcon from "@/components/icons/DynamaxIcon.svelte";
	import BigExpireTime from "@/components/ui/popups/common/BigExpireTime.svelte";
	import {
		Calculator,
		HandFist,
		Heart,
		ShieldHalf,
		SquareEqual,
		Sword,
		Timer
	} from "@lucide/svelte";
	import { getStationAttackBonus } from "$lib/utils/stationUtils";
	import { formatPercentage } from "$lib/utils/numberFormat";
	import InvasionLineupEntry from "@/components/ui/popups/common/InvasionLineupEntry.svelte";
</script>

{#snippet image(d: MapData)}
	{@const data = d as StationData}
	<div class="size-14 shrink-0">
		{#if hasActiveMaxBattle(data)}
			<ImagePopup
				alt={mPokemon(getStationPokemon(data))}
				src={getIconPokemon(getStationPokemon(data))}
				class="size-14"
			/>
		{:else}
			<ImagePopup alt={m.pogo_station()} src={getIconStation(data)} class="size-14" />
		{/if}
	</div>
{/snippet}

{#snippet overview(d: MapData)}
	{@const data = d as StationData}

	{#if hasActiveMaxBattle(data)}
		<OverviewCard Icon={Clock} title={m.end()}>
			{#snippet value()}
				<Countdown expireTime={data.end_time} />
			{/snippet}
		</OverviewCard>
		<OverviewCard
			Icon={UsersRound}
			title={m.stationed()}
			value={m.station_overview_count({
				total: data.total_stationed_pokemon ?? 0,
				gmax: data.total_stationed_gmax ?? 0
			})}
		/>
	{/if}
{/snippet}

{#snippet main(d: MapData)}
	{@const data = d as StationData}
	{@const active = hasActiveMaxBattle(data)}
	{@const pokemon = getStationPokemon(data)}
	{@const pokemonName = mPokemon(pokemon)}

	{#if active}
		<TitledMainSection Icon={DynamaxIcon} title={m.pogo_max_battle()}>
			<BasicMainCard>
				<IconValue Icon={Clock} class="font-semibold mb-1">
					{#if (data?.start_time ?? 0) > currentTimestamp()}
						{m.raid_starts()}
					{:else}
						{m.raid_ends()}
					{/if}
				</IconValue>
				<BigExpireTime
					expire={(data?.start_time ?? 0) > currentTimestamp() ? data.start_time : data.end_time}
					showSeconds={false}
					showDate={true}
					showIcon={false}
				/>

				<div class="space-y-3 mt-5">
					{#if (data?.start_time ?? 0) < currentTimestamp()}
						{#if data.start_time}
							<StatsMainCardEntry
								Icon={Timer}
								name={m.started()}
								value={timestampToLocalTime(data.start_time, {
									showDate: true,
									showSeconds: false,
									showTime: true,
									dayLowerCase: false
								})}
							/>
						{/if}
					{:else if data.end_time}
						<StatsMainCardEntry
							Icon={Timer}
							name={m.raid_ends()}
							value={timestampToLocalTime(data.end_time, {
								showDate: true,
								showSeconds: false,
								showTime: true,
								dayLowerCase: false
							})}
						/>
					{/if}
					<StatsMainCardEntry Icon={Swords} name={m.popup_pokemon_moves()}>
						{#snippet value()}
							<p class="flex gap-2">
								{#if data.battle_pokemon_move_1 && data.battle_pokemon_move_2}
									<span>{mMove(data.battle_pokemon_move_1)}</span>
									<span>·</span>
									<span>{mMove(data.battle_pokemon_move_2)}</span>
								{:else}
									{m.unknown()}
								{/if}
							</p>
						{/snippet}
					</StatsMainCardEntry>
					<StatsMainCardEntry Icon={Star} name={m.tier()} value={data.battle_level ?? 0} />
					<StatsMainCardEntry
						Icon={SquareEqual}
						name={m.cp()}
						value={calculateMaxBattleCp(data) ?? 0}
					/>
					<StatsMainCardEntry
						Icon={Heart}
						name={m.stamina()}
						value={formatNumber(data.battle_pokemon_stamina)}
					/>
					<StatsMainCardEntry
						Icon={Calculator}
						name={m.cpm()}
						value={formatNumber(data.battle_pokemon_cp_multiplier)}
					/>
				</div>

				<QuickSearchButton
					label={m.find_more_x({ x: m.pokemon_max_battles({ pokemon: pokemonName }) })}
					onclick={() =>
						setActiveSearchMaxBattleBoss(
							m.pokemon_max_battles({ pokemon: pokemonName }),
							data.battle_pokemon_id ?? 0,
							data.battle_pokemon_form ?? 0,
							data.battle_pokemon_bread_mode ?? 0
						)}
				/>
			</BasicMainCard>
		</TitledMainSection>

		<TitledMainSection Icon={UsersRound} title={m.stationed_pokemon()}>
			<BasicMainCard>
				<div class="space-y-3">
					<StatsMainCardEntry
						Icon={Swords}
						name={m.total_stationed()}
						value="{data.total_stationed_pokemon ?? 0}/{STATION_SLOTS}"
					/>
					<StatsMainCardEntry
						Icon={Sword}
						name={m.max_battle_gmax()}
						value={data.total_stationed_gmax ?? 0}
					/>
					<StatsMainCardEntry
						Icon={HandFist}
						name={m.attack_bonus()}
						value={formatPercentage(getStationAttackBonus(data.total_stationed_pokemon ?? 0), {
							minDecimals: 0,
							maxDecimals: 1
						})}
					/>
				</div>
				{#if data.stationed_pokemon?.length}
					<div class="-mx-4 mt-3">
						<div class="w-full flex overflow-x-auto *:shrink-0 gap-3 px-4 mt-2">
							{#each data.stationed_pokemon as pokemon}
								<div class="rounded-md p-4 bg-accent-highlight">
									<div class="size-10">
										<ImagePopup
											class="size-10"
											src={resize(getIconPokemon(pokemon), { width: 64 })}
											alt={mPokemon(pokemon)}
										/>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</BasicMainCard>
		</TitledMainSection>
	{:else}
		<TitledMainSection Icon={DynamaxIcon} disabled={true} title={m.pogo_max_battle()}>
			<BasicMainCard>
				{#if hasLastMaxBattle(data)}
					<MainCardBigIcon
						src={getIconPokemon(getStationPokemon(data))}
						alt={mPokemon(getStationPokemon(data))}
						title={mPokemon(getStationPokemon(data))}
					/>
					<IconValue class="mt-1" Icon={Clock}>
						{m.last_max_battle_notice({
							time: timestampToLocalTime(data.end_time, {
								showDate: true,
								showSeconds: false
							})
						})}
					</IconValue>
				{:else}
					{m.power_spot_never_had_max_battle()}
				{/if}
			</BasicMainCard>
		</TitledMainSection>
	{/if}

	<TitledMainSection Icon={CircleDot} title={m.access_this_power_spot()}>
		<MainAccessMap
			lat={data.lat}
			lon={data.lon}
			type={MapObjectType.STATION}
			uiconType="station"
			radius={80}
			zoom={15.5}
			icon={resize(getIconStation(data), { width: 64 })}
		/>
	</TitledMainSection>

	<TitledMainSection Icon={Info} title={m.about_this_sation()}>
		<StatsMainCard>
			<StatsMainCardEntry Icon={MapPinned} name={m.name()} value={data.name} />
			<UpdatedTimes updated={data.updated} />
		</StatsMainCard>
	</TitledMainSection>
{/snippet}
