<script lang="ts">
	import ImagePopup from '@/components/ui/popups/ImagePopup.svelte';

	let {
		alt,
		fortUrl,
		fortIcon
	}: {
		alt: string,
		fortUrl?: string,
		fortIcon: string
	} = $props()
</script>

{#if fortUrl}
	<ImagePopup
		{alt}
		src={fortUrl}
		class="h-14 w-14 rounded-full ring-border ring-2 ring-offset-card ring-offset-2"
		w="14"
	/>
{:else}
	<ImagePopup
		{alt}
		src={fortIcon}
		class="h-12 w-12"
		w="14"
	/>
{/if}