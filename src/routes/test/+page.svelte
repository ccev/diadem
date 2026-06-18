<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import {
		getNotificationPermission,
		getNotifications,
		requestNotificationPermission,
		sendNotification
	} from "@/lib/features/notifications/notifications.svelte";
	import {
		getPushState,
		refreshPushState,
		subscribeToPush,
		unsubscribeFromPush
	} from "@/lib/features/notifications/push.svelte";
	import type {
		FiltersetPokemon,
		FiltersetRaid,
		FiltersetQuest,
		FiltersetInvasion,
		FiltersetMaxBattle
	} from "@/lib/features/filters/filtersets";
	import {
		emptyPushAlertRules,
		type PushAlertRules
	} from "@/lib/features/notifications/pushTypes";
	import { onMount } from "svelte";

	let sentCount = $state(0);
	let pushStatus = $state("");
	let fakeGolbatStatus = $state("");
	const push = getPushState();

	let rules = $state<PushAlertRules>(emptyPushAlertRules());

	// Pokemon editor state
	let newPokemonId = $state(0);
	let newMinIv = $state(0);

	// Raid editor state
	let raidBossId = $state(0);
	let raidLevel = $state(0);

	// Quest editor state
	let questPokemonId = $state(0);
	let questItemId = $state(0);

	// Invasion editor state
	let invasionCharId = $state(0);
	let invasionRewardId = $state(0);

	// Max Battle editor state
	let maxBattleBossId = $state(0);
	let maxBattleActive = $state(false);

	onMount(() => {
		refreshPushState();
		loadRules();
	});

	async function loadRules() {
		const res = await fetch("/api/notifications/alerts");
		const data = await res.json();
		if (!data.error) {
			const result = typeof data.result === "string" ? JSON.parse(data.result) : data.result;
			rules = result ?? emptyPushAlertRules();
		}
	}

	async function saveRules() {
		await fetch("/api/notifications/alerts", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(rules)
		});
	}

	// Pokemon
	function addRule() {
		if (!newPokemonId) return;
		const filterset: FiltersetPokemon = {
			id: crypto.randomUUID(),
			enabled: true,
			title: { message: "", title: `#${newPokemonId}` },
			icon: { isUserSelected: false },
			pokemon: [{ pokemon_id: newPokemonId, form: 0 }]
		};
		if (newMinIv > 0) filterset.iv = { min: newMinIv, max: 100 };
		rules.pokemon = [...rules.pokemon, filterset];
		newPokemonId = 0;
		newMinIv = 0;
		saveRules();
	}

	function removeRule(id: string) {
		rules.pokemon = rules.pokemon.filter((r) => r.id !== id);
		saveRules();
	}

	// Raid
	function addRaidRule() {
		if (!raidBossId && !raidLevel) return;
		const filterset: FiltersetRaid = {
			id: crypto.randomUUID(),
			enabled: true,
			title: {
				message: "",
				title: raidBossId ? `Raid #${raidBossId}` : `Lvl ${raidLevel} raid`
			},
			icon: { isUserSelected: false },
			bosses: raidBossId ? [{ pokemon_id: raidBossId, form: 0 }] : undefined,
			levels: raidLevel ? [raidLevel] : undefined
		};
		rules.raid = [...rules.raid, filterset];
		raidBossId = 0;
		raidLevel = 0;
		saveRules();
	}

	function removeRaidRule(id: string) {
		rules.raid = rules.raid.filter((r) => r.id !== id);
		saveRules();
	}

	// Quest
	function addQuestRule() {
		if (!questPokemonId && !questItemId) return;
		const rewardId = questPokemonId || questItemId;
		const filterset: FiltersetQuest = {
			id: crypto.randomUUID(),
			enabled: true,
			title: { message: "", title: `Quest reward #${rewardId}` },
			icon: { isUserSelected: false },
			pokemon: questPokemonId ? [{ pokemon_id: questPokemonId, form: 0 }] : undefined,
			item: questItemId ? [{ id: String(questItemId) }] : undefined
		};
		rules.quest = [...rules.quest, filterset];
		questPokemonId = 0;
		questItemId = 0;
		saveRules();
	}

	function removeQuestRule(id: string) {
		rules.quest = rules.quest.filter((r) => r.id !== id);
		saveRules();
	}

	// Invasion
	function addInvasionRule() {
		if (!invasionCharId && !invasionRewardId) return;
		const filterset: FiltersetInvasion = {
			id: crypto.randomUUID(),
			enabled: true,
			title: {
				message: "",
				title: invasionCharId
					? `Invasion grunt ${invasionCharId}`
					: `Invasion #${invasionRewardId}`
			},
			icon: { isUserSelected: false },
			characters: invasionCharId ? [invasionCharId] : undefined,
			rewards: invasionRewardId ? [{ pokemon_id: invasionRewardId, form: 0 }] : undefined
		};
		rules.invasion = [...rules.invasion, filterset];
		invasionCharId = 0;
		invasionRewardId = 0;
		saveRules();
	}

	function removeInvasionRule(id: string) {
		rules.invasion = rules.invasion.filter((r) => r.id !== id);
		saveRules();
	}

	// Max Battle
	function addMaxBattleRule() {
		if (!maxBattleBossId && !maxBattleActive) return;
		const filterset: FiltersetMaxBattle = {
			id: crypto.randomUUID(),
			enabled: true,
			title: {
				message: "",
				title: maxBattleBossId ? `Max battle #${maxBattleBossId}` : `Max battle active`
			},
			icon: { isUserSelected: false },
			bosses: maxBattleBossId
				? [{ pokemon_id: maxBattleBossId, form: 0, bread_mode: undefined }]
				: undefined,
			isActive: maxBattleActive || undefined
		};
		rules.maxBattle = [...rules.maxBattle, filterset];
		maxBattleBossId = 0;
		maxBattleActive = false;
		saveRules();
	}

	function removeMaxBattleRule(id: string) {
		rules.maxBattle = rules.maxBattle.filter((r) => r.id !== id);
		saveRules();
	}

	function sendTestNotification() {
		sentCount += 1;
		sendNotification({
			title: "Test notification",
			body: `This is notification #${sentCount}.`,
			target: { type: "pokemon", label: "Pokemon spawn" },
			native: getNotificationPermission() === "granted"
		});
	}

	async function togglePush() {
		if (push.subscribed) await unsubscribeFromPush();
		else await subscribeToPush();
	}

	async function sendTestPush() {
		const res = await fetch("/api/notifications/test", { method: "POST" });
		const data = await res.json();
		pushStatus = data.error ? `Error: ${data.error}` : `Sent to ${data.sent} device(s).`;
	}

	async function sendFakeGolbatWebhook() {
		fakeGolbatStatus = "Sending fake Golbat webhook...";
		const res = await fetch("/test/fake-golbat", { method: "POST" });
		const data = await res.json();
		const dispatch = data.dispatch;
		fakeGolbatStatus = data.error
			? `Error: ${data.error}`
			: `Generated ${data.generated} spawn(s), received ${data.received}, entries ${dispatch?.entries ?? 0}, matched ${dispatch?.matched ?? 0}, sent ${dispatch?.sent ?? 0}, denied ${dispatch?.permissionDenied ?? 0}, missed ${dispatch?.ruleMiss ?? 0}, IV denied ${dispatch?.ivDenied ?? 0}.`;
	}
</script>

<svelte:head>
	<title>Notification Test</title>
</svelte:head>

<main class="bg-background text-foreground min-h-screen p-6">
	<section class="mx-auto flex max-w-xl flex-col gap-6 rounded-xl border p-6 shadow-sm">
		<div>
			<p class="text-muted-foreground text-sm uppercase tracking-wide">Test page</p>
			<h1 class="mt-2 text-3xl font-semibold">Notifications</h1>
		</div>

		<div class="flex flex-wrap gap-3">
			<Button onclick={sendTestNotification}>Send in-app notification</Button>
			<Button variant="outline" onclick={() => requestNotificationPermission()}>
				Enable browser notifications
			</Button>
		</div>

		<div class="border-t pt-4">
			<h2 class="text-xl font-semibold">Web Push</h2>
			<div class="mt-3 flex flex-wrap gap-3">
				<Button onclick={togglePush} disabled={!push.supported || push.busy}>
					{push.subscribed ? "Disable push" : "Enable push"}
				</Button>
				<Button variant="secondary" onclick={sendTestPush} disabled={!push.subscribed}>
					Send test push
				</Button>
			</div>
			<p class="text-muted-foreground mt-2 text-sm">
				Supported: {push.supported} · Subscribed: {push.subscribed} · {pushStatus}
			</p>
			{#if push.error}
				<p class="text-destructive mt-1 text-sm">{push.error}</p>
			{/if}
		</div>

		<div class="border-t pt-4">
			<h2 class="text-xl font-semibold">Alert rules</h2>

			<!-- Pokémon -->
			<div class="mt-4">
				<h3 class="mb-2 font-medium">Pokémon</h3>
				<div class="flex flex-wrap items-end gap-3">
					<label class="text-sm">
						Pokémon ID
						<input
							type="number"
							bind:value={newPokemonId}
							class="bg-background ml-2 w-24 rounded border px-2 py-1"
						/>
					</label>
					<label class="text-sm">
						Min IV %
						<input
							type="number"
							bind:value={newMinIv}
							class="bg-background ml-2 w-20 rounded border px-2 py-1"
						/>
					</label>
					<Button onclick={addRule}>Add rule</Button>
				</div>
				<ul class="mt-3 flex flex-col gap-2">
					{#each rules.pokemon as rule (rule.id)}
						<li class="flex items-center justify-between rounded border px-3 py-2 text-sm">
							<span>{rule.title.title} {rule.iv ? `(IV ≥ ${rule.iv.min}%)` : ""}</span>
							<Button variant="ghost" size="" onclick={() => removeRule(rule.id)}>Remove</Button>
						</li>
					{/each}
				</ul>
			</div>

			<!-- Raid -->
			<div class="mt-4 border-t pt-4">
				<h3 class="mb-2 font-medium">Raid</h3>
				<div class="flex flex-wrap items-end gap-3">
					<label class="text-sm">
						Boss Pokémon ID
						<input
							type="number"
							bind:value={raidBossId}
							class="bg-background ml-2 w-24 rounded border px-2 py-1"
						/>
					</label>
					<label class="text-sm">
						Raid level
						<input
							type="number"
							bind:value={raidLevel}
							class="bg-background ml-2 w-20 rounded border px-2 py-1"
						/>
					</label>
					<Button onclick={addRaidRule}>Add rule</Button>
				</div>
				<ul class="mt-3 flex flex-col gap-2">
					{#each rules.raid as rule (rule.id)}
						<li class="flex items-center justify-between rounded border px-3 py-2 text-sm">
							<span>
								{rule.title.title}
								{rule.bosses ? `· boss #${rule.bosses[0].pokemon_id}` : ""}
								{rule.levels ? `· lvl ${rule.levels[0]}` : ""}
							</span>
							<Button variant="ghost" size="" onclick={() => removeRaidRule(rule.id)}
								>Remove</Button
							>
						</li>
					{/each}
				</ul>
			</div>

			<!-- Quest -->
			<div class="mt-4 border-t pt-4">
				<h3 class="mb-2 font-medium">Quest</h3>
				<div class="flex flex-wrap items-end gap-3">
					<label class="text-sm">
						Reward Pokémon ID
						<input
							type="number"
							bind:value={questPokemonId}
							class="bg-background ml-2 w-24 rounded border px-2 py-1"
						/>
					</label>
					<label class="text-sm">
						Reward item ID
						<input
							type="number"
							bind:value={questItemId}
							class="bg-background ml-2 w-24 rounded border px-2 py-1"
						/>
					</label>
					<Button onclick={addQuestRule}>Add rule</Button>
				</div>
				<ul class="mt-3 flex flex-col gap-2">
					{#each rules.quest as rule (rule.id)}
						<li class="flex items-center justify-between rounded border px-3 py-2 text-sm">
							<span>
								{rule.title.title}
								{rule.pokemon ? `· pokémon #${rule.pokemon[0].pokemon_id}` : ""}
								{rule.item ? `· item ${rule.item[0].id}` : ""}
							</span>
							<Button variant="ghost" size="" onclick={() => removeQuestRule(rule.id)}
								>Remove</Button
							>
						</li>
					{/each}
				</ul>
			</div>

			<!-- Invasion -->
			<div class="mt-4 border-t pt-4">
				<h3 class="mb-2 font-medium">Invasion</h3>
				<div class="flex flex-wrap items-end gap-3">
					<label class="text-sm">
						Character ID
						<input
							type="number"
							bind:value={invasionCharId}
							class="bg-background ml-2 w-24 rounded border px-2 py-1"
						/>
					</label>
					<label class="text-sm">
						Reward Pokémon ID
						<input
							type="number"
							bind:value={invasionRewardId}
							class="bg-background ml-2 w-24 rounded border px-2 py-1"
						/>
					</label>
					<Button onclick={addInvasionRule}>Add rule</Button>
				</div>
				<ul class="mt-3 flex flex-col gap-2">
					{#each rules.invasion as rule (rule.id)}
						<li class="flex items-center justify-between rounded border px-3 py-2 text-sm">
							<span>
								{rule.title.title}
								{rule.characters ? `· char ${rule.characters[0]}` : ""}
								{rule.rewards ? `· reward #${rule.rewards[0].pokemon_id}` : ""}
							</span>
							<Button variant="ghost" size="" onclick={() => removeInvasionRule(rule.id)}
								>Remove</Button
							>
						</li>
					{/each}
				</ul>
			</div>

			<!-- Max Battle -->
			<div class="mt-4 border-t pt-4">
				<h3 class="mb-2 font-medium">Max Battle</h3>
				<div class="flex flex-wrap items-end gap-3">
					<label class="text-sm">
						Boss Pokémon ID
						<input
							type="number"
							bind:value={maxBattleBossId}
							class="bg-background ml-2 w-24 rounded border px-2 py-1"
						/>
					</label>
					<label class="flex items-center gap-2 text-sm">
						Only when active
						<input type="checkbox" bind:checked={maxBattleActive} class="ml-1" />
					</label>
					<Button onclick={addMaxBattleRule}>Add rule</Button>
				</div>
				<ul class="mt-3 flex flex-col gap-2">
					{#each rules.maxBattle as rule (rule.id)}
						<li class="flex items-center justify-between rounded border px-3 py-2 text-sm">
							<span>
								{rule.title.title}
								{rule.bosses ? `· boss #${rule.bosses[0].pokemon_id}` : ""}
								{rule.isActive ? "· active only" : ""}
							</span>
							<Button variant="ghost" size="" onclick={() => removeMaxBattleRule(rule.id)}
								>Remove</Button
							>
						</li>
					{/each}
				</ul>
			</div>

			<div class="mt-4 flex flex-wrap items-center gap-3 border-t pt-4">
				<Button variant="secondary" onclick={sendFakeGolbatWebhook} disabled={!push.subscribed}>
					Send fake Golbat webhook
				</Button>
				<p class="text-muted-foreground text-sm">{fakeGolbatStatus}</p>
			</div>
		</div>

		<p class="text-muted-foreground text-sm">
			Visible in-app notifications: {getNotifications().length}
		</p>
	</section>
</main>
