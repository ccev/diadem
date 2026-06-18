<script lang="ts">
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import { mQuest } from "@/lib/services/ingameLocale";
	import type { PokestopData, QuestData, QuestReward } from "@/lib/types/mapObjectData/pokestop";
	import { getIconReward } from "@/lib/services/uicons.svelte.js";
	import * as m from "@/lib/paraglide/messages";
	import PokestopSection from "@/components/ui/popups/pokestop/PokestopSection.svelte";
	import IconValue from "@/components/ui/popups/common/IconValue.svelte";
	import { Clock } from "lucide-svelte";

	import { timestampToLocalTime } from "@/lib/utils/timestampToLocalTime";
	import { getRewardText } from "@/lib/utils/pokestopUtils";
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
	<PokestopSection titleParts={[m.pogo_quest(), rewardText]}>
		<div class="flex gap-2 items-center ">
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
			<span>
				{taskText}
			</span>
				{#if expanded}
					<IconValue Icon={Clock}>
						{m.popup_found()} <b>{timestampToLocalTime(quest.timestamp, true)}</b>
					</IconValue>
				{/if}
			</div>
		</div>
	</PokestopSection>
{/if}
