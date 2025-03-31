<script lang="ts">
	import type { PokestopData, QuestReward } from '@/lib/types/mapObjectData/pokestop';
	import BasePopup from '@/components/ui/popups/BasePopup.svelte';
	import { getIconInvasion, getIconPokemon, getIconPokestop, getIconReward } from '@/lib/uicons.svelte';
	import ImagePopup from '@/components/ui/popups/ImagePopup.svelte';
	import * as m from "@/lib/paraglide/messages"
	import ImageFort from '@/components/ui/popups/ImageFort.svelte';
	import { ingame } from '@/lib/ingameLocale';
	import Countdown from '@/components/utils/Countdown.svelte';
	import { currentTimestamp, timestampToLocalTime } from '@/lib/utils.svelte';
	import TimeWithCountdown from '@/components/ui/popups/TimeWithCountdown.svelte';

	let {data} : {data: PokestopData} = $props()

	function getRewardIcon(questReward: QuestReward) {
		if (questReward.type === 7) return getIconPokemon(questReward.info)

		return getIconPokemon({ pokemon_id: 0 })
	}

	$inspect(data)
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
			{#if data.quest_target}
				{@render questSection(data.quest_title ?? "", data.quest_rewards ?? "[]", data.quest_target ?? 0, true)}
			{/if}
			{#if data.alternative_quest_target}
				{@render questSection(data.alternative_quest_title ?? "", data.alternative_quest_rewards ?? "[]", data.alternative_quest_target ?? 0, false)}
			{/if}

			{#each data.incident as incident}
				{#if incident.id && incident.expiration > currentTimestamp()}
					{#if [1, 2, 3].includes(incident.display_type)}
						<!--Team Rocket-->
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
					{:else if incident.display_type === 8}
						<!--Kecleon-->
						<div class="py-2 flex items-center gap-2">
							<div class="w-7 h-7 flex-shrink-0">
								<ImagePopup
									src={getIconPokemon({ pokemon_id: 352 })}
									alt={ingame("poke_352")}
									class="w-7"
								/>
							</div>
							<div>
								<span class="mr-1">
									{ingame("poke_352")}
								</span>
								<TimeWithCountdown
									expireTime={incident.expiration}
									showHours={false}
								/>
							</div>
						</div>
					{:else if incident.display_type === 9}
						<!--Contest -->
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
</BasePopup>
