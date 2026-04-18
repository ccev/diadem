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
		getId
	}: {
		data: FiltersetQuest;
		attribute: Attribute;
		rewardType: RewardType;
		getId: (info: Reward["info"]) => string;
	} = $props();

	type Reward = Extract<QuestReward, { type: typeof rewardType }>;
	const rewards = $derived(
		getQuestRewards(rewardType).sort((a, b) => {
			const aId = getId(a.reward.info);
			const bId = getId(b.reward.info);
			return (
				aId.localeCompare(bId, undefined, { numeric: true }) ||
				(a.reward.info.amount ?? 0) - (b.reward.info.amount ?? 0)
			);
		})
	);

	function getKey(id: string | number, amount: number | undefined) {
		return `${id}-${amount}`;
	}

	function isSelected(reward: Reward) {
		const key = getKey(getId(reward.info), reward.info.amount);
		return data[attribute]?.some((r) => getKey(r.id, r.amount) === key) ?? false;
	}

	function onselect(reward: Reward, selected: boolean) {
		let filterReward: FilterReward = { id: getId(reward.info) };
		if (reward.info.amount !== undefined) filterReward.amount = reward.info.amount;

		if (selected) {
			if (!data[attribute]) data[attribute] = [];
			data[attribute]!.push(filterReward);
		} else {
			const key = getKey(getId(reward.info), reward.info.amount);
			data[attribute] = data[attribute]?.filter((r) => getKey(r.id, r.amount) !== key);
		}

		if (data[attribute]?.length === 0) delete data[attribute];
	}
</script>

{#if rewards.length > 0}
	<MultiSelect>
		{#each rewards as reward (getKey(getId(reward.reward.info), reward.reward.info.amount))}
			{@const selected = isSelected(reward.reward)}

			<MultiSelectItem isSelected={selected} onclick={(value) => onselect(reward.reward, value)}>
				<img
					class="w-8"
					alt={getRewardText(reward.reward)}
					src={resize(getIconReward(rewardType, reward.reward.info), { width: 64 })}
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
