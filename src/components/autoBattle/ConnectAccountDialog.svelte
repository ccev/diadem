<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import {
		connectAccount,
		sendFriendInvite,
		type ConnectedAccount
	} from "@/lib/features/autoBattle";
	import * as m from "$lib/paraglide/messages";
	import { Dialog, PinInput } from "bits-ui";
	import {
		ClockAlert,
		Ellipsis,
		MapPin,
		ShieldHalf,
		Star,
		Swords,
		UserPlus,
		UsersRound,
		TriangleAlert
	} from "@lucide/svelte";
	import { getIconTeam } from "$lib/services/uicons.svelte";
	import { mTeam } from "$lib/services/ingameLocale";

	let {
		open = $bindable(),
		onaccountconnected
	}: {
		open: boolean;
		onaccountconnected: (account: ConnectedAccount) => void;
	} = $props();

	let friendCode = $state("");
	let connectedAccount = $state<ConnectedAccount | undefined>(undefined);
	let isAddingAccount = $state(false);
	let requestError = $state<string | undefined>(undefined);

	function reset() {
		friendCode = "";
		connectedAccount = undefined;
		requestError = undefined;
	}

	async function addAccount() {
		if (isAddingAccount) return;
		requestError = undefined;
		isAddingAccount = true;
		try {
			const { friend } = await sendFriendInvite(friendCode);
			const { account } = await connectAccount(friend.friend_code);
			if (!account) throw new Error("Connected account could not be saved");
			onaccountconnected(account);
			friendCode = "";
			connectedAccount = account;
		} catch (error) {
			requestError = error instanceof Error ? error.message : "Unable to connect this account.";
		} finally {
			isAddingAccount = false;
			if (!open) reset();
		}
	}
</script>

<Dialog.Root
	bind:open
	onOpenChange={(isOpen) => {
		if (!isOpen) reset();
	}}
>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px]" />
		<Dialog.Content
			class="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-md border border-border bg-card p-5 shadow-popover outline-hidden"
		>
			<Dialog.Title class="flex gap-2 items-center font-semibold">
				<UserPlus class="size-4" />
				Connect a new account
			</Dialog.Title>
			{#if connectedAccount}
				<div class="mt-4 rounded-md bg-accent py-3 px-4 -mx-1 flex justify-between items-center">
					<div>
						<p class="font-medium">{connectedAccount.nickname}</p>
						<p class="text-muted-foreground">
							{m.auto_battle_account_level({ level: connectedAccount.level })}
						</p>
					</div>
					<img
						class="shrink-0 size-9"
						src={getIconTeam(connectedAccount.team)}
						alt={mTeam(connectedAccount.team)}
					/>
				</div>
				<p class="mt-3 text-muted-foreground">
					A Friend Request has been sent! Please accept to start receiving invites
				</p>
				<Button class="mt-4 w-full" onclick={() => (open = false)}>{m.auto_battle_done()}</Button>
			{:else}
				<form
					class="mt-3"
					onsubmit={(event) => {
						event.preventDefault();
						void addAccount();
					}}
				>
					<PinInput.Root
						bind:value={friendCode}
						maxlength={12}
						textalign="center"
						pattern="[0-9]*"
						pasteTransformer={(value) => value.replaceAll(/\D/g, "").slice(0, 12)}
						aria-label={m.auto_battle_friend_code()}
						class="flex justify-center gap-1 bg-accent rounded-md pb-2 px-3 pt-2.5"
					>
						{#snippet children({ cells })}
							{#each cells as cell, index (index)}
								{#if index === 4 || index === 8}
									<span class="w-1.5" aria-hidden="true"></span>
								{/if}
								<PinInput.Cell
									{cell}
									class="data-active:bg-input rounded-sm w-9 h-9 pb-1 flex justify-center items-end text-lg font-medium"
								>
									{cell.char}
								</PinInput.Cell>
							{/each}
						{/snippet}
					</PinInput.Root>
					<p class="text-muted-foreground mt-3 text-center">
						Please enter your account's friend code
					</p>
					{#if requestError}
						<p class="mt-3">{requestError}</p>
					{/if}
					<Button
						class="w-full mt-4"
						type="submit"
						disabled={isAddingAccount || friendCode.length !== 12}
					>
						{isAddingAccount ? "Sending Friend Request" : "Send Friend Request"}
					</Button>
				</form>
			{/if}
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
