<script lang="ts">
	import { Clock, ClockAlert, ClockArrowUp, Gift, ScanEye, Search } from 'lucide-svelte';
	import Countdown from '@/components/utils/Countdown.svelte';
	import IconValue from '@/components/ui/popups/common/IconValue.svelte';
	import * as m from "@/lib/paraglide/messages"

	import { timestampToLocalTime } from '@/lib/utils/timestampToLocalTime';
	import { isFortOutdated } from '@/lib/utils/gymUtils';

	let {
		updated,
		lastModified,
		firstSeen
	}: {
		updated?: number
		lastModified?: number
		firstSeen?: number
	} = $props()
</script>

{#if updated}
<IconValue Icon={isFortOutdated(updated) ? ClockAlert : Clock}>
	{m.last_seen()}: <b><Countdown expireTime={updated} /></b>
	{#if isFortOutdated(updated)}
		({m.outdated()})
	{/if}
</IconValue>
{/if}

{#if lastModified}
<IconValue Icon={ClockArrowUp}>
	{m.last_updated()}: <b><Countdown expireTime={lastModified} /></b>
</IconValue>
{/if}

{#if firstSeen}
<IconValue Icon={Search}>
	{m.first_seen()}: <b>{timestampToLocalTime(firstSeen, true)}</b>
</IconValue>
{/if}