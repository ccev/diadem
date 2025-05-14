<script lang="ts">
	import type { IconProps } from 'lucide-svelte';
	import type { Component, Snippet } from 'svelte';
	import type { LucideIcon } from '@/lib/types/misc';

	let {
		Icon,
		children,
	}: {
		Icon: LucideIcon,
		children: Snippet,
	} = $props()
</script>

<div class="flex items-center">
	<Icon size="16" class="shrink-0" />

	<div class="ml-1.5">
		{@render children()}
	</div>
</div>