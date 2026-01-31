<script lang="ts">
	import { getQuestRewards } from "@/lib/features/masterStats.svelte";
	import { RewardType } from "@/lib/utils/pokestopUtils";
	import type { FiltersetQuest } from "@/lib/features/filters/filtersets";
	import { mItem, mQuest } from "@/lib/services/ingameLocale";
	import Button from "@/components/ui/input/Button.svelte";
	import { getIconItem } from "@/lib/services/uicons.svelte";
	import * as m from "@/lib/paraglide/messages";
	import { resize } from "@/lib/services/assets";
	import type { QuestReward } from "@/lib/types/mapObjectData/pokestop";
	import { slide } from "svelte/transition";
	import ToggleGroup from "@/components/ui/input/selectgroup/ToggleGroup.svelte";
	import SelectGroupItem from "@/components/ui/input/selectgroup/SelectGroupItem.svelte";
	import { Check } from "lucide-svelte";

	let { data }: { data: FiltersetQuest } = $props();

	let rewards = $derived(getQuestRewards(RewardType.ITEM).sort((a, b) => a.reward.info.item_id - b.reward.info.item_id || a.reward.info.amount - b.reward.info.amount));

	function isSelected(reward: Extract<QuestReward, { type: RewardType.ITEM }>["info"]) {
		return Boolean(data.item?.find(r => r.id === reward.item_id.toString() && r.amount === reward.amount));
	}
</script>

<ToggleGroup
	class="h-114 overflow-y-auto flex flex-col gap-2! w-full grid-cols-1! p-1"
	orientation="vertical"
	evenColumns={false}
	values={data.item?.map(i => `${i.id}-${i.amount}`) ?? []}
	onchange={(values) => {
		if (!data.item) data.item = []
		data.item = values.map(v => {
			const [ id, amount ] = v.split("-")
			return { id, amount: Number(amount) }
		})

		if (data.item.length === 0) delete data.item

		// if (selected) {
		// 	data.item = data.item?.filter(i => i.id !== reward.item_id.toString() || i.amount !== reward.amount) ?? []
		// } else {
		// 	if (!data.item) data.item = []
		// 	data.item.push({ id: reward.item_id.toString(), amount: reward.amount })
		// }
		//
		// if (data.item?.length === 0) delete data.item
	}}
>
	{#each rewards as quest}
		{@const reward = quest.reward.info}
		{@const name = m.quest_item({ count: reward.amount, item: mItem(reward.item_id) })}
		{@const selected = isSelected(reward)}

		<SelectGroupItem
			class="rounded-md border border-border cursor-pointer w-full ring-1! items-start! justify-start!"
			type="toggle"
			value={`${reward.item_id}-${reward.amount}`}
		>
			<div class="overflow-hidden relative rounded-l-sm pb-2 w-full">
				<div
					class:bg-green={selected}
					class:bg-red={!selected}
					class="h-full w-0.5 absolute transition-colors"
				></div>
				<div class="flex gap-2 items-center pl-3 pr-2 pt-2">
					<img
						class="w-7"
						src={resize(getIconItem(reward.item_id, reward.amount), { width: 64 })}
						alt={name}
					>
					<p class="font-semibold text-base text-left">
						{name}
					</p>
				</div>

				{#if selected}
					<div
						class="flex flex-col gap-1 mt-2 pl-3 pr-2"
						transition:slide={{ duration: 70 }}
					>
						{#each quest.tasks as task}
							<Button
								variant="outline"
								class="text-left w-full gap-3 justify-start"
							>
								<Check size="16" />
								<span>
									{mQuest(task.title, task.target)}
								</span>
							</Button>

						{/each}
					</div>
				{/if}
			</div>

		</SelectGroupItem>
	{/each}
</ToggleGroup>