<script lang="ts">

	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";
	import type { Snippet } from "svelte";

	let {
		image,
		title,
		extra
	}: {
		image: Snippet
		title: Snippet
		extra: Snippet
	} = $props()
</script>

<div class="flex gap-3">
	<div class="size-12 shrink-0">
		{@render image()}
	</div>

	<div>
		<p class="text-lg font-semibold">
			{@render title()}
		</p>
		<p>
			{@render extra()}
		</p>
	</div>
</div>