<script lang="ts">
	import type { GymData, GymDefender, Rsvp } from '@/lib/types/mapObjectData/gym';
	import BasePopup from '@/components/ui/popups/BasePopup.svelte';
	import { getIconGym, getIconPokemon, getIconRaidEgg } from '@/lib/services/uicons.svelte.js';
	import ImagePopup from '@/components/ui/popups/common/ImagePopup.svelte';
	import * as m from '@/lib/paraglide/messages';
	import FortImage from '@/components/ui/popups/common/FortImage.svelte';
	import { mMove, mPokemon, mRaid } from '@/lib/services/ingameLocale';
	import Countdown from '@/components/utils/Countdown.svelte';
	import { getRaidPokemon, GYM_SLOTS, isFortOutdated } from '@/lib/utils/pogoUtils';
	import { getMapObjects } from '@/lib/mapObjects/mapObjectsState.svelte.js';
	import TimeWithCountdown from '@/components/ui/popups/common/TimeWithCountdown.svelte';
	import {
		CircleFadingArrowUp,
		Clock,
		ClockAlert,
		ClockArrowUp,
		ScanEye,
		Smartphone,
		Trees, UserRoundCheck,
		UsersRound
	} from 'lucide-svelte';
	import IconValue from '@/components/ui/popups/common/IconValue.svelte';
	import UpdatedTimes from '@/components/ui/popups/common/UpdatedTimes.svelte';
	import FortPowerUp from '@/components/ui/popups/common/FortPowerUp.svelte';
	import { getConfig } from '@/lib/services/config/config';
	import Button from '@/components/ui/basic/Button.svelte';
	import GymDefenderOverview from '@/components/ui/popups/gym/GymDefenderOverview.svelte';
	import { getCurrentSelectedData } from '@/lib/mapObjects/currentSelectedState.svelte';
	import { timestampToLocalTime } from '@/lib/utils/timestampToLocalTime';
	import { currentTimestamp } from '@/lib/utils/currentTimestamp';

	let { mapId }: { mapId: string } = $props();
	let data: GymData = $derived(getMapObjects()[mapId] as GymData ?? getCurrentSelectedData() as GymData);
	let defenders: GymDefender[] = $derived(JSON.parse(data.defenders ?? '[]'));
	let rsvps: Rsvp[] = $derived(JSON.parse(data.rsvps ?? '[]'));

	function getTitle() {
		let title = getConfig().general.mapName;
		if (data.name) {
			title += ' | ' + data.name;
		} else {
			title += ' | ' + m.pogo_gym();
		}
		return title;
	}
</script>

<svelte:head>
	<title>{getTitle()}</title>
</svelte:head>

{#snippet raidDisplay(expanded: boolean)}
	{#if (data.raid_end_timestamp ?? 0) > currentTimestamp()}
		<div
			class="flex gap-2 items-center border-border border-b pb-2 mb-2"
		>
			{#if data.raid_pokemon_id}
				<div class="w-8 shrink-0">
					<ImagePopup
						src={getIconPokemon(getRaidPokemon(data))}
						alt={mPokemon(getRaidPokemon(data))}
						class="w-8"
					/>
				</div>
			{:else}
				<div class="w-6 mx-1 shrink-0">
					<ImagePopup
						src={getIconRaidEgg(data.raid_level ?? 0)}
						alt={mRaid(data.raid_level)}
						class="w-6"
					/>
				</div>
			{/if}


			<div>
				<div class="flex gap-1 items-center">
				<span
					class="font-semibold whitespace-nowrap"
					class:font-semibold={!data.raid_pokemon_id}
				>
					{mRaid(data.raid_level)}
				</span>

					{#if data.raid_pokemon_id}
						<b class="whitespace-nowrap">
							· {mPokemon(getRaidPokemon(data))}
						</b>
					{/if}
				</div>

				<div>
					<span class="whitespace-nowrap">
						{#if (data.raid_battle_timestamp ?? 0) < currentTimestamp()}
							{m.raid_ends()}
							<span class="font-semibold">
								<Countdown expireTime={data.raid_end_timestamp} />
							</span>
						{:else}
							{m.raid_starts()}
							<span class="font-semibold">
								<Countdown expireTime={data.raid_battle_timestamp} />
							</span>
						{/if}
					</span>

					<span class="whitespace-nowrap">
						({timestampToLocalTime(data.raid_battle_timestamp)} –
						{timestampToLocalTime(data.raid_end_timestamp)})
					</span>
				</div>

				{#if expanded && data.raid_pokemon_id}
					<div>
						{m.pogo_cp({ cp: data.raid_pokemon_cp ?? 0 })}
						({mMove(data.raid_pokemon_move_1)}
						/
						({mMove(data.raid_pokemon_move_2)}
					</div>
				{/if}

				{#if rsvps && expanded}
					<div class="grid items-center w-full justify-start mt-1.5" style="grid-template-columns: repeat(3, auto)">
						{#each rsvps as rsvp (rsvp.timeslot)}
							<UserRoundCheck size="16" class="mr-1.5" />
							<b class="mr-1.5">{timestampToLocalTime(rsvp.timeslot / 1000)}</b>
							<span>
								{m.rsvp_entry({going: rsvp.going_count, maybe: rsvp.maybe_count})}
							</span>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}
{/snippet}

{#snippet memberOverview()}
	{#if !isFortOutdated(data.updated)}
		<IconValue Icon={UsersRound}>
			{m.gym_members()}:
			<b>{GYM_SLOTS - (data.availble_slots ?? 0)}/{GYM_SLOTS}</b>
			<!--			({m.gym_power()}: {data.total_cp})-->
		</IconValue>
	{/if}
{/snippet}

<BasePopup lat={data.lat} lon={data.lon}>
	{#snippet image()}
		<FortImage
			alt={data.name ?? m.pogo_gym()}
			fortUrl={data.url}
			fortIcon={getIconGym(data)}
			fortName={data.name}
			fortDescription={data.description}
		/>
	{/snippet}

	{#snippet title()}
		<div class="text-lg font-semibold tracking-tight">
			<span>
				{#if data.name}
					{data.name}
				{:else}
					{m.unknown_gym()}
				{/if}
			</span>
		</div>
	{/snippet}

	{#snippet description()}
		{@render raidDisplay(false)}
		{@render memberOverview()}

		{#if isFortOutdated(data.updated)}
			<IconValue Icon={ClockAlert}>
				{m.outdated_message()}
			</IconValue>
		{/if}
	{/snippet}

	{#snippet content()}
		<div class="[&>*:last-child]:mb-3">
			{@render raidDisplay(true)}
			{@render memberOverview()}
			{#if !isFortOutdated(data.updated) && defenders}
				<GymDefenderOverview defenders={defenders} />
			{/if}

			{#if data.ar_scan_eligible}
				<IconValue Icon={Smartphone}>
					{m.ar_scannable()}
				</IconValue>
			{/if}

			{#if data.ex_raid_eligible}
				<IconValue Icon={Trees}>
					{m.ex_gym()}
				</IconValue>
			{/if}

			<FortPowerUp
				points={data.power_up_points}
				level={data.power_up_level}
				endTimestamp={data.power_up_end_timestamp}
				updated={data.updated}
			/>
		</div>

		<UpdatedTimes
			updated={data.updated}
			lastModified={data.last_modified_timestamp}
			firstSeen={data.first_seen_timestamp}
		/>
	{/snippet}
</BasePopup>
