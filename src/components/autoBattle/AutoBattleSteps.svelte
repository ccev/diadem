<script lang="ts">
	import AutoBattleControls from "@/components/autoBattle/AutoBattleControls.svelte";
	import AutoBattleSession from "@/components/autoBattle/AutoBattleSession.svelte";
	import ConnectAccountDialog from "@/components/autoBattle/ConnectAccountDialog.svelte";
	import {
		AutoBattleApiError,
		getBattleStatus,
		getConnectedAccounts,
		getFriendProfiles,
		removeConnectedAccount,
		startBattle,
		type AvailableBoss,
		type Battle,
		type BattleSession,
		type ConnectedAccount
	} from "@/lib/features/autoBattle";
	import * as m from "$lib/paraglide/messages";
	import { onMount, untrack } from "svelte";

	const POLL_INTERVAL_MS = 1000;

	let {
		selectedBattle,
		initialAccounts,
		oninvitesent
	}: {
		selectedBattle?: AvailableBoss;
		initialAccounts: ConnectedAccount[];
		oninvitesent?: () => void;
	} = $props();

	let accounts = $state<ConnectedAccount[]>([]);
	let selectedFriendCodes = $state<string[]>([]);
	let session = $state<BattleSession | undefined>(undefined);
	let hasReceivedSessionStatus = $state(false);
	let invitedFriendCodes = $state<string[]>([]);
	let isConnecting = $state(false);
	let isRequesting = $state(false);
	let requestError = $state<string | undefined>(undefined);
	let isRefreshing = false;
	let isRefreshingAccounts = false;
	let pollTimer: number | undefined = undefined;
	let accountPollTimer: number | undefined = undefined;

	const isInteractionDisabled = $derived(isRequesting);

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
		accountPollTimer = window.setInterval(() => void refreshAccounts(), POLL_INTERVAL_MS);
		return () => {
			stopPolling();
			stopAccountPolling();
		};
	});

	function openConnectDialog() {
		requestError = undefined;
		isConnecting = true;
	}

	function toggleAccount(account: ConnectedAccount) {
		if (account.state !== "active") return;
		selectedFriendCodes = selectedFriendCodes.includes(account.friendCode)
			? selectedFriendCodes.filter((friendCode) => friendCode !== account.friendCode)
			: [...selectedFriendCodes, account.friendCode];
	}

	async function refreshAccounts() {
		if (!accounts.length || isRefreshingAccounts) return;
		isRefreshingAccounts = true;
		try {
			const friendCodes = accounts.map((account) => account.friendCode);
			const profiles = [];
			for (let index = 0; index < friendCodes.length; index += 10) {
				const result = await getFriendProfiles(friendCodes.slice(index, index + 10));
				profiles.push(...result.profiles);
			}
			const profilesByCode = new Map(profiles.map((profile) => [profile.friend_code, profile]));
			accounts = accounts.map((account) => {
				const profile = profilesByCode.get(account.friendCode);
				if (!profile) return { ...account, state: "inactive" };
				return {
					...account,
					nickname: profile.name,
					team: profile.team_id,
					level: profile.level,
					state: profile.already_friends ? "active" : "pending"
				};
			});
			selectedFriendCodes = selectedFriendCodes.filter((friendCode) =>
				accounts.some((account) => account.friendCode === friendCode && account.state === "active")
			);
		} catch {
			// Current account data remains usable when profile refresh is temporarily unavailable.
		} finally {
			isRefreshingAccounts = false;
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
		if (!boss || !friendCodes.length) return false;

		isRequesting = true;
		requestError = undefined;
		hasReceivedSessionStatus = false;
		try {
			const battleStart = await startBattle(friendCodes, boss);
			invitedFriendCodes = [...friendCodes];
			session = { ...battleStart, state: "queued" };
			oninvitesent?.();
			await refreshSession();
			startPolling();
			return true;
		} catch (error) {
			requestError = error instanceof Error ? error.message : "Unable to request a remote invite.";
			return false;
		} finally {
			isRequesting = false;
		}
	}

	function startPolling() {
		stopPolling();
		pollTimer = window.setInterval(() => void refreshSession(), POLL_INTERVAL_MS);
	}

	function stopPolling() {
		if (pollTimer !== undefined) window.clearInterval(pollTimer);
		pollTimer = undefined;
	}

	function stopAccountPolling() {
		if (accountPollTimer !== undefined) window.clearInterval(accountPollTimer);
		accountPollTimer = undefined;
	}

	async function refreshSession() {
		if (!session || isRefreshing) return;
		isRefreshing = true;
		try {
			session = await getBattleStatus(session.session_id);
			hasReceivedSessionStatus = true;
			if (session.state === "failed") requestError = session.error ?? m.auto_battle_failed();
			if (session.state === "completed" || session.state === "failed") stopPolling();
		} catch (error) {
			if (error instanceof AutoBattleApiError && error.status !== 401) requestError = error.message;
		} finally {
			isRefreshing = false;
		}
	}
</script>

<div class="space-y-6">
	<AutoBattleControls
		{accounts}
		{selectedFriendCodes}
		{selectedBattle}
		disabled={isInteractionDisabled}
		preparingInvite={isRequesting}
		ontoggleaccount={toggleAccount}
		onconnectaccount={openConnectDialog}
		onremoveaccount={(friendCode) => void removeAccount(friendCode)}
		onrequestinvite={() => startSession(selectedFriendCodes, selectedBattle)}
	/>
	{#if session}
		<AutoBattleSession
			{session}
			{accounts}
			{invitedFriendCodes}
			hasReceivedStatus={hasReceivedSessionStatus}
			{isRequesting}
			onretry={() => void startSession(invitedFriendCodes, session?.battle)}
		/>
	{/if}
</div>

{#if requestError}
	<p class="mt-4 text-sm text-destructive">{requestError}</p>
{/if}

<ConnectAccountDialog
	bind:open={isConnecting}
	onaccountconnected={(account) => {
		accounts = [...accounts.filter((item) => item.friendCode !== account.friendCode), account];
	}}
/>
