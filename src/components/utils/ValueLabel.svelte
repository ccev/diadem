<script lang="ts">
	let {
		value,
		unit,
		class: class_ = ""
	}: {
		value: string | null | undefined,
		unit: string,
		class: string
	} = $props()
</script>

{#if value}
	<div class="flex gap-[1px] text-sm mx-0.5">
		<span class=" pl-2 pr-1 rounded-l-lg ring-2 {class_}">
			{unit}
		</span>
		<span class=" pr-2 pl-1 rounded-r-lg ring-2 {class_}">
			{value}
		</span>
	</div>
{/if}
