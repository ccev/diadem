<script lang="ts">
	let {
		class: class_ = "",
		title,
		description = ""
	}: {
		class?: string;
		title: string;
		description?: string;
	} = $props();
</script>

<div class="whitespace-normal {class_}">
	<p class="font-semibold text-base">
		{title}
	</p>
	{#if description}
		<p class="font-normal text-sm">
			{description}
		</p>
	{/if}
</div>
