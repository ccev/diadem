<script lang="ts">
	import { isFortOutdated } from '@/lib/pogoUtils.js';
	import { Clock, ClockAlert, ClockArrowUp, Gift, ScanEye } from 'lucide-svelte';
	import { timestampToLocalTime } from '@/lib/utils.svelte.js';
	import Countdown from '@/components/utils/Countdown.svelte';
	import IconValue from '@/components/ui/popups/IconValue.svelte';
	import * as m from "@/lib/paraglide/messages"

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
<IconValue Icon={Gift}>
	{m.first_seen()}: <b>{timestampToLocalTime(firstSeen, true)}</b>
</IconValue>
{/if}