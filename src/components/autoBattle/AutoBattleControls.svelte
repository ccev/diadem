<script lang="ts">
	import SelectedBattleBoss from "@/components/autoBattle/SelectedBattleBoss.svelte";
	import Button from "@/components/ui/input/Button.svelte";
	import type { AvailableBoss, ConnectedAccount } from "@/lib/features/autoBattle";
	import * as m from "$lib/paraglide/messages";
	import { isMenuSidebar } from "@/lib/utils/device";
	import { DropdownMenu, Popover } from "bits-ui";
	import { ClockAlert, Ellipsis, TriangleAlert, UserPlus } from "@lucide/svelte";

	let {
		accounts,
		selectedFriendCodes,
		selectedBattle,
		disabled = false,
		preparingInvite = false,
		ontoggleaccount,
		onconnectaccount,
		onremoveaccount,
		onrequestinvite
	}: {
		accounts: ConnectedAccount[];
		selectedFriendCodes: string[];
		selectedBattle?: AvailableBoss;
		disabled?: boolean;
		preparingInvite?: boolean;
		ontoggleaccount: (account: ConnectedAccount) => void;
		onconnectaccount: () => void;
		onremoveaccount: (friendCode: string) => void;
		onrequestinvite: () => Promise<boolean>;
	} = $props();

	const selectedAccountCount = $derived(
		accounts.filter((account) => selectedFriendCodes.includes(account.friendCode)).length
	);

	function getStateExplanation(state: ConnectedAccount["state"]) {
		if (state === "pending") return m.auto_battle_account_pending();
		if (state === "inactive") return m.auto_battle_account_inactive();
	}
</script>

<div class="space-y-3">
	<section class="space-y-3">
		<div
			class="flex gap-2 p-1"
			class:flex-col={isMenuSidebar()}
			class:overflow-x-auto={!isMenuSidebar()}
			class:items-center={!isMenuSidebar()}
		>
			{#each accounts as account (account.friendCode)}
				{@const isSelected = selectedFriendCodes.includes(account.friendCode)}
				<div
					class="rounded-md bg-accent px-3 py-2 text-sm"
					class:shrink-0={!isMenuSidebar()}
					class:ring-1={isSelected}
					class:ring-primary={isSelected}
					class:opacity-60={account.state !== "active" || disabled}
				>
					<div class="flex gap-2 items-center">
						<button
							type="button"
							class="min-w-0 flex-1 text-left flex items-center gap-2"
							aria-pressed={isSelected}
							disabled={account.state !== "active" || disabled}
							onclick={() => ontoggleaccount(account)}
						>
							<div
								class="flex size-6 items-center justify-center rounded-full border border-yellow-300 bg-yellow-950 text-yellow-100"
							>
								<span class="text-xs font-semibold">{account.level}</span>
							</div>
							<p class="truncate font-medium">{account.nickname}</p>
						</button>
						{#if account.state !== "active"}
							<Popover.Root>
								<Popover.Trigger>
									{#snippet child({ props })}
										<button
											type="button"
											class="rounded-sm text-yellow-500 outline-none focus-visible:ring-2 focus-visible:ring-ring"
											aria-label={m.auto_battle_account_status()}
											{disabled}
											{...props}
										>
											{#if account.state === "pending"}
												<ClockAlert class="size-4.5" />
											{:else}
												<TriangleAlert class="size-4.5" />
											{/if}
										</button>
									{/snippet}
								</Popover.Trigger>
								<Popover.Content
									class="z-50 w-64 rounded-md border border-border bg-card p-3 text-sm shadow-popover"
									side="top"
								>
									<p>{getStateExplanation(account.state)}</p>
									{#if account.state === "inactive"}
										<Button class="mt-3 w-full" size="sm" {disabled} onclick={onconnectaccount}>
											{m.auto_battle_reconnect_account()}
										</Button>
									{/if}
								</Popover.Content>
							</Popover.Root>
						{/if}
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								{#snippet child({ props })}
									<Button
										size="icon"
										variant="ghost"
										class="size-7!"
										aria-label="Account actions"
										{disabled}
										{...props}
									>
										<Ellipsis class="size-4" />
									</Button>
								{/snippet}
							</DropdownMenu.Trigger>
							<DropdownMenu.Content
								class="rounded-md border border-border bg-card p-1 shadow-popover"
								side={isMenuSidebar() ? "right" : "top"}
							>
								{#if account.state === "inactive"}
									<DropdownMenu.Item
										class="cursor-pointer rounded px-3 py-2"
										onSelect={onconnectaccount}
									>
										{m.auto_battle_reconnect_account()}
									</DropdownMenu.Item>
								{/if}
								<DropdownMenu.Item
									class="cursor-pointer rounded px-3 py-2"
									onSelect={() => onremoveaccount(account.friendCode)}
								>
									{m.auto_battle_remove_account()}
								</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</div>
				</div>
			{/each}
			<Button
				class={isMenuSidebar() ? "w-full" : "shrink-0"}
				variant="outline"
				{disabled}
				onclick={onconnectaccount}
			>
				<UserPlus class="size-3.5" />
				{m.auto_battle_connect_account()}
			</Button>
		</div>

		{#if accounts.length === 0}
			<p class="text-sm text-muted-foreground">{m.auto_battle_hint_connect()}</p>
		{:else if accounts.length > 1 && selectedAccountCount === 0}
			<p class="text-sm text-muted-foreground">{m.auto_battle_hint_select()}</p>
		{/if}
	</section>

	{#if selectedBattle}
		<SelectedBattleBoss
			boss={selectedBattle}
			disabled={disabled || selectedAccountCount === 0}
			{preparingInvite}
			{onrequestinvite}
		/>
	{/if}
</div>
