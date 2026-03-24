<script lang="ts" generics="T extends AnyFilterset">
	import Button from '@/components/ui/input/Button.svelte';
	import { ChevronRight } from 'lucide-svelte';
	import type { Snippet } from 'svelte';
	import {
		filtersetPageEditAttribute,
		type FiltersetSnippet,
		setCurrentAttributePage
	} from '@/lib/features/filters/filtersetPages.svelte.js';
	import type { AnyFilterset } from '@/lib/features/filters/filtersets';

	let {
		label,
		page,
		children = undefined
	}: {
		label: string,
		page: FiltersetSnippet<T>,
		children?: Snippet
	} = $props();

	function onattribute() {
		setCurrentAttributePage(page, label);
		filtersetPageEditAttribute()
	}
</script>

<Button
	variant="ghost"
	class="rounded-none! grid! grid-cols-subgrid w-full px-4! py-1! h-fit! items-center"
	style="grid-column: 1 / -1"
	onclick={onattribute}
>
	<div class="font-semibold text-left py-2">
		{label}
	</div>
	<div class="flex w-full items-center justify-between">
		<div class="ml-1 flex gap-1 overflow-x-hidden">
			{@render children?.()}
		</div>

		<ChevronRight size="18" />
	</div>
</Button>