<script lang="ts">
	import type { PokestopData } from '@/lib/types/mapObjectData/pokestop';
	import BasePopup from '@/components/ui/popups/BasePopup.svelte';
	import { getIconInvasion, getIconItem, getIconPokemon, getIconPokestop, getIconReward } from '@/lib/uicons.svelte';
	import ImagePopup from '@/components/ui/popups/ImagePopup.svelte';
	import * as m from '@/lib/paraglide/messages';
	import ImageFort from '@/components/ui/popups/ImageFort.svelte';
	import { ingame, pokemonName } from '@/lib/ingameLocale';
	import { currentTimestamp } from '@/lib/utils.svelte';
	import TimeWithCountdown from '@/components/ui/popups/TimeWithCountdown.svelte';
	import { isIncidentContest, isIncidentInvasion, isIncidentKecleon } from '@/lib/pogoUtils';

	let {data} : {data: PokestopData} = $props()
</script>

{#snippet questSection(questTitle: string, questRewards: string, quest_target: number, isAr: boolean)}
	{@const reward = JSON.parse(questRewards)[0]}

	<div class="py-2 flex items-center gap-2">
		<div class="w-7 h-7 flex-shrink-0">
			<ImagePopup
				src={getIconReward(reward)}
				alt="TBD"
				class="w-7 h-7"
			/>
		</div>
		<span class="text-sm font-semibold border-border border rounded-full px-3 py-1 whitespace-nowrap">
			{#if isAr}
				AR
			{:else}
				No AR
			{/if}
		</span>
		<span>
			{ingame("quest_title_" + questTitle).replaceAll("%{amount_0}", quest_target)}
		</span>
	</div>
{/snippet}

<BasePopup lat={data.lat} lon={data.lon}>
	{#snippet image()}
		<ImageFort
			alt={data.name ?? m.pogo_pokestop()}
			fortUrl={data.url}
			fortIcon={getIconPokestop(data)}
			fortName={data.name}
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
		<div class="divide-border divide-y">
			{#if data.lure_id && data.lure_expire_timestamp && data.lure_expire_timestamp > currentTimestamp()}
				<div class="py-2 flex items-center gap-2">
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

			{#if data.quest_target}
				{@render questSection(data.quest_title ?? "", data.quest_rewards ?? "[]", data.quest_target ?? 0, true)}
			{/if}
			{#if data.alternative_quest_target}
				{@render questSection(data.alternative_quest_title ?? "", data.alternative_quest_rewards ?? "[]", data.alternative_quest_target ?? 0, false)}
			{/if}

			{#each data.incident as incident}
				{#if incident.id && incident.expiration > currentTimestamp()}
					{#if isIncidentInvasion(incident)}
						<div class="py-2 flex items-center gap-2">
							<div class="w-7 h-7 flex-shrink-0">
								<ImagePopup
									src={getIconInvasion(incident)}
									alt="TBD"
									class="w-7"
								/>
							</div>

							<div>
								<span class="mr-1">
									{ingame("grunt_a_" + incident.character)}

									{#if incident.confirmed}
										(confirmed)
									{/if}
								</span>

								<TimeWithCountdown
									expireTime={incident.expiration}
									showHours={incident.display_type !== 1}
								/>
							</div>
						</div>
					{:else if isIncidentKecleon(incident)}
						<div class="py-2 flex items-center gap-2">
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
						<div class="py-2 flex items-center gap-2">
							Contest
							<TimeWithCountdown
								expireTime={incident.expiration}
								showHours={true}
							/>
						</div>
					{/if}
				{/if}
			{/each}
		</div>
	{/snippet}

	{#snippet content()}
		{#if (data.power_up_points ?? 0) > 0}
			<div>
				Power-Up Level: {data.power_up_level ?? 0} ({data.power_up_points ?? 0} points)
				{#if (data.power_up_level ?? 0) > 0 && data.power_up_end_timestamp}
					<TimeWithCountdown
						expireTime={data.power_up_end_timestamp ?? 0}
						showHours={false}
					/>
				{/if}
			</div>
		{/if}

		{#if data.quest_target}
			{@render questSection(data.quest_title ?? "", data.quest_rewards ?? "[]", data.quest_target ?? 0, true)}
		{/if}
		{#if data.alternative_quest_target}
			{@render questSection(data.alternative_quest_title ?? "", data.alternative_quest_rewards ?? "[]", data.alternative_quest_target ?? 0, false)}
		{/if}
	{/snippet}
</BasePopup>
