<script lang="ts">
	import Card from "@/components/ui/Card.svelte";
	import { Pencil } from "lucide-svelte";
	import { fly } from "svelte/transition";
	import type { Snippet } from "svelte";
	import {
		filtersetPageEditAttribute,
		getFiltersetPageTransition, setCurrentAttributePage
	} from "@/lib/features/filters/filtersetPages.svelte.js";
	import Button from "@/components/ui/input/Button.svelte";
	import { getCurrentSelectedFilterset } from "@/lib/features/filters/filtersetPageData.svelte.js";
	import * as m from "@/lib/paraglide/messages";
	import EditDetails from "@/components/menus/filters/filterset/EditDetails.svelte";
	import { filterTitle } from "@/lib/features/filters/filtersetUtils";
	import FiltersetIcon from "@/lib/features/filters/FiltersetIcon.svelte";

	let {
		overview
	}: {
		overview: Snippet
	} = $props();
</script>

{#snippet editDetailsPage(thisData)}
	<EditDetails data={thisData} />
{/snippet}

<div
	class="w-full absolute top-0 pb-2 overflow-y-auto"
	in:fly={getFiltersetPageTransition().in}
	out:fly={getFiltersetPageTransition().out}
>
	<Card class="w-full text-sm divide-y-border divide-y mb-3 flex gap-2">
		<Button
			class="w-full! h-full! justify-start py-3! px-4! gap-2 group"
			variant="ghost"
			onclick={() => {
				setCurrentAttributePage(editDetailsPage, m.details());
				filtersetPageEditAttribute()
			}}
		>
			<div
				class="rounded-full bg-accent size-10 border flex items-center justify-center relative shrink-0 mr-1"
			>
				<FiltersetIcon filterset={$state.snapshot(getCurrentSelectedFilterset()?.data)} size={5} />
			</div>
			<div class="relative text-left text-base min-w-0 w-full overflow-hidden">
				<div
					class="absolute right-0 h-full w-4 bg-linear-to-l from-background to-transparent group-hover:from-accent transition-colors"
				></div>
				<b>{filterTitle($state.snapshot(getCurrentSelectedFilterset()?.data))}</b>
			</div>
			<Pencil class="ml-auto shrink-0" size="14" />

		</Button>

	</Card>

	<div class="space-y-3">
		{@render overview()}
	</div>
</div>
