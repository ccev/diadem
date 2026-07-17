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
		type BattleSessionState,
		type ConnectedAccount
	} from "@/lib/features/autoBattle";
	import * as m from "$lib/paraglide/messages";
	import { mPokemon, mMove, mRaid } from "@/lib/services/ingameLocale";
	import { getIconPokemon } from "$lib/services/uicons.svelte";
	import { resize } from "$lib/services/assets";
	import { getNormalizedForm } from "$lib/utils/pokemonUtils";
	import { formatNumber } from "$lib/utils/numberFormat";
	import { isMenuSidebar } from "@/lib/utils/device";
	import { DropdownMenu } from "bits-ui";
	import {
		Ellipsis,
		Info,
		MapPin,
		ShieldHalf,
		Star,
		Swords,
		Ticket,
		UserPlus,
		UsersRound
	} from "@lucide/svelte";
	import { onMount, untrack } from "svelte";
	import StatsMainCardEntry from "@/components/ui/popups/common/StatsMainCardEntry.svelte";

	const POLL_INTERVAL_MS = 5000;

	const stateLabels: Record<BattleSessionState, () => string> = {
		queued: m.auto_battle_state_queued,
		awaiting_friend_accept: m.auto_battle_state_awaiting_friend_accept,
		friend_ready: m.auto_battle_state_friend_ready,
		scanning_battle: m.auto_battle_state_scanning_battle,
		finding_lobby: m.auto_battle_state_finding_lobby,
		inviting: m.auto_battle_state_inviting,
		invites_sent: m.auto_battle_state_invites_sent,
		completed: m.auto_battle_state_completed,
		failed: m.auto_battle_state_failed
	};

	let {
		selectedBattle,
		initialAccounts
	}: {
		selectedBattle?: AvailableBoss;
		initialAccounts: ConnectedAccount[];
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
	let isRefreshing = false;
	let pollTimer: number | undefined = undefined;

	const selectedAccounts = $derived(
		accounts.filter((account) => selectedFriendCodes.includes(account.friendCode))
	);
	const invitedAccounts = $derived(
		invitedFriendCodes.map(
			(friendCode) =>
				accounts.find((account) => account.friendCode === friendCode) ?? { friendCode }
		)
	);

	// Default-select the account when there is only a single invitable one
	$effect(() => {
		const active = accounts.filter((account) => account.state === "active");
		if (active.length !== 1) return;
		untrack(() => {
			if (!selectedFriendCodes.includes(active[0].friendCode)) {
				selectedFriendCodes = [active[0].friendCode];
			}
		});
	});

	onMount(() => {
		accounts = initialAccounts;
		void loadAccounts();
		return stopPolling;
	});

	function getPokemon(battle: AvailableBoss | Battle) {
		return { ...battle, form: getNormalizedForm(battle.pokemon_id, battle.form) };
	}

	function getStateExplanation(state: ConnectedAccount["state"]) {
		if (state === "pending") return m.auto_battle_account_pending();
		if (state === "inactive") return m.auto_battle_account_inactive();
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

	async function startSession(friendCodes: string[], boss: AvailableBoss | Battle | undefined) {
		if (!boss || !friendCodes.length) return;

		isRequesting = true;
		requestError = undefined;
		try {
			const battleStart = await startBattle(friendCodes, boss);
			invitedFriendCodes = [...friendCodes];
			session = { ...battleStart, state: "queued" };
			await refreshSession();
			startPolling();
		} catch (error) {
			requestError = error instanceof Error ? error.message : "Unable to request a remote invite.";
		} finally {
			isRequesting = false;
		}
	}

	function closeSession() {
		stopPolling();
		session = undefined;
		invitedFriendCodes = [];
		requestError = undefined;
	}

	function startPolling() {
		stopPolling();
		pollTimer = window.setInterval(() => void refreshSession(), POLL_INTERVAL_MS);
	}

	function stopPolling() {
		if (pollTimer !== undefined) window.clearInterval(pollTimer);
		pollTimer = undefined;
	}

	async function refreshSession() {
		if (!session || isRefreshing) return;
		isRefreshing = true;
		try {
			session = await getBattleStatus(session.session_id);
			if (session.state === "failed") requestError = session.error ?? m.auto_battle_failed();
			if (session.state === "completed" || session.state === "failed") stopPolling();
		} catch (error) {
			if (error instanceof AutoBattleApiError && error.status !== 401) requestError = error.message;
		} finally {
			isRefreshing = false;
		}
	}
</script>

{#if session}
	{@const battle = session.battle}
	{@const battlePokemon = getPokemon(battle)}
	<div class="space-y-5">
		<section class="flex items-center gap-4">
			<img
				class="size-16 shrink-0"
				src={resize(getIconPokemon(battlePokemon), { width: 64 })}
				alt={mPokemon(battlePokemon)}
			/>
			<div class="min-w-0">
				<p class="truncate text-lg font-semibold">{mPokemon(battlePokemon)}</p>
				<p class="text-sm text-muted-foreground">{stateLabels[session.state]()}</p>
			</div>
		</section>

		<section class="space-y-3 rounded-lg border border-border bg-accent px-4 py-3">
			<StatsMainCardEntry
				Icon={Star}
				name={m.tier()}
				value={battle.type === "raid" ? mRaid(battle.level) : (battle.level ?? m.unknown())}
			/>
			{#if battle.cp}
				<StatsMainCardEntry Icon={ShieldHalf} name={m.cp()} value={formatNumber(battle.cp)} />
			{/if}
			<StatsMainCardEntry Icon={Swords} name={m.popup_pokemon_moves()}>
				{#snippet value()}
					<p class="flex gap-2">
						{#if battle.move_1 && battle.move_2}
							<span>{mMove(battle.move_1)}</span>
							<span>·</span>
							<span>{mMove(battle.move_2)}</span>
						{:else}
							{m.unknown()}
						{/if}
					</p>
				{/snippet}
			</StatsMainCardEntry>
			<StatsMainCardEntry Icon={MapPin} name={m.auto_battle_location()}>
				{#snippet value()}
					<p>
						{battle.name ?? battle.address ?? `${battle.latitude}, ${battle.longitude}`}
						{#if battle.name && battle.address}
							<span class="block text-xs text-muted-foreground">{battle.address}</span>
						{/if}
					</p>
				{/snippet}
			</StatsMainCardEntry>
			<StatsMainCardEntry
				Icon={UsersRound}
				name={m.auto_battle_players_in_lobby()}
				value={session.lobby?.player_count ?? 0}
			/>
		</section>

		<section class="space-y-2">
			<p class="text-sm font-semibold">{m.auto_battle_invited_players()}</p>
			<div class="flex flex-wrap gap-2">
				{#each invitedAccounts as account (account.friendCode)}
					<span class="rounded-md bg-accent px-3 py-1.5 text-sm">
						{"nickname" in account ? account.nickname : account.friendCode}
					</span>
				{/each}
			</div>
		</section>

		{#if session.state === "failed"}
			<div class="flex gap-2">
				<Button
					class="flex-1"
					disabled={isRequesting}
					onclick={() => void startSession(invitedFriendCodes, battle)}
				>
					{m.auto_battle_retry()}
				</Button>
				<Button class="flex-1" variant="secondary" onclick={closeSession}>
					{m.auto_battle_done()}
				</Button>
			</div>
		{:else if session.state === "completed"}
			<Button class="w-full" onclick={closeSession}>{m.auto_battle_done()}</Button>
		{/if}
	</div>
{:else}
	<div class="space-y-5">
		<section class="space-y-3">
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
						aria-label={m.auto_battle_friend_code()}
						inputmode="numeric"
						placeholder={m.auto_battle_friend_code()}
					/>
					<Button size="sm" type="submit" disabled={isAddingAccount}>
						{isAddingAccount ? m.auto_battle_connecting() : m.connect()}
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
							<p class="text-xs text-muted-foreground">{m.level()} {account.level}</p>
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
									{m.auto_battle_remove_account()}
								</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</div>
				{/each}
				<Button
					class={isMenuSidebar() ? "w-full" : "h-auto min-w-36 shrink-0"}
					variant="outline"
					onclick={() => (isConnecting = !isConnecting)}
				>
					<UserPlus class="size-3.5" />
					{m.auto_battle_connect_account()}
				</Button>
			</div>

			{#if accounts.length === 0}
				<p class="text-sm text-muted-foreground">{m.auto_battle_hint_connect()}</p>
			{:else if accounts.length > 1 && selectedAccounts.length === 0}
				<p class="text-sm text-muted-foreground">{m.auto_battle_hint_select()}</p>
			{/if}
		</section>

		{#if selectedBattle}
			{@const selectedPokemon = getPokemon(selectedBattle)}
			<section class="flex items-center gap-4">
				<img
					class="size-16 shrink-0"
					src={resize(getIconPokemon(selectedPokemon), { width: 64 })}
					alt={mPokemon(selectedPokemon)}
				/>
				<div class="min-w-0 flex-1 space-y-2">
					<p class="truncate font-semibold">{mPokemon(selectedPokemon)}</p>
					<Button
						disabled={isRequesting || selectedAccounts.length === 0}
						onclick={() => void startSession(selectedFriendCodes, selectedBattle)}
					>
						<Ticket class="size-3.5" />
						{m.auto_battle_request_invite()}
					</Button>
				</div>
			</section>
		{/if}
	</div>
{/if}

{#if requestError}
	<p class="mt-4 text-sm text-destructive">{requestError}</p>
{/if}
