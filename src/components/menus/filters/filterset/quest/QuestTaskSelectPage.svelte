<script lang="ts">
	import type { FiltersetQuest } from "@/lib/features/filters/filtersets";
	import { getQuestStats } from "@/lib/features/masterStats.svelte";
	import { mQuest } from "@/lib/services/ingameLocale";
	import { getRewardText, RewardType } from "@/lib/utils/pokestopUtils";
	import type { QuestReward } from "@/lib/types/mapObjectData/pokestop";
	import * as m from "@/lib/paraglide/messages";
	import Toggle from "@/components/ui/input/Toggle.svelte";
	import MultiSelect from "@/components/menus/filters/filterset/multiselect/MultiSelect.svelte";
	import MultiSelectItem from "@/components/menus/filters/filterset/multiselect/MultiSelectItem.svelte";
	import { getIconReward } from "@/lib/services/uicons.svelte";
	import { resize } from "@/lib/services/assets";
	import Button from "@/components/ui/input/Button.svelte";
	import Switch from "@/components/ui/input/Switch.svelte";

	let {
		data
	}: {
		data: FiltersetQuest;
	} = $props();

	let onlyMatchingRewards = $state(hasRewardFilter());

	type Task = { title: string; target: number; text: string; rewards: QuestReward[] };

	function getTaskKey(task: { title?: string; target?: number }) {
		return `${task.title}-${task.target}`;
	}

	function hasRewardFilter() {
		return !!(
			data.pokemon ||
			data.item ||
			data.megaResource ||
			data.candy ||
			data.xlCandy ||
			data.stardust ||
			data.xp
		);
	}

	function taskMatchesRewardFilters(questStat: { reward: { type: number; info: any } }) {
		const reward = questStat.reward;

		if (data.pokemon && reward.type === RewardType.POKEMON) {
			if (
				data.pokemon.some(
					(p) => p.pokemon_id === reward.info.pokemon_id && p.form === reward.info.form
				)
			)
				return true;
		}
		if (data.item && reward.type === RewardType.ITEM) {
			if (
				data.item.some(
					(i) =>
						i.id === String(reward.info.item_id) &&
						(i.amount === undefined || i.amount === reward.info.amount)
				)
			)
				return true;
		}
		if (data.megaResource && reward.type === RewardType.MEGA_ENERGY) {
			if (
				data.megaResource.some(
					(i) =>
						i.id === String(reward.info.pokemon_id) &&
						(i.amount === undefined || i.amount === reward.info.amount)
				)
			)
				return true;
		}
		if (data.candy && reward.type === RewardType.CANDY) {
			if (
				data.candy.some(
					(i) =>
						i.id === String(reward.info.pokemon_id) &&
						(i.amount === undefined || i.amount === reward.info.amount)
				)
			)
				return true;
		}
		if (data.xlCandy && reward.type === RewardType.XL_CANDY) {
			if (
				data.xlCandy.some(
					(i) =>
						i.id === String(reward.info.pokemon_id) &&
						(i.amount === undefined || i.amount === reward.info.amount)
				)
			)
				return true;
		}
		if (data.stardust && reward.type === RewardType.STARDUST) {
			if (reward.info.amount >= data.stardust.min && reward.info.amount <= data.stardust.max)
				return true;
		}
		if (data.xp && reward.type === RewardType.XP) {
			if (reward.info.amount >= data.xp.min && reward.info.amount <= data.xp.max) return true;
		}

		return false;
	}

	const allStats = getQuestStats();

	function buildTasks(filterByReward: boolean): Task[] {
		const taskMap = new Map<string, Task>();

		for (const stat of allStats) {
			if (filterByReward && hasRewardFilter() && !taskMatchesRewardFilters(stat)) continue;

			const key = getTaskKey(stat);
			const existing = taskMap.get(key);
			if (existing) {
				existing.rewards.push(stat.reward);
			} else {
				taskMap.set(key, {
					title: stat.title,
					target: stat.target,
					text: mQuest(stat.title, stat.target),
					rewards: [stat.reward]
				});
			}
		}

		return [...taskMap.values()].sort((a, b) => a.text.localeCompare(b.text));
	}

	let tasks: Task[] = $state(buildTasks(hasRewardFilter()));

	function onselect(task: Task, selected: boolean) {
		if (selected) {
			if (!data.tasks) data.tasks = [];
			data.tasks.push(task);
		} else {
			const key = getTaskKey(task);
			data.tasks = data.tasks?.filter((t) => getTaskKey(t) !== key);
		}

		if (data.tasks?.length === 0) delete data.tasks;
	}
</script>

{#if hasRewardFilter()}
	<div class="">
		<Button
			variant="ghost"
			size=""
			class="px-4 pl-2 py-3 mb-2 gap-3 rounded-md"
			onclick={() => {
				onlyMatchingRewards = !onlyMatchingRewards;
				tasks = buildTasks(onlyMatchingRewards);
			}}
		>
			<Switch checked={onlyMatchingRewards} aria-hidden="true" tabindex={-1} />
			<span>
				{m.quest_tasks_only_matching_rewards()}
			</span>
		</Button>
	</div>
{/if}

<MultiSelect class="grid-cols-1! text-sm! font-medium! *:items-start *:py-3 *:px-4">
	{#each tasks as task (getTaskKey(task))}
		{@const selected = data.tasks?.find((t) => t.target === task.target && t.title === task.title)}
		<MultiSelectItem isSelected={!!selected} onclick={() => onselect(task, !selected)}>
			<div>
				<p class="text-left">{task.text}</p>
				<div class="flex flex-wrap gap-1 mt-1">
					{#each task.rewards as reward}
						<img
							class="h-7"
							alt={getRewardText(reward)}
							title={getRewardText(reward)}
							src={resize(getIconReward(reward.type, reward.info), { width: 64 })}
							loading="lazy"
						/>
					{/each}
				</div>
			</div>
		</MultiSelectItem>
	{/each}
</MultiSelect>
