<script lang="ts">
	import ImagePopup from '@/components/ui/popups/common/ImagePopup.svelte';
	import { mItem, mPokemon, mQuest } from '@/lib/ingameLocale';
	import type { QuestReward } from '@/lib/types/mapObjectData/pokestop';
	import { getIconPokemon, getIconReward } from '@/lib/uicons.svelte';
	import * as m from '@/lib/paraglide/messages';
	import { timestampToLocalTime } from '@/lib/utils.svelte';
	import PokestopSection from '@/components/ui/popups/pokestop/PokestopSection.svelte';
	import IconValue from '@/components/ui/popups/common/IconValue.svelte';
	import { CircleAlert, Clock, Gift, TriangleAlert } from 'lucide-svelte';

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

	let reward: QuestReward | undefined = $derived(JSON.parse(questRewards ?? "[]")[0] as QuestReward)
	let taskText: string = $derived(mQuest(questTitle, questTarget))
	let rewardText: string = $derived.by(() => {
		if (!reward) return ""

		switch (reward.type) {
			case 1:
				return m.quest_xp({ count: reward.info.amount })
			case 2:
				return m.quest_item({ count: reward.info.amount, item: mItem(reward.info.item_id) })
			case 3:
				return m.quest_stardust({ count: reward.info.amount })
			case 4:
				return m.quest_candy({ count: reward.info.amount, pokemon: mPokemon(reward.info) })
			case 5:
				return "Avatar Clothing"
			case 6:
				return "Quest"
			case 7:
				return mPokemon(reward.info)
			case 8:
				return "Pokecoins"
			case 9:
				return m.quest_xl_candy({
					count: reward.info.amount,
					pokemon: mPokemon(reward.info)
				})
			case 10:
				return "Level Cap"
			case 11:
				return "Sticker"
			case 12:
				return m.quest_mega_resource({
					count: reward.info.amount,
					pokemon: mPokemon(reward.info)
				})
				break
			case 13:
				return "Incdent"
			case 14:
				return "Player Attribute"
			default:
				return ""
		}
	})
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
				{#if isAr}
					{m.quest_ar_tag()}
				{:else}
					{m.quest_noar_tag()}
				{/if}
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