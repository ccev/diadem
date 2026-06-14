<script lang="ts">
	import {
		getClickedL14Cell,
		getPokestopsRequiredForNewGym,
		getWayfarerCellHighlight,
		setClickedL14Cell
	} from "@/lib/features/wayfarerMap.svelte";
	import BasePopup from "@/components/ui/popups/BasePopup.svelte";
	import IconValue from "@/components/ui/popups/common/IconValue.svelte";
	import { Circle, Diamond, TriangleAlert } from "lucide-svelte";
	import * as m from "@/lib/paraglide/messages";

	let data = $derived(getClickedL14Cell());
	let highlight = $derived(data ? getWayfarerCellHighlight(data.fortCount, data.gymCount) : "");

	let fillColor = $derived.by(() => {
		const h = highlight;
		if (h === "red") return "var(--wayfarer-l14-fill-red)";
		if (h === "amber") return "var(--wayfarer-l14-fill-amber)";
		if (h === "green") return "var(--wayfarer-l14-fill-green)";
		return "transparent";
	});
	let strokeColor = $derived.by(() => {
		const h = highlight;
		if (h === "red") return "var(--wayfarer-l14-stroke-red)";
		if (h === "amber") return "var(--wayfarer-l14-stroke-amber)";
		if (h === "green") return "var(--wayfarer-l14-stroke-green)";
		return "var(--wayfarer-l14-stroke)";
	});
</script>

{#if data}
	<BasePopup
		class="pb-2"
		isExpanded={() => true}
		buttons={undefined}
		canShare={false}
		onclose={() => setClickedL14Cell(undefined)}
	>
		{#snippet image()}
			<div
				class="size-9 border-3 shrink-0 -skew-2"
				style:background-color={fillColor}
				style:border-color={strokeColor}
			></div>
		{/snippet}

		{#snippet title()}
			<div class="text-lg font-semibold tracking-tight">
				{m.wayfarer_cell_title()}
			</div>
		{/snippet}

		{#snippet content()}
			<p class="mb-1">
				{#if data.gymCount >= 3}
					<IconValue Icon={TriangleAlert}>
						{m.wayfarer_gym_limit_reached()}
					</IconValue>
				{:else}
					{@html m.wayfarer_pokestops_required_for_gym({
						count: getPokestopsRequiredForNewGym(data.fortCount, data.gymCount)
					})}
				{/if}
			</p>

			<IconValue
				Icon={Circle}
				class="*:fill-(--wayfarer-fort-pokestop) *:stroke-(--wayfarer-fort-pokestop-stroke)"
			>
				{@html m.wayfarer_pokestops_count({ count: data.fortCount - data.gymCount })}
			</IconValue>
			<IconValue
				Icon={Diamond}
				class="*:fill-(--wayfarer-fort-gym) *:stroke-(--wayfarer-fort-gym-stroke)"
			>
				{@html m.wayfarer_gyms_count({ count: data.gymCount })}
			</IconValue>
		{/snippet}
	</BasePopup>
{/if}
