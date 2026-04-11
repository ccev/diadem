<script lang="ts">
	import { isWebglSupported } from "@/lib/map/utils";
	import ErrorPage from "@/components/ui/ErrorPage.svelte";
	import * as m from "@/lib/paraglide/messages";
	import { getConfig } from "@/lib/services/config/config";
</script>

<ErrorPage
	error={m.error_webgl_unavailable()}
	description={isWebglSupported() === null ? m.webgl_disabled_error() : m.webgl_unsupported_error()}
	href={getConfig().general.customHome ? "/" : ""}
/>
