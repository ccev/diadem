<script lang="ts">
	import { onMount, tick } from "svelte";
	import { SvelteMap } from "svelte/reactivity";
	import { setMap } from "$lib/map/map.svelte";
	import { closePopup } from "$lib/mapObjects/interact";
	import { setIsContextMenuOpen } from "$lib/ui/contextmenu.svelte";
	import { useMetadata } from "$lib/ui/metadata.svelte";
	import { m } from "@/lib/paraglide/messages";
	import { getIconPokemon } from "$lib/services/uicons.svelte";
	import { mPokemon, mRaid } from "$lib/services/ingameLocale";
	import { resize } from "$lib/services/assets";
	import { hasLoadedFeature, LoadedFeature } from "$lib/services/initialLoad.svelte";
	import { Drawer } from "$lib/drawer";
	import Tabs from "@/components/ui/input/Tabs.svelte";
	import { type AvailableBoss, type BattleType } from "$lib/features/autoBattle";
	import type { PageProps } from "./$types";
	import { getNormalizedForm } from "$lib/utils/pokemonUtils";
	import { isMenuSidebar } from "@/lib/utils/device";
	import AutoBattleSteps from "@/components/autoBattle/AutoBattleSteps.svelte";
	import ErrorPage from "@/components/ui/ErrorPage.svelte";
	import Button from "@/components/ui/input/Button.svelte";
	import { isSupportedFeature } from "@/lib/services/supportedFeatures";
	import { getUserDetails } from "@/lib/services/user/userDetails.svelte";
	import { startLogin } from "@/lib/services/user/login";

	let { data }: PageProps = $props();

	useMetadata(() => ({ title: m.nav_auto_battle() }));

	onMount(async () => {
		await tick();
		setMap(undefined);
		closePopup();
		setIsContextMenuOpen(false);
	});

	type Battle = AvailableBoss;

	let battleType: BattleType = $state("raid");
	let selectedBattle: Battle | undefined = $state(undefined);
	let drawerHeight: number = $state(0);
	let drawerSnapPoint: string | number | null = $state(1);

	let availableBattles = $derived(
		data.bosses
			.filter((battle) => battle.type === battleType)
			.sort((a, b) => a.level - b.level || a.pokemon_id - b.pokemon_id)
	);

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

{#if hasLoadedFeature(LoadedFeature.SUPPORTED_FEATURES, LoadedFeature.USER_DETAILS) && (!isSupportedFeature("autoBattle") || !isSupportedFeature("auth") || !getUserDetails().details)}
	<ErrorPage
		error="Auto Battle is unavailable"
		description="Sign in with Discord to use Auto Battle."
	>
		{#snippet extraButtons()}
			{#if isSupportedFeature("auth")}
				<Button onclick={() => void startLogin()}>Sign in with Discord</Button>
			{/if}
		{/snippet}
	</ErrorPage>
{:else if hasLoadedFeature(LoadedFeature.SUPPORTED_FEATURES, LoadedFeature.USER_DETAILS)}
	<div class="flex min-h-screen">
		<main
			class="min-w-0 flex-1 px-6 py-8 pb-64"
			class:mx-auto={!isMenuSidebar()}
			class:max-w-3xl={!isMenuSidebar()}
			style:padding-bottom={!isMenuSidebar() ? `calc(${drawerHeight}px + 70px)` : undefined}
		>
			<Tabs
				bind:value={battleType}
				tabs={[
					{ value: "raid", label: m.raids() },
					{ value: "max_battle", label: m.max_battles() }
				]}
			/>

			{#if hasLoadedFeature(LoadedFeature.ICON_SETS, LoadedFeature.REMOTE_LOCALE)}
				<div class="space-y-6">
					{#each battlesByLevel as [level, battles] (level)}
						<section>
							<h2 class="sticky top-0 z-10 mb-3 bg-background py-2 text-lg font-semibold">
								{battleType === "raid" ? mRaid(level, true) : m.x_star_max_battles({ level })}
							</h2>
							<div class="grid grid-autofill-28 gap-2">
								{#each battles as battle (getBattleKey(battle))}
									{@const pokemon = {
										...battle,
										form: getNormalizedForm(battle.pokemon_id, battle.form)
									}}
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
										<img
											class="size-10"
											src={resize(getIconPokemon(pokemon), { width: 64 })}
											alt=""
										/>
										<span class="text-center">{mPokemon(pokemon)}</span>
									</button>
								{/each}
							</div>
						</section>
					{/each}
				</div>
			{/if}
		</main>

		{#if isMenuSidebar()}
			<aside
				class="sticky top-0 h-screen w-96 shrink-0 overflow-y-auto border-l border-border bg-card p-5"
			>
				<AutoBattleSteps {selectedBattle} initialAccounts={[]} />
			</aside>
		{:else}
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
				bind:snapPoint={drawerSnapPoint}
			>
				<Drawer.Portal>
					<Drawer.Viewport class="drawer-viewport flex items-end">
						<Drawer.Popup
							class="drawer-popup h-fit w-full rounded-t-xl border border-t-border bg-card pb-[env(safe-area-inset-bottom)]"
						>
							<div class="mx-auto my-3 h-1 w-10 shrink-0 rounded-full bg-ring"></div>
							<Drawer.Content class="px-6 pb-5">
								<div bind:clientHeight={drawerHeight}>
									<AutoBattleSteps
										{selectedBattle}
										initialAccounts={[]}
										compact={drawerSnapPoint === "150px"}
									/>
								</div>
							</Drawer.Content>
						</Drawer.Popup>
					</Drawer.Viewport>
				</Drawer.Portal>
			</Drawer.Root>
		{/if}
	</div>
{/if}
