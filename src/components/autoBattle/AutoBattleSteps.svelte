<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import {
		AutoBattleApiError,
		connectAccount,
		getBattleStatus,
		getConnectedAccounts,
		removeConnectedAccount,
		startBattle,
		type AvailableBoss,
		type Battle,
		type BattleSession,
		type ConnectedAccount
	} from "@/lib/features/autoBattle";
	import { mPokemon, mMove, mRaid } from "@/lib/services/ingameLocale";
	import { getIconPokemon } from "@/lib/services/uicons.svelte";
	import { resize } from "@/lib/services/assets";
	import { getNormalizedForm } from "@/lib/utils/pokemonUtils";
	import { formatNumber } from "@/lib/utils/numberFormat";
	import { isMenuSidebar } from "@/lib/utils/device";
	import { DropdownMenu } from "bits-ui";
	import { Ellipsis, Info, Ticket, UserPlus, Users } from "@lucide/svelte";
	import { onMount } from "svelte";

	let {
		selectedBattle,
		initialAccounts,
		compact = false
	}: {
		selectedBattle?: AvailableBoss;
		initialAccounts: ConnectedAccount[];
		compact?: boolean;
	} = $props();

	let accounts = $state<ConnectedAccount[]>([]);
	let selectedFriendCodes = $state<string[]>([]);
	let session = $state<BattleSession | undefined>(undefined);
	let invitedFriendCodes = $state<string[]>([]);
	let friendCode = $state("");
	let isConnecting = $state(false);
	let isAddingAccount = $state(false);
	let isRequesting = $state(false);
	let requestError = $state<string | undefined>(undefined);
	let isPolling = false;
	let isMounted = true;

	const selectedAccounts = $derived(
		accounts.filter((account) => selectedFriendCodes.includes(account.friendCode))
	);
	const invitedAccounts = $derived(
		invitedFriendCodes.map(
			(friendCode) =>
				accounts.find((account) => account.friendCode === friendCode) ?? { friendCode }
		)
	);

	onMount(() => {
		accounts = initialAccounts;
		void loadAccounts();
		return () => {
			isMounted = false;
		};
	});

	function getPokemon(battle: AvailableBoss | Battle) {
		return { ...battle, form: getNormalizedForm(battle.pokemon_id, battle.form) };
	}

	function getStateExplanation(state: ConnectedAccount["state"]) {
		if (state === "pending") return "Waiting for this player to accept the friend request.";
		if (state === "inactive")
			return "This player changed their friend code. Reconnect their new account.";
	}

	function toggleAccount(account: ConnectedAccount) {
		if (account.state !== "active") return;
		selectedFriendCodes = selectedFriendCodes.includes(account.friendCode)
			? selectedFriendCodes.filter((friendCode) => friendCode !== account.friendCode)
			: [...selectedFriendCodes, account.friendCode];
	}

	async function refreshAccounts() {
		try {
			accounts = (await getConnectedAccounts(true)).accounts;
			selectedFriendCodes = selectedFriendCodes.filter((friendCode) =>
				accounts.some((account) => account.friendCode === friendCode && account.state === "active")
			);
		} catch {
			// Initial data remains usable when profile refresh is temporarily unavailable.
		}
	}

	async function loadAccounts() {
		try {
			accounts = (await getConnectedAccounts()).accounts;
			await refreshAccounts();
		} catch {
			// Accounts are only available to authenticated users.
		}
	}

	async function addAccount() {
		if (isAddingAccount) return;
		requestError = undefined;
		isAddingAccount = true;
		try {
			const { account } = await connectAccount(friendCode);
			if (!account) throw new Error("Connected account could not be saved");
			accounts = [...accounts.filter((item) => item.friendCode !== account.friendCode), account];
			friendCode = "";
			isConnecting = false;
		} catch (error) {
			requestError = error instanceof Error ? error.message : "Unable to connect this account.";
		} finally {
			isAddingAccount = false;
		}
	}

	async function removeAccount(friendCode: string) {
		requestError = undefined;
		try {
			await removeConnectedAccount(friendCode);
			accounts = accounts.filter((account) => account.friendCode !== friendCode);
			selectedFriendCodes = selectedFriendCodes.filter((code) => code !== friendCode);
		} catch (error) {
			requestError = error instanceof Error ? error.message : "Unable to remove this account.";
		}
	}

	async function requestInvite(boss: AvailableBoss | Battle | undefined) {
		if (!boss) return;
		if (!selectedFriendCodes.length) {
			requestError = "Select at least one active account first.";
			return;
		}

		isRequesting = true;
		requestError = undefined;
		try {
			const battleStart = await startBattle(selectedFriendCodes, boss);
			invitedFriendCodes = [...selectedFriendCodes];
			session = { ...battleStart, state: "queued" };
			await refreshSession();
			void pollSession(battleStart.session_id);
		} catch (error) {
			requestError =
				error instanceof AutoBattleApiError || error instanceof Error
					? error.message
					: "Unable to request a remote invite.";
		} finally {
			isRequesting = false;
		}
	}

	async function refreshSession() {
		if (!session || isPolling) return;
		isPolling = true;
		try {
			session = await getBattleStatus(session.session_id);
			if (session.error) requestError = session.error;
		} catch (error) {
			if (error instanceof AutoBattleApiError && error.status !== 401) requestError = error.message;
		} finally {
			isPolling = false;
		}
	}

	async function pollSession(sessionId: string) {
		while (
			isMounted &&
			session?.session_id === sessionId &&
			!["completed", "failed"].includes(session.state)
		) {
			await new Promise((resolve) => window.setTimeout(resolve, 3000));
			await refreshSession();
		}
	}
</script>

{#if compact}
	<div class="flex items-center justify-between py-1">
		<div>
			<p class="text-sm font-semibold">Auto Battle</p>
			<p class="text-xs text-muted-foreground">
				{selectedAccounts.length} account{selectedAccounts.length === 1 ? "" : "s"} selected
			</p>
		</div>
		<Users class="size-5 text-muted-foreground" />
	</div>
{:else}
	<div class="space-y-6">
		{#if session}
			{@const battlePokemon = getPokemon(session.battle)}
			<section class="space-y-3">
				<div class="flex items-center justify-between gap-3">
					<div>
						<p class="text-sm font-semibold">Invite in progress</p>
						<p class="text-xs capitalize text-muted-foreground">
							{session.state.replaceAll("_", " ")}
						</p>
					</div>
					<Button size="sm" variant="outline" onclick={() => void refreshSession()}>Refresh</Button>
				</div>

				<div class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
					<div>
						<p class="text-xs text-muted-foreground">Boss</p>
						<p>{mPokemon(battlePokemon)}</p>
					</div>
					<div>
						<p class="text-xs text-muted-foreground">Battle</p>
						<p>{session.battle.type === "raid" ? mRaid(session.battle.level) : "Max Battle"}</p>
					</div>
					<div>
						<p class="text-xs text-muted-foreground">CP</p>
						<p>{session.battle.cp ? formatNumber(session.battle.cp) : "Unavailable"}</p>
					</div>
					<div>
						<p class="text-xs text-muted-foreground">Players in lobby</p>
						<p>{session.lobby?.player_count ?? 0}</p>
					</div>
					{#if session.battle.move_1 || session.battle.move_2}
						<div class="col-span-2">
							<p class="text-xs text-muted-foreground">Moves</p>
							<p>
								{[mMove(session.battle.move_1), mMove(session.battle.move_2)]
									.filter(Boolean)
									.join(" / ")}
							</p>
						</div>
					{/if}
					<div class="col-span-2">
						<p class="text-xs text-muted-foreground">Location</p>
						<p>
							{session.battle.name ??
								session.battle.address ??
								`${session.battle.latitude}, ${session.battle.longitude}`}
						</p>
						{#if session.battle.address && session.battle.name}
							<p class="text-xs text-muted-foreground">{session.battle.address}</p>
						{/if}
					</div>
				</div>
			</section>

			<section class="space-y-2">
				<p class="text-sm font-semibold">Invited players</p>
				<div class="space-y-1.5">
					{#each invitedAccounts as account (account.friendCode)}
						<p class="text-sm">{"nickname" in account ? account.nickname : account.friendCode}</p>
					{/each}
				</div>
			</section>

			{#if session.state === "failed"}
				<p class="text-sm text-destructive">
					{session.error ?? "The invite could not be completed."}
				</p>
			{/if}
		{/if}

		<section class="space-y-3">
			<div class="flex items-center justify-between gap-3">
				<div>
					<p class="text-sm font-semibold">Invite accounts</p>
					<p class="text-xs text-muted-foreground">
						Choose the players that should receive this invite.
					</p>
				</div>
			</div>

			{#if isConnecting}
				<form
					class="flex gap-2"
					onsubmit={(event) => {
						event.preventDefault();
						void addAccount();
					}}
				>
					<input
						class="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
						bind:value={friendCode}
						aria-label="Friend code"
						inputmode="numeric"
						placeholder="Friend code"
					/>
					<Button size="sm" type="submit" disabled={isAddingAccount}>
						{isAddingAccount ? "Connecting..." : "Connect"}
					</Button>
				</form>
			{/if}

			<div class={isMenuSidebar() ? "space-y-2" : "flex gap-2 overflow-x-auto pb-1"}>
				{#each accounts as account (account.friendCode)}
					<div
						class={[
							"flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm",
							!isMenuSidebar() && "min-w-44 shrink-0",
							selectedFriendCodes.includes(account.friendCode) &&
								"bg-primary/15 ring-1 ring-primary",
							account.state !== "active" && "opacity-60"
						]}
					>
						<button
							type="button"
							class="min-w-0 flex-1 text-left"
							aria-pressed={selectedFriendCodes.includes(account.friendCode)}
							disabled={account.state !== "active"}
							onclick={() => toggleAccount(account)}
						>
							<p class="truncate font-medium">{account.nickname}</p>
							<p class="text-xs text-muted-foreground">Level {account.level}</p>
						</button>
						{#if account.state !== "active"}
							<Info
								class="size-4 shrink-0"
								aria-label={getStateExplanation(account.state)}
								title={getStateExplanation(account.state)}
							/>
						{/if}
						<DropdownMenu.Root>
							<DropdownMenu.Trigger>
								{#snippet child({ props })}
									<Button
										size="icon"
										variant="ghost"
										class="size-7!"
										aria-label="Account actions"
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
								<DropdownMenu.Item
									class="cursor-pointer rounded px-3 py-2 text-sm text-destructive data-highlighted:bg-accent"
									onSelect={() => void removeAccount(account.friendCode)}
								>
									Remove account
								</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</div>
				{:else}
					<p class="py-2 text-sm text-muted-foreground">
						Connect an account to request a remote invite.
					</p>
				{/each}
				<Button
					class={isMenuSidebar() ? "w-full" : "h-auto min-w-36 shrink-0"}
					variant="outline"
					onclick={() => (isConnecting = !isConnecting)}
				>
					<UserPlus class="size-3.5" />
					Connect account
				</Button>
			</div>
		</section>

		{#if selectedBattle}
			{@const selectedPokemon = getPokemon(selectedBattle)}
			<section class="flex items-center gap-3">
				<img
					class="size-16 shrink-0"
					src={resize(getIconPokemon(selectedPokemon), { width: 96 })}
					alt={mPokemon(selectedPokemon)}
				/>
				<div class="min-w-0 flex-1">
					<p class="truncate font-semibold">{mPokemon(selectedPokemon)}</p>
					<p class="text-xs text-muted-foreground">
						{selectedBattle.type === "raid" ? mRaid(selectedBattle.level) : "Max Battle"}
					</p>
				</div>
				<Button
					class="shrink-0"
					disabled={isRequesting}
					onclick={() => void requestInvite(selectedBattle)}
				>
					<Ticket class="size-3.5" />
					{session ? "Get invited to another" : "Request invite"}
				</Button>
			</section>
		{/if}

		{#if session}
			<Button
				class="w-full"
				variant="secondary"
				disabled={isRequesting}
				onclick={() => void requestInvite(session?.battle)}
			>
				Retry this battle
			</Button>
		{/if}

		{#if requestError}
			<p class="text-sm text-destructive">{requestError}</p>
		{/if}
	</div>
{/if}
