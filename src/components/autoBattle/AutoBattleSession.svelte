<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import StatsMainCardEntry from "@/components/ui/popups/common/StatsMainCardEntry.svelte";
	import Countdown from "@/components/utils/Countdown.svelte";
	import type {
		BattleSession,
		BattleSessionState,
		ConnectedAccount
	} from "@/lib/features/autoBattle";
	import * as m from "$lib/paraglide/messages";
	import { mMove, mPokemon, mRaid } from "$lib/services/ingameLocale";
	import { resize } from "$lib/services/assets";
	import { getIconPokemon } from "$lib/services/uicons.svelte";
	import { isMenuSidebar } from "$lib/utils/device";
	import { formatNumber } from "$lib/utils/numberFormat";
	import { getNormalizedForm } from "$lib/utils/pokemonUtils";
	import {
		Clock,
		MapPin,
		ShieldHalf,
		Star,
		Swords,
		TicketCheck,
		TriangleAlert,
		UsersRound
	} from "@lucide/svelte";
	import { slide } from "svelte/transition";

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
		session,
		accounts,
		invitedFriendCodes,
		hasReceivedStatus = false,
		isRequesting = false,
		onretry
	}: {
		session: BattleSession;
		accounts: ConnectedAccount[];
		invitedFriendCodes: string[];
		hasReceivedStatus?: boolean;
		isRequesting?: boolean;
		onretry: () => void;
	} = $props();

	const battle = $derived(session.battle);
	const battlePokemon = $derived({
		...battle,
		form: getNormalizedForm(battle.pokemon_id, battle.form)
	});
	const invitedAccounts = $derived(
		invitedFriendCodes.map(
			(friendCode) =>
				accounts.find((account) => account.friendCode === friendCode) ?? { friendCode }
		)
	);
</script>

<div transition:slide={{ duration: 200 }}>
	<h2 class="text-lg font-semibold mb-2">Ongoing Battle</h2>
	<div class="space-y-5 bg-accent rounded-md px-6 py-5 border">
		<section class="flex items-center gap-4">
			<img
				class="size-12 shrink-0"
				src={resize(getIconPokemon(battlePokemon), { width: 64 })}
				alt={mPokemon(battlePokemon)}
			/>
			<div class="min-w-0">
				<p class="text-xl font-medium">
					{#if battle.type === "raid"}
						{m.pokemon_raid({ pokemon: mPokemon(battlePokemon) })}
					{:else if battle.type === "max_battle"}
						{m.pokemon_max_battle({ pokemon: mPokemon(battlePokemon) })}
					{/if}
				</p>
			</div>
		</section>

		<section>
			<div
				class="flex gap-2"
				class:flex-col={isMenuSidebar()}
				class:overflow-x-auto={!isMenuSidebar()}
			>
				{#each invitedAccounts as account (account.friendCode)}
					{@const invitee = session.invitees?.[account.friendCode]}
					<div class="rounded-md bg-accent-highlight px-5 py-3" class:shrink-0={!isMenuSidebar()}>
						<p class="font-semibold">
							{"nickname" in account ? account.nickname : account.friendCode}
						</p>
						<p class="mt-1 flex items-center gap-1.5 text-sm">
							{#if invitee?.in_lobby}
								<UsersRound class="size-3.5" />
								{m.auto_battle_player_in_lobby()}
							{:else if invitee?.invited || !invitee}
								<TicketCheck class="size-3.5" />
								{m.auto_battle_player_invited()}
							{:else}
								<Clock class="size-3.5" />
								Inviting...
							{/if}
						</p>
					</div>
				{/each}
			</div>
		</section>

		<section class="space-y-3">
			<StatsMainCardEntry Icon={Clock} name={m.auto_battle_lobby_join_ends()}>
				{#snippet value()}
					{#if session.lobby?.join_end_ms}
						<Countdown expireTime={Math.floor(session.lobby.join_end_ms / 1000)} />
					{:else}
						N/A
					{/if}
				{/snippet}
			</StatsMainCardEntry>
			<StatsMainCardEntry
				Icon={UsersRound}
				name={m.auto_battle_players_in_lobby()}
				value={session.lobby?.player_count ?? 0}
			/>
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
			<StatsMainCardEntry
				Icon={Star}
				name={m.tier()}
			>
				{#snippet value()}
					{#if battle.type === "raid"}
						{mRaid(battle.level)}
					{:else if battle.type === "max_battle"}
						{m.x_start_max_battle({ level: battle.level })}
					{:else}
						{battle.level}
					{/if}
				{/snippet}
			</StatsMainCardEntry>
			<StatsMainCardEntry Icon={MapPin} name={m.auto_battle_location()} value={battle.address} />
		</section>
	</div>
</div>
