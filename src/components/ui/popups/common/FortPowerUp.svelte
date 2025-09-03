<script lang="ts">
	import IconValue from '@/components/ui/popups/common/IconValue.svelte';
	import TimeWithCountdown from '@/components/ui/popups/common/TimeWithCountdown.svelte';
	import { CircleFadingArrowUp } from 'lucide-svelte';
	import * as m from "@/lib/paraglide/messages"
	import { isFortOutdated } from '@/lib/utils/gymUtils';

	let {
		points,
		level,
		endTimestamp,
		updated
	}: {
		points?: number,
		level?: number,
		endTimestamp?: number,
		updated?: number
	} = $props()
</script>

{#if points && !isFortOutdated(updated)}
	<IconValue Icon={CircleFadingArrowUp}>
		{m.power_up_level()}: <b>{level ?? 0}</b> ({points ?? 0} points)
		{#if (level ?? 0) > 0 && endTimestamp}
			<TimeWithCountdown
				expireTime={endTimestamp ?? 0}
				showHours={false}
			/>
		{/if}
	</IconValue>
{/if}