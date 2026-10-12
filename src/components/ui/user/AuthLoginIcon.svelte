<script lang="ts">
	import DiscordIcon from "@/components/icons/DiscordIcon.svelte";
	import { LogIn, Send } from "@lucide/svelte";
	import { getConfig } from "@/lib/services/config/config";
	import { defaultAuthProviders } from "@/lib/services/config/authProviders";
	let { class: className = "w-4 shrink-0" }: { class?: string } = $props();
	let providers = $derived(getConfig().auth?.providers ?? defaultAuthProviders);
</script>

{#if providers.length === 1 && providers[0] === "discord"}
	<DiscordIcon class={className} />
{:else if providers.length === 1 && providers[0] === "telegram"}
	<Send class={className} />
{:else}
	<LogIn class={className} />
{/if}
