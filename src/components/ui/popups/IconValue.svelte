<script lang="ts">
	import { timestampToLocalTime } from '@/lib/utils.js';
	import { Clock } from 'lucide-svelte';
	import Countdown from '@/components/utils/Countdown.svelte';
	import type {IconProps} from 'lucide-svelte';
	import type { Snippet, SvelteComponent } from 'svelte';

	let {
		icon,
		value
	}: {
		icon: Snippet,
		value: Snippet
	} = $props()
</script>

<div class="flex items-center">
	{@render icon()}

	<div class="ml-1.5">
		{@render value()}
	</div>
</div>