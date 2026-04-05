<script lang="ts">
	import { getUnderlayColor, MODIFIER_COLORS } from "@/lib/features/filters/modifierPresets";

	let {
		selected = undefined,
		onchange = () => {}
	}: {
		selected?: string;
		onchange?: (color: string) => void;
	} = $props();
</script>

<div class="flex w-full justify-between gap-1 px-1 max-w-sm mt-1 mb-3">
	{#each Object.entries(MODIFIER_COLORS) as [colorName, rawColor]}
		{@const color = getUnderlayColor(colorName, 1)}
		<button
			type="button"
			class="aspect-square w-full max-w-8 rounded-full border-2 cursor-pointer transition-shadow"
			class:ring-2={selected === rawColor}
			class:ring-primary={selected === rawColor}
			aria-label={`Select ${colorName}`}
			style:background-color={color}
			onclick={() => onchange(rawColor)}
		></button>
	{/each}
</div>
