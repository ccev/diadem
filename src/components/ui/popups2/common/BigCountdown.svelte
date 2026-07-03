<script lang="ts">
	import * as m from "$lib/paraglide/messages";
	import { Clock } from "@lucide/svelte";
	import { hasTimer } from "$lib/utils/pokemonUtils";
	import { timestampToLocalTime } from "$lib/utils/timestampToLocalTime";
	import Countdown from "@/components/utils/Countdown.svelte";
	import BasicMainCard from "@/components/ui/popups2/common/BasicMainCard.svelte";
	import type { Snippet } from "svelte";

	let {
		expire,
		fallbackExpire,
		useFallback,
		fallbackTitle,
		fallbackExplanation,
	}: {
		expire: number,
		fallbackExpire: number,
		useFallback: boolean,
		fallbackTitle: string,
		fallbackExplanation: string
	} = $props()
</script>

<BasicMainCard>
	<p class="font-semibold ml-1">
		{#if useFallback}
			{fallbackTitle}
		{:else}
			{m.disappear_time()}
		{/if}
	</p>

	<div class="flex justify-between text-xl mt-3 items-center gap-x-4 gap-y-2 flex-wrap">
		<div
			class="justify-center font-semibold flex gap-2 items-center rounded-md bg-accent-highlight pl-4 pr-6 py-2 grow basis-1 whitespace-nowrap"
		>
			<Clock class="size-4" />
			<p>
				{timestampToLocalTime(useFallback ? fallbackExpire : expire, { dayLowerCase: false })}
			</p>
		</div>

		<div
			class="justify-center font-semibold flex gap-2 items-center rounded-md bg-accent-highlight pl-4 pr-6 py-2 grow basis-1 shrink"
		>
			<Countdown
				expireTime={useFallback ? fallbackExpire : expire}
			/>
		</div>
	</div>

	{#if useFallback}
		<p class="text-muted-foreground mt-4 text-sm px-1">
			{fallbackExplanation}
		</p>
	{/if}
</BasicMainCard>