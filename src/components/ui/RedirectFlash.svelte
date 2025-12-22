<script lang="ts">
	import { browser } from "$app/environment";
	import { getMapPath } from "@/lib/utils/getMapPath";
	import { getConfig } from "@/lib/services/config/config";
	import * as m from "@/lib/paraglide/messages";
	import { tick } from "svelte";
	import { goto } from "$app/navigation";

	let { goal, href = getMapPath(getConfig()) }: { goal: string, href?: string } = $props()

	if (browser) {
		tick().then(() => {
			goto(href);
		});
	}
</script>

{#if browser}
	<a class="p-4 mx-auto underline" {href}>
		{m.redirect_notice({ goal })}
	</a>
{/if}
