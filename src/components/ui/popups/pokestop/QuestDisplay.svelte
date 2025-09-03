<script lang="ts">
	import ImagePopup from '@/components/ui/popups/common/ImagePopup.svelte';
	import { mQuest } from '@/lib/services/ingameLocale';
	import type { QuestReward } from '@/lib/types/mapObjectData/pokestop';
	import { getIconReward } from '@/lib/services/uicons.svelte.js';
	import * as m from '@/lib/paraglide/messages';
	import PokestopSection from '@/components/ui/popups/pokestop/PokestopSection.svelte';
	import IconValue from '@/components/ui/popups/common/IconValue.svelte';
	import { CircleAlert, Clock } from 'lucide-svelte';

	import { timestampToLocalTime } from '@/lib/utils/timestampToLocalTime';
	import { getArTag, getRewardText, parseQuestReward } from '@/lib/utils/pokestopUtils';

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
	} = $props();

	let reward: QuestReward | undefined = $derived(parseQuestReward(questRewards));
	let taskText: string = $derived(mQuest(questTitle, questTarget));
	let rewardText: string = $derived.by(() => {
		if (!reward) return '';
		return getRewardText(reward);
	});
</script>

{#if questTarget}
	<PokestopSection>
		<div class="w-7 h-7 shrink-0">
			{#if reward}
				<ImagePopup
					src={getIconReward(reward)}
					alt={rewardText}
					class="w-7 h-7"
				/>
			{/if}
		</div>
		<div>
			{#if !expanded}
			<span class="text-sm font-semibold border-border border rounded-full px-3 mr-1 py-1 whitespace-nowrap">
				{getArTag(isAr)}
			</span>
			<span>
				{taskText}
			</span>
			{:else}
			<span>
				<b>{rewardText}</b> · {taskText}
			</span>
				<IconValue Icon={Clock}>
					{m.popup_found()} <b>{timestampToLocalTime(questTimestamp, true)}</b>
				</IconValue>
				<IconValue Icon={CircleAlert}>
					{#if isAr}
						{m.quest_ar_notice()}
					{:else}
						{m.quest_noar_notice()}
					{/if}
				</IconValue>
			{/if}
		</div>
	</PokestopSection>
{/if}