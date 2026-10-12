<script lang="ts">
	import { Dialog } from "bits-ui";
	import Button from "@/components/ui/input/Button.svelte";
	import DiscordIcon from "@/components/icons/DiscordIcon.svelte";
	import { Send } from "@lucide/svelte";
	import { closeModal, isOpenModal, openModal } from "@/lib/ui/modal.svelte";
	import { getConfig } from "@/lib/services/config/config";
	import { startLogin } from "@/lib/services/user/login";
	import { defaultAuthProviders } from "@/lib/services/config/authProviders";
	import * as m from "@/lib/paraglide/messages";
</script>

<Dialog.Root
	open={isOpenModal("authProvider")}
	onOpenChange={(open) => (open ? openModal("authProvider") : closeModal("authProvider"))}
>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-50 bg-black/40" />
		<Dialog.Content
			class="fixed left-1/2 top-1/2 z-50 w-80 max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-lg"
		>
			<Dialog.Title class="text-lg font-semibold">{m.auth_choose_provider()}</Dialog.Title>
			<Dialog.Description class="mb-4 text-muted-foreground"
				>{m.auth_choose_provider_description()}</Dialog.Description
			>
			<div class="flex flex-col gap-3">
				{#each getConfig().auth?.providers ?? defaultAuthProviders as provider}
					<Button onclick={() => startLogin(provider)}>
						{#if provider === "discord"}<DiscordIcon class="w-4" />{:else}<Send size={16} />{/if}
						{m.auth_continue_with({ provider: provider === "discord" ? "Discord" : "Telegram" })}
					</Button>
				{/each}
				<Dialog.Close class="rounded-md border p-2">{m.auth_cancel()}</Dialog.Close>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
