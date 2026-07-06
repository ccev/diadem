<script lang="ts">
	import * as m from "@/lib/paraglide/messages";
	import { openFortDetailsModal } from "@/components/ui/popups/common/FortDetailsModal.svelte";
	import ImagePopup from "@/components/ui/popups/common/ImagePopup.svelte";

	let {
		alt,
		fortUrl,
		fortIcon,
		fortName = "",
		fortDescription = ""
	}: {
		alt: string;
		fortUrl?: string;
		fortIcon: string;
		fortName?: string;
		fortDescription?: string;
	} = $props();
</script>

{#if fortUrl}
	<button
		class="group relative py-7 h-14 w-14 shrink-0 focus-visible:ring-ring rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-4 cursor-pointer"
		onclick={() => {
			if (!fortUrl) return;

			openFortDetailsModal({ alt, fortUrl, fortName, fortDescription });
		}}
		title={m.view_full_image()}
	>
		<ImagePopup
			{alt}
			src={fortUrl}
			class="absolute transition-all top-0 object-cover h-14 w-14 rounded-full ring-border ring-2 ring-offset-card ring-offset-2"
		/>
		<span
			class="opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity absolute left-0 top-0 w-14 h-14 rounded-full backdrop-brightness-75"
		></span>
	</button>
{:else}
	<div class="w-12 shrink-0">
		<ImagePopup {alt} src={fortIcon} class="h-12 w-12" />
	</div>
{/if}
