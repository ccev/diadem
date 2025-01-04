<script lang="ts">
	import Button from '@/components/ui/Button.svelte';
	import type { Snippet } from 'svelte';
	import { setIsContxtMenuOpen } from '@/components/ui/contextmenu/utils.svelte';

	let {
		tag = "button",
		onclick = undefined,
		children,
		...rest
	}: {
		tag?: string,
		onclick?: () => void,
		children: Snippet
	} = $props()

	function onClick() {
		if (onclick) onclick()
		setIsContxtMenuOpen(false)
	}
</script>

<Button
	{tag}
	variant="ghost"
	size=""
	class="pr-6 pl-4 gap-4 py-3 w-full rounded-sm !justify-start"
	onclick={onClick}
	{...rest}
>
	{@render children()}
</Button>