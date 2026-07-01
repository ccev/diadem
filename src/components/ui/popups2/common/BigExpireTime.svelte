<script lang="ts">
	import Countdown from "@/components/utils/Countdown.svelte";
	import { timestampToLocalTime } from "$lib/utils/timestampToLocalTime";
	import { Clock } from "@lucide/svelte";

	let {
		expire
	}: {
		expire?: number
	} = $props()
</script>

<div class="flex justify-between items-center gap-3">
	<div
		class="justify-center font-medium flex gap-2 items-center rounded-md bg-accent-highlight- border-2 border-accent-highlight pl-4 pr-6 py-2 w-full"
	>
		<Clock class="size-4" />
		<p>
			{timestampToLocalTime(expire)}
		</p>
	</div>

	<div
		class="justify-center font-medium flex gap-2 items-center rounded-md bg-accent-highlight- border-2 border-accent-highlight pl-4 pr-6 py-2 w-full"
	>
		<Countdown expireTime={expire} />
	</div>
</div>