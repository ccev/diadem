<script lang="ts">
	import type { PokestopData } from '@/lib/types/mapObjectData/pokestop';
	import BasePopup from '@/components/ui/popups/BasePopup.svelte';
	import { getIconPokestop } from '@/lib/uicons.svelte';
	import PopupImage from '@/components/ui/popups/PopupImage.svelte';
	import * as m from "@/lib/paraglide/messages"


	let {data} : {data: PokestopData} = $props()

</script>

<BasePopup lat={data.lat} lon={data.lon}>
	{#snippet image()}
		{#if data.url}
			<PopupImage
				alt={data.name ?? m.pogo_pokestop()}
				src={data.url}
				class="h-14 w-14 rounded-full ring-border ring-2 ring-offset-card ring-offset-2"
				w="14"
			/>
		{:else}
			<PopupImage
				alt={data.name ?? m.pogo_pokestop()}
				src={getIconPokestop(data)}
				class="h-12 w-12"
				w="14"
			/>
		{/if}

	{/snippet}

	{#snippet title()}
		<div class="text-lg font-semibold tracking-tight">
			<span>
				{#if data.name}
					{data.name}
				{:else}
					{m.unknown_pokestop()}
				{/if}
			</span>
		</div>
	{/snippet}
</BasePopup>
