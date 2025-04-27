<script lang="ts">
	import ImagePopup from '@/components/ui/popups/common/ImagePopup.svelte';
	import { ingame } from '@/lib/ingameLocale';
	import type { QuestReward } from '@/lib/types/mapObjectData/pokestop';
	import { getIconReward } from '@/lib/uicons.svelte';
	import * as m from '@/lib/paraglide/messages';
	import { timestampToLocalTime } from '@/lib/utils.svelte';
	import PokestopSection from '@/components/ui/popups/pokestop/PokestopSection.svelte';

	let {
		expanded,
		questRewards,
		isAr,
		questTitle,
		questTarget,
		questTimestamp
	}: {
		expanded: boolean
		isAr: boolean
		questRewards?: string
		questTitle?: string
		questTarget?: number
		questTimestamp?: number
	} = $props()

	let reward: QuestReward = $derived(JSON.parse(questRewards ?? "[]")[0] as QuestReward)
</script>

{#if questTarget}
<PokestopSection>
	<div class="w-7 h-7 shrink-0">
		{#if reward}
			<ImagePopup
				src={getIconReward(reward)}
				alt="TBD"
				class="w-7 h-7"
			/>
		{/if}
	</div>
	<div>
			<span class="text-sm font-semibold border-border border rounded-full px-3 mr-1 py-1 whitespace-nowrap">
				{#if isAr}
					{m.quest_ar_tag()}
				{:else}
					{m.quest_noar_tag()}
				{/if}
			</span>
		<span>
				{ingame("quest_title_" + questTitle).replaceAll("%{amount_0}", "" + (questTarget ?? ""))}
			</span>
		{#if expanded}
			<div>
				Found <b>{timestampToLocalTime(questTimestamp, true)}</b>
			</div>
		{/if}
	</div>
</PokestopSection>
{/if}