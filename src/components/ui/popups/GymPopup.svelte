<script lang="ts">
	import type { GymData } from '@/lib/types/mapObjectData/gym';
	import BasePopup from '@/components/ui/popups/BasePopup.svelte';
	import { getIconGym } from '@/lib/uicons.svelte';
	import ImagePopup from '@/components/ui/popups/ImagePopup.svelte';
	import * as m from "@/lib/paraglide/messages"
	import ImageFort from '@/components/ui/popups/ImageFort.svelte';


	let {data} : {data: GymData} = $props()

</script>

<BasePopup lat={data.lat} lon={data.lon}>
	{#snippet image()}
		<ImageFort
			alt={data.name ?? m.pogo_gym()}
			fortUrl={data.url}
			fortIcon={getIconGym(data)}
		/>
	{/snippet}

	{#snippet title()}
		<div class="text-lg font-semibold tracking-tight">
			<span>
				{#if data.name}
					{data.name}
				{:else}
					{m.unknown_gym()}
				{/if}
			</span>
		</div>
	{/snippet}
</BasePopup>
