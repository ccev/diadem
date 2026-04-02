<script lang="ts">
	let {
		text = undefined,
		class: className = ""
	}: {
		text?: string;
		class?: string;
	} = $props();
</script>

<div class="flex items-center gap-4 w-full {className}">
	<div class="bg-border h-px w-full"></div>
	{#if text}
		<span class="text-muted-foreground text-sm whitespace-nowrap">{text}</span>
		<div class="bg-border h-px w-full"></div>
	{/if}
</div>
