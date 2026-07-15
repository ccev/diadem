<script lang="ts">
	import { onMount, tick } from "svelte";
	import { SvelteMap } from "svelte/reactivity";
	import { setMap } from "$lib/map/map.svelte";
	import { closePopup } from "$lib/mapObjects/interact";
	import { setIsContextMenuOpen } from "$lib/ui/contextmenu.svelte";
	import { useMetadata } from "$lib/ui/metadata.svelte";
	import { m } from "@/lib/paraglide/messages";
	import { getActiveMaxBattles, getActiveRaids } from "$lib/features/masterStats.svelte";
	import type { ActiveRaidStats, MaxBattleStatsEntry } from "$lib/server/api/queryStats";
	import { getIconPokemon } from "$lib/services/uicons.svelte";
	import { mPokemon, mRaid } from "$lib/services/ingameLocale";
	import { resize } from "$lib/services/assets";
	import { hasLoadedFeature, LoadedFeature } from "$lib/services/initialLoad.svelte";
	import PopupBaseStatic from "@/components/ui/popups/common/PopupBaseStatic.svelte";
	import { Drawer } from "$lib/drawer";
	import { Circle, UserPlus, Ticket } from "@lucide/svelte";
	import Button from "@/components/ui/input/Button.svelte";
	import Tabs from "@/components/ui/input/Tabs.svelte";
	import { formatNumber } from "$lib/utils/numberFormat";

	useMetadata(() => ({ title: m.nav_auto_battle() }));

	onMount(async () => {
		await tick();
		setMap(undefined);
		closePopup();
		setIsContextMenuOpen(false);
	});

	type BattleType = "raids" | "maxBattles";
	type Battle = (ActiveRaidStats | MaxBattleStatsEntry) & { type: BattleType };

	let battleType: BattleType = $state("raids");
	let selectedBattle: Battle | undefined = $state(undefined);
	let drawerHeight: number = $state(0);
	$inspect(drawerHeight);

	let availableBattles = $derived.by(() => {
		const battles: Battle[] =
			battleType === "raids"
				? getActiveRaids().map((battle) => ({ ...battle, type: "raids" }))
				: getActiveMaxBattles().map((battle) => ({ ...battle, type: "maxBattles" }));

		return battles.sort((a, b) => a.level - b.level || a.pokemon_id - b.pokemon_id);
	});

	let battlesByLevel = $derived.by(() => {
		const groups = new SvelteMap<number, Battle[]>();

		for (const battle of availableBattles) {
			const battles = groups.get(battle.level) ?? [];
			battles.push(battle);
			groups.set(battle.level, battles);
		}

		return Array.from(groups.entries());
	});

	function getBattleKey(battle: Battle): string {
		const variant = "bread_mode" in battle ? battle.bread_mode : battle.temp_evolution_id;
		return `${battle.type}-${battle.level}-${battle.pokemon_id}-${battle.form}-${variant}`;
	}

	let selectedBattleKey = $derived(selectedBattle ? getBattleKey(selectedBattle) : undefined);
</script>

<Drawer.Root
	open={true}
	onOpenChange={(open, details) => {
		if (!open) details.cancel();
	}}
	modal={false}
	defaultOpen={true}
	disablePointerDismissal
	defaultSnapPoint={1}
	snapPoints={["150px", 1]}
>
	<Drawer.Portal>
		<Drawer.Viewport class="drawer-viewport flex items-end">
			<Drawer.Popup
				class="drawer-popup w-full h-fit rounded-t-xl border border-t-border bg-card pb-[env(safe-area-inset-bottom)]"
			>
				<div class="w-10 mx-auto my-3 rounded-full bg-ring h-1 shrink-0"></div>
				<Drawer.Content class="px-6 pb-5">
					<div
						bind:clientHeight={drawerHeight}
					>
						<h2 class="mb-2">Select invitees</h2>
						<div class="flex gap-2 overflow-x-auto w-full *:shrink-0">
							<div class="bg-accent border border-border p-4 rounded-md flex items-center gap-2">
								<Circle class="size-4" />
								<p>roofkletterer</p>
							</div>
						</div>

						<Button class="text-muted-foreground! px-0! ml-1" variant="link">
							<UserPlus class="size-3.5" />
							Connect new account
						</Button>


						{#if selectedBattle && hasLoadedFeature(LoadedFeature.ICON_SETS, LoadedFeature.REMOTE_LOCALE)}
							<div class="w-full border border-border rounded-md p-3 mt-4">
								<div class="flex gap-4">
									<img
										class="size-12"
										src={resize(getIconPokemon(selectedBattle), { width: 64 })}
										alt={mPokemon(selectedBattle)}
									/>
									<div>
										<p class="font-semibold">
											{mPokemon(selectedBattle)}
										</p>
										<p>
											Available Battles: {formatNumber(1238)}
										</p>
									</div>
								</div>

								<Button class="w-full mt-4">
									<Ticket class="size-3.5" />
									Request Remote Invite
								</Button>
							</div>
						{/if}
					</div>
				</Drawer.Content>
			</Drawer.Popup>
		</Drawer.Viewport>
	</Drawer.Portal>
</Drawer.Root>

<div class="px-6 py-8 pb-64 mx-auto max-w-3xl" style:padding-bottom="calc({drawerHeight}px + 70px)">
	<Tabs
		bind:value={battleType}
		tabs={[
			{ value: "raids", label: m.raids() },
			{ value: "maxBattles", label: m.max_battles() }
		]}
	/>

	{#if hasLoadedFeature(LoadedFeature.ICON_SETS, LoadedFeature.REMOTE_LOCALE)}
		<div class="space-y-6">
			{#each battlesByLevel as [level, battles] (level)}
				<section>
					<h2 class="sticky top-0 z-10 mb-3 bg-background py-2 text-lg font-semibold">
						{battleType === "raids" ? mRaid(level, true) : m.x_star_max_battles({ level })}
					</h2>
					<div class="grid grid-autofill-28 gap-2">
						{#each battles as battle (getBattleKey(battle))}
							{@const name = mPokemon(battle)}
							{@const isSelected = selectedBattleKey === getBattleKey(battle)}
							<button
								type="button"
								class={[
									"flex flex-col items-center justify-center gap-2 rounded-lg border bg-card p-2 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
									isSelected ? "border-primary bg-primary/10" : "border-border"
								]}
								aria-pressed={isSelected}
								onclick={() => (selectedBattle = battle)}
							>
								<img class="size-10" src={resize(getIconPokemon(battle), { width: 64 })} alt="" />
								<span class="text-center">{name}</span>
							</button>
						{/each}
					</div>
				</section>
			{/each}
		</div>
	{/if}
</div>
