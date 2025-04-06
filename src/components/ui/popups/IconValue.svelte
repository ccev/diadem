<script lang="ts">
	import type { IconProps } from 'lucide-svelte';
	import type { Component, Snippet } from 'svelte';

	let {
		Icon,
		children,
	}: {
		Icon: Component<IconProps>,
		children: Snippet,
	} = $props()
</script>

<div class="flex items-center">
	<Icon size="16" class="flex-shrink-0" />

	<div class="ml-1.5">
		{@render children()}
	</div>
</div>