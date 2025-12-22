<script lang="ts">
	import Button from '@/components/ui/input/Button.svelte';
	import type { Snippet } from 'svelte';
	import type { LucideIcon } from '@/lib/types/lucide';

	import { setIsContextMenuOpen } from '@/lib/ui/contextmenu.svelte.js';

	import { isMenuSidebar } from '@/lib/utils/device';

	let {
		Icon,
		label,
		tag = "button",
		onclick = undefined,
		...rest
	}: {
		Icon: LucideIcon,
		label: string,
		tag?: "a" | "button",
		onclick?: () => void,
	} = $props()

	function onClick() {
		if (onclick) onclick()
		setIsContextMenuOpen(false)
	}
</script>

{#if isMenuSidebar()}
	<Button
		{tag}
		variant="ghost"
		size=""
		class="pr-6 pl-4 gap-4 py-3 w-full rounded-sm justify-start!"
		onclick={onClick}
		{...rest}
	>
		<Icon size="14" class="shrink-0" />
		<span>{label}</span>
	</Button>
{:else}
	<Button
		{tag}
		variant="ghost"
		size=""
		class="px-6 gap-4 py-4 w-full text-base! rounded-sm justify-start!"
		onclick={onClick}
		{...rest}
	>
		<Icon size="18" class="shrink-0" />
		<span>{label}</span>
	</Button>
{/if}