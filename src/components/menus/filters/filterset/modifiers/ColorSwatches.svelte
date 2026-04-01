<script lang="ts">
	import { MODIFIER_COLORS } from "@/lib/features/filters/modifierPresets";

	let {
		selected = undefined,
		onchange = () => {}
	}: {
		selected?: string;
		onchange?: (color: string) => void;
	} = $props();
</script>

<div class="flex w-full justify-between gap-1 px-1 max-w-sm mt-1 mb-3">
	{#each Object.values(MODIFIER_COLORS) as color}
		<!-- <div class="bg-green-400 w-full aspect-square"></div> -->
		<button
			type="button"
			class="aspect-square w-full max-w-8 rounded-full border-2 cursor-pointer transition-shadow"
			class:ring-2={selected === color}
			class:ring-primary={selected === color}
			aria-label={`Select ${color}`}
			title={color}
			style:background-color={color}
			onclick={() => onchange(color)}
		></button>
	{/each}
</div>
