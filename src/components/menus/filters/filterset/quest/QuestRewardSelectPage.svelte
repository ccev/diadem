<script lang="ts">
	import type { FiltersetQuest } from "@/lib/features/filters/filtersets";
	import { getQuestRewards } from "@/lib/features/masterStats.svelte";
	import { getRewardText, rewardTypeLabel, type RewardType } from "@/lib/utils/pokestopUtils";
	import * as m from "@/lib/paraglide/messages";
	import { getIconReward } from "@/lib/services/uicons.svelte";
	import { resize } from "@/lib/services/assets";
	import MultiSelect from "@/components/menus/filters/filterset/multiselect/MultiSelect.svelte";
	import MultiSelectItem from "@/components/menus/filters/filterset/multiselect/MultiSelectItem.svelte";
	import type { QuestReward } from "@/lib/types/mapObjectData/pokestop";
	import type { QuestReward as FilterReward } from "@/lib/features/filters/filtersets";

	type Attribute = "item" | "megaResource" | "candy" | "xlCandy";

	let {
		data,
		attribute,
		rewardType,
		rewardTypes = [rewardType],
		getId
	}: {
		data: FiltersetQuest;
		attribute: Attribute;
		rewardType: RewardType;
		rewardTypes?: RewardType[];
		getId: (info: QuestReward["info"]) => string;
	} = $props();

	type RewardInfo = QuestReward["info"] & { amount?: number };
	const rewards = $derived(
		rewardTypes.flatMap((type) => getQuestRewards(type)).sort((a, b) => {
			const aInfo = a.reward.info as RewardInfo;
			const bInfo = b.reward.info as RewardInfo;
			const aId = getId(aInfo);
			const bId = getId(bInfo);
			return (
				aId.localeCompare(bId, undefined, { numeric: true }) ||
				(aInfo.amount ?? 0) - (bInfo.amount ?? 0)
			);
		})
	);

	function getKey(id: string | number, amount: number | undefined) {
		return `${id}-${amount}`;
	}

	function isSelected(reward: QuestReward) {
		const info = reward.info as RewardInfo;
		const key = getKey(getId(info), info.amount);
		return data[attribute]?.some((r) => getKey(r.id, r.amount) === key) ?? false;
	}

	function onselect(reward: QuestReward, selected: boolean) {
		const info = reward.info as RewardInfo;
		let filterReward: FilterReward = { id: getId(info) };
		if (info.amount !== undefined) filterReward.amount = info.amount;

		if (selected) {
			if (!data[attribute]) data[attribute] = [];
			data[attribute]!.push(filterReward);
		} else {
			const key = getKey(getId(info), info.amount);
			data[attribute] = data[attribute]?.filter((r) => getKey(r.id, r.amount) !== key);
		}

		if (data[attribute]?.length === 0) delete data[attribute];
	}
</script>

{#if rewards.length > 0}
	<MultiSelect>
		{#each rewards as reward (getKey(getId(reward.reward.info as RewardInfo), (reward.reward.info as RewardInfo).amount))}
			{@const selected = isSelected(reward.reward)}

			<MultiSelectItem isSelected={selected} onclick={(value) => onselect(reward.reward, value)}>
				<img
					class="w-8"
					alt={getRewardText(reward.reward)}
					src={resize(getIconReward(reward.reward.type, reward.reward.info), { width: 64 })}
					loading="lazy"
				/>
				<div class="grow text-center align-middle flex items-center px-1">
					<span class="h-fit">
						{getRewardText(reward.reward)}
					</span>
				</div>
			</MultiSelectItem>
		{/each}
	</MultiSelect>
{:else}
	<p class="text-muted-foreground">
		{m.quest_reward_none_available({ reward: rewardTypeLabel(rewardType).toLowerCase() })}
	</p>
{/if}
