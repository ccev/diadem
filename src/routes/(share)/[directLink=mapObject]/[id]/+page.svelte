<script lang="ts">
	import { browser } from "$app/environment";
	import { page } from "$app/state";
	import type { PageProps } from "./$types";
	import RedirectFlash from "@/components/ui/RedirectFlash.svelte";
	import { getConfig } from "@/lib/services/config/config";
	import { getSeoOrigin } from "@/lib/utils/localePaths";
	import { mAny } from "@/lib/utils/anyMessage";
	import Metadata from "@/components/utils/Metadata.svelte";

	let { data }: PageProps = $props();
</script>

{#if !browser && data && data.title}
	<Metadata
		title={data.title}
		image={new URL(
			`${page.url.pathname}/thumbnail.png`,
			getSeoOrigin(getConfig().general.url, page.url.origin)
		).href}
	/>
{/if}

<RedirectFlash goal={mAny("pogo_" + data.type)} />
