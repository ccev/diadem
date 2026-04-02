<script lang="ts">
	import * as m from "@/lib/paraglide/messages";
	import { formatNumber, formatNumberCompact } from "@/lib/utils/numberFormat";
	import type { Snippet } from "svelte";

	let {
		days = undefined,
		total = undefined,
		children = undefined
	}: {
		days?: number;
		total?: number;
		children?: Snippet;
	} = $props();
</script>

{#if children}
	<div
		class="rounded-sm bg-accent text-accent-foreground border border-border px-4 -mx-4 pt-3 pb-3.5 mb-2 mt-3"
	>
		<p class="text-xs mb-2">
			{m.stats()}

			{#if days !== undefined}
				· {m.last_x_days({ days: formatNumber(days) })}
			{/if}

			{#if total !== undefined}
				· {m.total_seen()}: {formatNumberCompact(total)}
			{/if}
			<!--	·-->
			<!--	<Button variant="link" size="sm" class="p-0! m-0! h-fit! text-xs! underline">-->
			<!--		See more-->
			<!--	</Button>-->
		</p>

		{@render children()}
	</div>
{/if}
