<script lang="ts">
	import { getIconPokemon } from "$lib/services/uicons.svelte";
	import { KECLEON_ID } from "$lib/utils/pokestopUtils";
	import { mPokemon } from "$lib/services/ingameLocale";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";

	let {
		src,
		alt,
		title
	}: {
		src: string,
		alt: string,
		title: string
	} = $props()
</script>

<div class="flex items-center gap-2 mb-3">
	<div class="w-7 h-7 shrink-0">
		<ImagePopup
			{src}
			{alt}
			class="w-7"
		/>
	</div>
	<h3 class="font-semibold">
		{title}
	</h3>
</div>