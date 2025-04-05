<script lang="ts">
	import type { GymData } from '@/lib/types/mapObjectData/gym';
	import BasePopup from '@/components/ui/popups/BasePopup.svelte';
	import { getIconGym, getIconPokemon, getIconRaidEgg } from '@/lib/uicons.svelte';
	import ImagePopup from '@/components/ui/popups/ImagePopup.svelte';
	import * as m from "@/lib/paraglide/messages"
	import CommonFortImage from '@/components/ui/popups/CommonFortImage.svelte';
	import { currentTimestamp, timestampToLocalTime } from '@/lib/utils.svelte';
	import { ingame, pokemonName } from '@/lib/ingameLocale';
	import Countdown from '@/components/utils/Countdown.svelte';
	import { getRaidPokemon, GYM_SLOTS, isFortOutdated } from '@/lib/pogoUtils';
	import { getMapObjects } from '@/lib/mapObjects/mapObjects.svelte';
	import TimeWithCountdown from '@/components/ui/popups/TimeWithCountdown.svelte';
	import {
		CircleFadingArrowUp,
		Clock,
		ClockAlert,
		ClockArrowUp,
		ScanEye,
		Smartphone,
		Trees,
		UsersRound
	} from 'lucide-svelte';
	import IconValue from '@/components/ui/popups/IconValue.svelte';
	import CommonUpdatedTimes from '@/components/ui/popups/CommonUpdatedTimes.svelte';
	import CommonFortPowerUp from '@/components/ui/popups/CommonFortPowerUp.svelte';
	import { getConfig } from '@/lib/config';

	let { mapId } : { mapId: string } = $props()
	let data: GymData = $derived(getMapObjects()[mapId] as GymData)

	function getTitle() {
		let title = getConfig().general.mapName
		if (data.name) {
			title += " | " + data.name
		} else {
			title += " | " + m.pogo_gym()
		}
		return title
	}
</script>

<svelte:head>
	<title>{getTitle()}</title>
</svelte:head>

{#snippet raidDisplay()}
{#if (data.raid_end_timestamp ?? 0) > currentTimestamp()}
	<div
		class="flex gap-2 items-center border-border border-b pb-2 mb-2"
	>
		{#if data.raid_pokemon_id}
			<div class="w-8 flex-shrink-0">
				<ImagePopup
					src={getIconPokemon(getRaidPokemon(data))}
					alt={pokemonName(data.raid_pokemon_id, data.raid_pokemon_evolution)}
					class="w-8"
				/>
			</div>
		{:else}
			<div class="w-6 mx-1 flex-shrink-0">
				<ImagePopup
					src={getIconRaidEgg(data.raid_level ?? 0)}
					alt={ingame("raid_" + data.raid_level)}
					class="w-6"
				/>
			</div>
		{/if}


		<div>
			<div class="flex gap-1 items-center">
			<span class="font-semibold whitespace-nowrap">
				{ingame("raid_" + data.raid_level) || "Raid"}
			</span>

				{#if data.raid_pokemon_id}
				<span class="whitespace-nowrap">
					· {pokemonName(data.raid_pokemon_id, data.raid_pokemon_evolution)}
				</span>
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
		</div>

	</div>
{/if}
{/snippet}

{#snippet memberOverview()}
	{#if !isFortOutdated(data.updated)}
		<IconValue Icon={UsersRound}>
			{m.gym_members()}:
			<b>{GYM_SLOTS - (data.availble_slots ?? 0)}/{GYM_SLOTS}</b>
			({m.gym_power()}: {data.total_cp})
		</IconValue>
	{/if}
{/snippet}

<BasePopup lat={data.lat} lon={data.lon}>
	{#snippet image()}
		<CommonFortImage
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
		{@render raidDisplay()}
		{@render memberOverview()}

		{#if isFortOutdated(data.updated)}
			<IconValue Icon={ClockAlert}>
				{m.outdated_message()}
			</IconValue>
		{/if}
	{/snippet}

	{#snippet content()}
		<div class="[&>*:last-child]:mb-3">
			{@render raidDisplay()}
			{@render memberOverview()}

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

			<CommonFortPowerUp
				points={data.power_up_points}
				level={data.power_up_level}
				endTimestamp={data.power_up_end_timestamp}
				updated={data.updated}
			/>
		</div>

		<CommonUpdatedTimes
			updated={data.updated}
			lastModified={data.last_modified_timestamp}
			firstSeen={data.first_seen_timestamp}
		/>
	{/snippet}
</BasePopup>
