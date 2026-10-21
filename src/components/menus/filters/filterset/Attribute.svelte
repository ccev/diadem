<script lang="ts" generics="T extends AnyFilterset">
	import Button from "@/components/ui/input/Button.svelte";
	import { ChevronRight } from "@lucide/svelte";
	import type { Snippet } from "svelte";
	import {
		filtersetPageEditAttribute,
		type FiltersetSnippet,
		setCurrentAttributePage
	} from "@/lib/features/filters/filtersetPages.svelte.js";
	import type { AnyFilterset } from "@/lib/features/filters/filtersets";

	let {
		label,
		page,
		children = undefined
	}: {
		label: string;
		page: FiltersetSnippet<T>;
		children?: Snippet;
	} = $props();

	function onattribute() {
		setCurrentAttributePage(page, label);
		filtersetPageEditAttribute();
	}
</script>

<Button
	variant="ghost"
	class="rounded-none! first:rounded-t-lg! last:rounded-b-lg! grid! grid-cols-subgrid w-full px-4! py-1! h-fit! items-center"
	style="grid-column: 1 / -1"
	onclick={onattribute}
>
	<div class="min-w-0 whitespace-normal wrap-anywhere font-semibold text-left py-2">
		{label}
	</div>
	<div class="min-w-0 flex gap-1 overflow-hidden">
		{@render children?.()}
	</div>
	<ChevronRight size="18" />
</Button>
