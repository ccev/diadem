<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		class: class_ = "",
		children = null,
		...rest
	}: {
		class: string,
		children: Snippet | null,
	} = $props()
</script>

<div class="rounded-lg border bg-card text-card-foreground shadow-lg {class_}" {...rest}>
	{@render children?.()}
</div>