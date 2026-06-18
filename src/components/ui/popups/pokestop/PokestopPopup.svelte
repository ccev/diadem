<script lang="ts">
	import type { PokestopData } from "@/lib/types/mapObjectData/pokestop";
	import BasePopup from "@/components/ui/popups/BasePopup.svelte";
	import { getIconItem, getIconPokemon, getIconPokestop } from "@/lib/services/uicons.svelte.js";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import * as m from "@/lib/paraglide/messages";
	import FortImage from "@/components/ui/popups/common/FortImage.svelte";
	import { mItem, mPokemon } from "@/lib/services/ingameLocale";
	import TimeWithCountdown from "@/components/ui/popups/common/TimeWithCountdown.svelte";
	import { getMapObjects } from "@/lib/mapObjects/mapObjectsState.svelte.js";
	import UpdatedTimes from "@/components/ui/popups/common/UpdatedTimes.svelte";
	import { getConfig } from "@/lib/services/config/config";
	import { ClockAlert, Crown, Sparkles } from "lucide-svelte";
	import IconValue from "@/components/ui/popups/common/IconValue.svelte";
	import QuestDisplay from "@/components/ui/popups/pokestop/QuestDisplay.svelte";
	import PokestopSection from "@/components/ui/popups/pokestop/PokestopSection.svelte";
	import ContestDisplay from "@/components/ui/popups/pokestop/ContestDisplay.svelte";
	import InvasionDisplay from "@/components/ui/popups/pokestop/InvasionDisplay.svelte";
	import {
		getCurrentSelectedData,
		getCurrentSelectedMapId
	} from "@/lib/mapObjects/currentSelectedState.svelte";

	import { currentTimestamp } from "@/lib/utils/currentTimestamp";
	import {
		hasFortActiveLure,
		isIncidentContest,
		isIncidentInvasion,
		isIncidentKecleon,
		KECLEON_ID
	} from "@/lib/utils/pokestopUtils";
	import { isFortOutdated } from "@/lib/utils/gymUtils";
	import { formatRatio } from "@/lib/utils/numberFormat";
	import { getRarityLabel } from "@/lib/utils/pokemonUtils";
	import StatsDisplay from "@/components/ui/popups/common/StatsDisplay.svelte";
	import {
		shouldDisplayContest,
		shouldDisplayIncident,
		shouldDisplayLure
	} from "@/lib/features/filterLogic/pokestop";
	import { useMetadata } from "@/lib/ui/metadata.svelte";

	let data: PokestopData = $derived(
		(getMapObjects()[getCurrentSelectedMapId()] as PokestopData) ??
			(getCurrentSelectedData() as PokestopData)
	);
	useMetadata(() => ({ title: data ? (data.name ?? m.pogo_pokestop()) : undefined }));
</script>

{#snippet lureSection()}
	{#if shouldDisplayLure(data)}
		<PokestopSection titleParts={[mItem(data.lure_id)]}>
			<div class="flex items-center gap-2">
				<div class="w-7 h-7 shrink-0">
					<ImagePopup src={getIconItem(data.lure_id ?? 0)} alt="TBD" class="w-7" />
				</div>
				<div>
				<span>
					{m.lasts_until()}:
				</span>
					<TimeWithCountdown expireTime={data.lure_expire_timestamp} showHours={false} />
					<!--TODO: show verified lure time-->
				</div>
			</div>
		</PokestopSection>
	{/if}
{/snippet}

{#snippet incidentSection(expanded: boolean)}
	{#each data.incident as incident}
		{#if incident.id && incident.expiration > currentTimestamp() && shouldDisplayIncident(incident, data)}
			{#if isIncidentInvasion(incident)}
				<InvasionDisplay {expanded} {incident} />
			{:else if isIncidentKecleon(incident)}
				<PokestopSection titleParts={[m.kecleon()]}>
					<div class="flex gap-2 items-center">
						<div class="w-7 h-7 shrink-0">
							<ImagePopup
								src={getIconPokemon({ pokemon_id: KECLEON_ID })}
								alt={mPokemon({ pokemon_id: KECLEON_ID })}
								class="w-7"
							/>
						</div>
						<div>
							{m.lasts_until()}:
							<TimeWithCountdown expireTime={incident.expiration} showHours={false} />
						</div>
					</div>

				</PokestopSection>
			{:else if isIncidentContest(incident)}
				<ContestDisplay {expanded} {incident} {data} />
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

	{#snippet descriptionBelow()}
		<div class="space-y-1.5">
			{#if data.quests[0]}
				<QuestDisplay expanded={false} quest={data.quests[0]} pokestop={data} />
			{/if}

			{@render lureSection()}
			{@render incidentSection(false)}
		</div>
	{/snippet}

	{#snippet description()}
		{#if isFortOutdated(data.updated)}
			<IconValue Icon={ClockAlert}>
				{m.outdated_message()}
			</IconValue>
		{/if}
	{/snippet}

	{#snippet content()}
		<div class="space-y-1.5">
			{#if data.quests[0]}
				<QuestDisplay expanded={true} quest={data.quests[0]} pokestop={data} />
			{/if}

			{@render lureSection()}
			{@render incidentSection(true)}
		</div>

		<div class="[&>*:last-child]:mb-3"></div>

		<UpdatedTimes
			updated={data.updated}
			lastModified={data.last_modified_timestamp}
			firstSeen={data.first_seen_timestamp}
		/>
	{/snippet}
</BasePopup>
