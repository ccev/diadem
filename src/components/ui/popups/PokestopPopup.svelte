<script lang="ts">
	import type { PokestopData } from '@/lib/types/mapObjectData/pokestop';
	import BasePopup from '@/components/ui/popups/BasePopup.svelte';

	let {data} : {data: PokestopData} = $props()

</script>

<BasePopup lat={data.lat} lon={data.lon}>
	{#snippet image()}
		<img
			alt={data.name}
			src="https://raw.githubusercontent.com/whitewillem/PogoAssets/refs/heads/main/uicons-outline/pokestop/0.png"
			class="h-12 w-12"
		>
	{/snippet}

	{#snippet title()}
		<div class="text-lg font-semibold tracking-tight">
			<span>
				{#if data.name}
					{data.name}
				{:else}
					Pokestop
				{/if}
			</span>
		</div>
	{/snippet}
</BasePopup>
