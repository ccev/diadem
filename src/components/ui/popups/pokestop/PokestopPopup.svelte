<script lang="ts">
	import type { PokestopData } from '@/lib/types/mapObjectData/pokestop';
	import BasePopup from '@/components/ui/popups/BasePopup.svelte';
	import { getIconInvasion, getIconItem, getIconPokemon, getIconPokestop } from '@/lib/services/uicons.svelte.js';
	import ImagePopup from '@/components/ui/popups/common/ImagePopup.svelte';
	import * as m from '@/lib/paraglide/messages';
	import FortImage from '@/components/ui/popups/common/FortImage.svelte';
	import { mCharacter, mItem, mPokemon } from '@/lib/services/ingameLocale';
	import TimeWithCountdown from '@/components/ui/popups/common/TimeWithCountdown.svelte';
	import { getMapObjects } from '@/lib/mapObjects/mapObjectsState.svelte.js';
	import UpdatedTimes from '@/components/ui/popups/common/UpdatedTimes.svelte';
	import FortPowerUp from '@/components/ui/popups/common/FortPowerUp.svelte';
	import { getConfig } from '@/lib/services/config/config';
	import { ClockAlert, Smartphone } from 'lucide-svelte';
	import IconValue from '@/components/ui/popups/common/IconValue.svelte';
	import QuestDisplay from '@/components/ui/popups/pokestop/QuestDisplay.svelte';
	import PokestopSection from '@/components/ui/popups/pokestop/PokestopSection.svelte';
	import ContestDisplay from '@/components/ui/popups/pokestop/ContestDisplay.svelte';
	import { getCurrentSelectedData } from '@/lib/mapObjects/currentSelectedState.svelte';

	import { currentTimestamp } from '@/lib/utils/currentTimestamp';
	import Metadata from '@/components/utils/Metadata.svelte';
	import {
		hasFortActiveLure,
		isIncidentContest,
		isIncidentInvasion,
		isIncidentKecleon
	} from '@/lib/utils/pokestopUtils';
	import { isFortOutdated } from '@/lib/utils/gymUtils';

	let { mapId } : { mapId: string } = $props()
	let data: PokestopData = $derived(getMapObjects()[mapId] as PokestopData ?? getCurrentSelectedData() as PokestopData)
</script>

<svelte:head>
	<Metadata title={data.name ?? m.pogo_pokestop()} />
</svelte:head>

{#snippet lureSection()}
	{#if hasFortActiveLure(data)}
		<PokestopSection>
			<div class="w-7 h-7 shrink-0">
				<ImagePopup
					src={getIconItem(data.lure_id ?? 0)}
					alt="TBD"
					class="w-7"
				/>
			</div>
			<div>
				<span>
					{mItem(data.lure_id)}
				</span>
				<TimeWithCountdown
					expireTime={data.lure_expire_timestamp}
					showHours={false}
				/>
				<!--TODO: show verified lure time-->
			</div>
		</PokestopSection>
	{/if}
{/snippet}

{#snippet incidentSection(expanded: boolean)}
	{#each data.incident as incident}
		{#if incident.id && incident.expiration > currentTimestamp()}
			{#if isIncidentInvasion(incident)}
				<PokestopSection>
					<div class="w-7 h-7 shrink-0">
						<ImagePopup
							src={getIconInvasion(incident)}
							alt="TBD"
							class="w-7"
						/>
					</div>

					<div>
						<span>
							{mCharacter(incident.character)}

							{#if incident.confirmed}
								({m.confirmed()})
							{/if}
						</span>

						<TimeWithCountdown
							expireTime={incident.expiration}
							showHours={incident.display_type !== 1}
						/>
					</div>
				</PokestopSection>
			{:else if isIncidentKecleon(incident)}
				<PokestopSection>
					<div class="w-7 h-7 shrink-0">
						<ImagePopup
							src={getIconPokemon({ pokemon_id: 352 })}
							alt={mPokemon({ pokemon_id: 352 })}
							class="w-7"
						/>
					</div>
					<div>
						{mPokemon({ pokemon_id: 352 })}
						<TimeWithCountdown
							expireTime={incident.expiration}
							showHours={false}
						/>
					</div>
				</PokestopSection>
			{:else if isIncidentContest(incident)}
				<ContestDisplay
					{expanded}
					{incident}
					{data}
				/>
			{/if}
		{/if}
	{/each}
{/snippet}

<BasePopup lat={data.lat} lon={data.lon}>
	{#snippet image()}
		<FortImage
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
			<QuestDisplay
				expanded={false}
				isAr={true}
				questRewards={data.quest_rewards}
				questTitle={data.quest_title}
				questTarget={data.quest_target}
				questTimestamp={data.quest_timestamp}
			/>
			<QuestDisplay
				expanded={false}
				isAr={false}
				questRewards={data.alternative_quest_rewards}
				questTitle={data.alternative_quest_title}
				questTarget={data.alternative_quest_target}
				questTimestamp={data.alternative_quest_timestamp}
			/>

			{@render lureSection()}
			{@render incidentSection(false)}
		</div>

		{#if isFortOutdated(data.updated)}
			<IconValue Icon={ClockAlert}>
				{m.outdated_message()}
			</IconValue>
		{/if}
	{/snippet}

	{#snippet content()}
		<div class="[&>*:last-child]:mb-2">
			<QuestDisplay
				expanded={true}
				isAr={true}
				questRewards={data.quest_rewards}
				questTitle={data.quest_title}
				questTarget={data.quest_target}
				questTimestamp={data.quest_timestamp}
			/>
			<QuestDisplay
				expanded={true}
				isAr={false}
				questRewards={data.alternative_quest_rewards}
				questTitle={data.alternative_quest_title}
				questTarget={data.alternative_quest_target}
				questTimestamp={data.alternative_quest_timestamp}
			/>

			{@render lureSection()}
			{@render incidentSection(true)}
		</div>

		<div class="[&>*:last-child]:mb-3">
			{#if data.ar_scan_eligible}
				<IconValue Icon={Smartphone}>
					{m.ar_scannable()}
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
