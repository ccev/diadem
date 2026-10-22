<script lang="ts">
	import { isWebglSupported } from "@/lib/map/utils";
	import ErrorPage from "@/components/ui/ErrorPage.svelte";

	import { getConfig } from "@/lib/services/config/config";
</script>

<ErrorPage
	error="WebGL unavailable"
	description={isWebglSupported() === null
		? "WebGL is required to use the map, but seems to be disabled in your browser. Please enable it or try to restart your browser."
		: "WebGL is required to use the map. Please use a modern device and browser."}
	href={getConfig().general.customHome ? "/" : ""}
/>
