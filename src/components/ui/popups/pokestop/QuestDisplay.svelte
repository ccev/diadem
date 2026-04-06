<script lang="ts">
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import { mQuest } from "@/lib/services/ingameLocale";
	import type { PokestopData, QuestData, QuestReward } from "@/lib/types/mapObjectData/pokestop";
	import { getIconReward } from "@/lib/services/uicons.svelte.js";
	import * as m from "@/lib/paraglide/messages";
	import PokestopSection from "@/components/ui/popups/pokestop/PokestopSection.svelte";
	import IconValue from "@/components/ui/popups/common/IconValue.svelte";
	import { CircleAlert, Clock } from "lucide-svelte";

	import { timestampToLocalTime } from "@/lib/utils/timestampToLocalTime";
	import { getArTag, getRewardText } from "@/lib/utils/pokestopUtils";
	import StatsDisplay from "@/components/ui/popups/common/StatsDisplay.svelte";
	import { shouldDisplayQuest } from "@/lib/features/filterLogic/pokestop";

	let {
		expanded,
		quest,
		pokestop
	}: {
		expanded: boolean;
		quest: QuestData;
		pokestop: PokestopData;
	} = $props();

	let taskText: string = $derived(mQuest(quest.title, quest.target));
	let rewardText: string = $derived(getRewardText(quest.reward));
</script>

{#if quest.title && quest.reward && shouldDisplayQuest(quest, pokestop)}
	<PokestopSection>
		<div class="w-7 h-7 shrink-0">
			{#if quest.reward}
				<ImagePopup
					src={getIconReward(quest.reward.type, quest.reward.info)}
					alt={rewardText}
					class="w-7 h-7"
				/>
			{/if}
		</div>
		<div>
			{#if !expanded}
				<span
					class="text-sm font-semibold border-border border rounded-full px-3 mr-1 py-1 whitespace-nowrap"
				>
					{getArTag(quest.isAr)}
				</span>
				<span>
					{taskText}
				</span>
			{:else}
				<span>
					<b>{rewardText}</b> · {taskText}
				</span>
				<IconValue Icon={Clock}>
					{m.popup_found()} <b>{timestampToLocalTime(quest.timestamp, true)}</b>
				</IconValue>
				<IconValue Icon={CircleAlert}>
					{#if quest.isAr}
						{m.quest_ar_notice()}
					{:else}
						{m.quest_noar_notice()}
					{/if}
				</IconValue>
			{/if}
		</div>
	</PokestopSection>
{/if}
