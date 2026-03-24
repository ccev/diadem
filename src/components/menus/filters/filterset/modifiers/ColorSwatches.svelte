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

<div class="flex flex-wrap gap-2">
	{#each MODIFIER_COLORS as color}
		<button
			type="button"
			class="size-7 rounded-full border-2 cursor-pointer shrink-0 transition-shadow"
			class:ring-2={selected === color}
			class:ring-primary={selected === color}
			aria-label={`Select ${color}`}
			title={color}
			style:background-color={color}
			style:border-color={color === "#eab308" ? "var(--color-amber-500)" : color}
			onclick={() => onchange(color)}
		></button>
	{/each}
</div>
