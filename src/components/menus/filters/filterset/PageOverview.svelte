<script lang="ts">
	import Card from "@/components/ui/Card.svelte";
	import { Pencil } from "lucide-svelte";
	import { fly } from "svelte/transition";
	import type { Snippet } from "svelte";
	import {
		filtersetPageEditAttribute,
		getFiltersetPageTransition,
		setCurrentAttributePage
	} from "@/lib/features/filters/filtersetPages.svelte.js";
	import Button from "@/components/ui/input/Button.svelte";
	import { getCurrentSelectedFilterset } from "@/lib/features/filters/filtersetPageData.svelte.js";
	import * as m from "@/lib/paraglide/messages";
	import EditDetails from "@/components/menus/filters/filterset/EditDetails.svelte";
	import { filterTitle } from "@/lib/features/filters/filtersetUtils";
	import FiltersetIcon from "@/lib/features/filters/FiltersetIcon.svelte";
	import ModifierPreview from "./modifiers/ModifierPreview.svelte";
	import ModifiersAttribute from "./modifiers/ModifiersAttribute.svelte";
	import type { AnyFilterset } from "@/lib/features/filters/filtersets";
	import type { FilterCategory } from "@/lib/features/filters/filters";
	import { getModifierPreviewIcon } from "@/lib/features/filters/filtersetUtils";

	let {
		overview
	}: {
		overview: Snippet;
	} = $props();

	let filterset = getCurrentSelectedFilterset();
</script>

{#snippet editDetailsPage(thisData: AnyFilterset)}
	<EditDetails data={thisData} />
{/snippet}

{#snippet editVisualPage(thisData: AnyFilterset)}
	<ModifiersAttribute
		data={thisData}
		majorCategory={filterset?.majorCategory}
		subCategory={filterset?.subCategory}
	/>
{/snippet}

<div
	class="pb-2"
	in:fly={getFiltersetPageTransition().in}
	out:fly={getFiltersetPageTransition().out}
>
	<Card class="w-full text-sm divide-y-border divide-y overflow-hidden">
		<Button
			class="w-full! h-full! justify-start py-3! px-4! gap-2 group rounded-none!"
			variant="ghost"
			onclick={() => {
				setCurrentAttributePage(editDetailsPage, m.details());
				filtersetPageEditAttribute();
			}}
		>
			{#if filterset?.data}
				<div
					class="rounded-full bg-accent size-10 border flex items-center justify-center relative shrink-0 mr-1"
				>
					<FiltersetIcon filterset={filterset.data} size={5} />
				</div>
				<div class="relative text-left text-base min-w-0 w-full overflow-hidden">
					<div
						class="absolute right-0 h-full w-4 bg-linear-to-l from-background to-transparent group-hover:from-accent group-active:from-accent transition-colors"
					></div>
					<b>{filterTitle(filterset.data)}</b>
				</div>
			{/if}
			<Pencil class="ml-auto shrink-0" size="14" />
		</Button>
		<Button
			class="w-full! h-fit! block! justify-start p-0! gap-2 group rounded-none! relative"
			variant="ghost"
			onclick={() => {
				setCurrentAttributePage(editVisualPage, m.modifier_visual());
				filtersetPageEditAttribute();
			}}
		>
			<ModifierPreview
				class="h-20! rounded-none! border-none!"
				filterset={filterset?.data}
				majorCategory={filterset?.majorCategory}
				subCategory={filterset?.subCategory}
			/>
			<Pencil class="ml-auto shrink-0 absolute right-4 top-1/2 -translate-y-1/2" size="14" />
		</Button>
	</Card>

	<div class="space-y-3 mt-6">
		{@render overview()}
	</div>
</div>
