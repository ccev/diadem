<script lang="ts">
	let {
		title,
		description = "",
	}: {
		title: string,
		description?: string,
	} = $props()
</script>

<div class="whitespace-normal">
	<p class="font-semibold text-base">
		{title}
	</p>
	{#if description}
		<p class="font-normal text-sm">
			{description}
		</p>
	{/if}
</div>