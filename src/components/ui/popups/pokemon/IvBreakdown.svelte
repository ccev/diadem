<script lang="ts">
	import { Meter } from "bits-ui";

	let {
		name,
		value
	}: {
		name: string,
		value: number
	} = $props()
</script>

<div class="flex justify-between">
	<p class="text-muted-foreground w-16 shrink-0">
		{name}
	</p>
	<div class="flex items-center w-full shrink justify-end">
		<Meter.Root
			min={0}
			max={15}
			value={value}
			class="h-1 overflow-hidden w-full max-w-32 rounded-full bg-accent-highlight"
		>
			<div
				class="h-full w-full flex-1 bg-accent-foreground rounded-full"
				style="transform: translateX(-{100 - (value / 15) * 100}%)"
			></div>
		</Meter.Root>
		<p class="w-8 text-right">
			{value}
		</p>
	</div>
</div>