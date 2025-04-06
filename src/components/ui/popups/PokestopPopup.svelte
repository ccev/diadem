<script lang="ts">
	import type { PokestopData } from '@/lib/types/mapObjectData/pokestop';
	import BasePopup from '@/components/ui/popups/BasePopup.svelte';
	import { getIconInvasion, getIconItem, getIconPokemon, getIconPokestop, getIconReward } from '@/lib/uicons.svelte';
	import ImagePopup from '@/components/ui/popups/ImagePopup.svelte';
	import * as m from '@/lib/paraglide/messages';
	import CommonFortImage from '@/components/ui/popups/CommonFortImage.svelte';
	import { ingame, pokemonName } from '@/lib/ingameLocale';
	import { currentTimestamp, timestampToLocalTime } from '@/lib/utils.svelte';
	import TimeWithCountdown from '@/components/ui/popups/TimeWithCountdown.svelte';
	import {
		hasFortActiveLure,
		isFortOutdated,
		isIncidentContest,
		isIncidentInvasion,
		isIncidentKecleon
	} from '@/lib/pogoUtils';
	import type { PokemonData } from '@/lib/types/mapObjectData/pokemon';
	import { getCurrentSelectedData, getMapObjects } from '@/lib/mapObjects/mapObjects.svelte';
	import CommonUpdatedTimes from '@/components/ui/popups/CommonUpdatedTimes.svelte';
	import CommonFortPowerUp from '@/components/ui/popups/CommonFortPowerUp.svelte';
	import { getConfig } from '@/lib/config';
	import { ClockAlert, Smartphone } from 'lucide-svelte';
	import IconValue from '@/components/ui/popups/IconValue.svelte';
	import type { GymData } from '@/lib/types/mapObjectData/gym';

	let { mapId } : { mapId: string } = $props()
	let data: PokestopData = $derived(getMapObjects()[mapId] as PokestopData ?? getCurrentSelectedData() as PokestopData)

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

{#snippet questSection(questTitle: string, questRewards: string, quest_target: number, isAr: boolean)}
	{@const reward = JSON.parse(questRewards)[0]}

	<div class="py-2 flex items-center gap-2 border-border border-b group-last:mb-2">
		<div class="w-7 h-7 flex-shrink-0">
			<ImagePopup
				src={getIconReward(reward)}
				alt="TBD"
				class="w-7 h-7"
			/>
		</div>
		<span class="text-sm font-semibold border-border border rounded-full px-3 py-1 whitespace-nowrap">
			{#if isAr}
				{m.quest_ar_tag()}
			{:else}
				{m.quest_noar_tag()}
			{/if}
		</span>
		<span>
			{ingame("quest_title_" + questTitle).replaceAll("%{amount_0}", quest_target)}
		</span>
	</div>
{/snippet}

{#snippet lureSection()}
	{#if hasFortActiveLure(data)}
		<div class="py-2 flex items-center gap-2 border-border border-b group-last:mb-2">
			<div class="w-7 h-7 flex-shrink-0">
				<ImagePopup
					src={getIconItem(data.lure_id)}
					alt="TBD"
					class="w-7"
				/>
			</div>
			<div>
				<span>
					{ingame("item_" + data.lure_id)}
				</span>
				<TimeWithCountdown
					expireTime={data.lure_expire_timestamp}
					showHours={false}
				/>
				<!--TODO: show verified lure time-->
			</div>
		</div>
	{/if}
{/snippet}

{#snippet incidentSection()}
	{#each data.incident as incident}
		{#if incident.id && incident.expiration > currentTimestamp()}
			{#if isIncidentInvasion(incident)}
				<div class="py-2 flex items-center gap-2 border-border border-b">
					<div class="w-7 h-7 flex-shrink-0">
						<ImagePopup
							src={getIconInvasion(incident)}
							alt="TBD"
							class="w-7"
						/>
					</div>

					<div>
						<span>
							{ingame("grunt_a_" + incident.character)}

							{#if incident.confirmed}
								({m.confirmed()})
							{/if}
						</span>

						<TimeWithCountdown
							expireTime={incident.expiration}
							showHours={incident.display_type !== 1}
						/>
					</div>
				</div>
			{:else if isIncidentKecleon(incident)}
				<div class="py-2 flex items-center gap-2 border-border border-b group-last:mb-2">
					<div class="w-7 h-7 flex-shrink-0">
						<ImagePopup
							src={getIconPokemon({ pokemon_id: 352 })}
							alt={pokemonName(352)}
							class="w-7"
						/>
					</div>
					<div>
						<span class="mr-1">
							{pokemonName(352)}
						</span>
						<TimeWithCountdown
							expireTime={incident.expiration}
							showHours={false}
						/>
					</div>
				</div>
			{:else if isIncidentContest(incident)}
				<div class="py-2 flex items-center gap-2 border-border border-b group-last:mb-2">
					Contest
					<TimeWithCountdown
						expireTime={incident.expiration}
						showHours={true}
					/>
				</div>
			{/if}
		{/if}
	{/each}
{/snippet}

<BasePopup lat={data.lat} lon={data.lon}>
	{#snippet image()}
		<CommonFortImage
			alt={data.name ?? m.pogo_pokestop()}
			fortUrl={data.url}
			fortIcon={getIconPokestop(data)}
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
					{m.unknown_pokestop()}
				{/if}
			</span>
		</div>
	{/snippet}

	{#snippet description()}
		<div class="[&>*:last-child]:border-none [&>*:last-child]:pb-0">
			{#if data.quest_target}
				{@render questSection(data.quest_title ?? "", data.quest_rewards ?? "[]", data.quest_target ?? 0, true)}
			{/if}
			{#if data.alternative_quest_target}
				{@render questSection(data.alternative_quest_title ?? "", data.alternative_quest_rewards ?? "[]", data.alternative_quest_target ?? 0, false)}
			{/if}

			{@render lureSection()}
			{@render incidentSection()}
		</div>

		{#if isFortOutdated(data.updated)}
			<IconValue Icon={ClockAlert}>
				{m.outdated_message()}
			</IconValue>
		{/if}
	{/snippet}

	{#snippet content()}
		<div class="[&>*:last-child]:mb-2">
			{#if data.quest_target}
				{@render questSection(data.quest_title ?? "", data.quest_rewards ?? "[]", data.quest_target ?? 0, true)}
			{/if}
			{#if data.alternative_quest_target}
				{@render questSection(data.alternative_quest_title ?? "", data.alternative_quest_rewards ?? "[]", data.alternative_quest_target ?? 0, false)}
			{/if}

			{@render lureSection()}
			{@render incidentSection()}
		</div>

		<div class="[&>*:last-child]:mb-3">
			{#if data.ar_scan_eligible}
				<IconValue Icon={Smartphone}>
					{m.ar_scannable()}
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
