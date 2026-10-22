<script lang="ts">
	import { browser } from "$app/environment";
	import type { PageProps } from "./$types";
	import RedirectFlash from "@/components/ui/RedirectFlash.svelte";
	import { getConfig } from "@/lib/services/config/config";
	import { mapObjectLabel } from "@/lib/mapObjects/mapObjectLabels";
	import Metadata from "@/components/utils/Metadata.svelte";

	let { data }: PageProps = $props();
</script>

{#if !browser && data && data.title}
	<Metadata
		title={data.title}
		image={getConfig().general.url + `/${data.type}/${data.id}/thumbnail.png`}
	/>
{/if}

<RedirectFlash goal={data.title ?? mapObjectLabel(data.type)} />
