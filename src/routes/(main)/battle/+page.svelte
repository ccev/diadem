<script lang="ts">
	import { onMount, tick } from "svelte";
	import { setMap } from "$lib/map/map.svelte";
	import { closePopup } from "$lib/mapObjects/interact";
	import { setIsContextMenuOpen } from "$lib/ui/contextmenu.svelte";
	import { useMetadata } from "$lib/ui/metadata.svelte";
	import { m } from "@/lib/paraglide/messages";
	import { getIconPokemon, getIconRaidEgg } from "$lib/services/uicons.svelte";
	import { mPokemon, mRaid } from "$lib/services/ingameLocale";
	import { resize } from "$lib/services/assets";
	import { hasLoadedFeature, LoadedFeature } from "$lib/services/initialLoad.svelte";
	import { Drawer } from "$lib/drawer";
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
	import { RAID_LEVELS } from "@/lib/utils/gymUtils";
	import { getConfig } from "$lib/services/config/config";
	import { getCoverageMapInvokedFromMap } from "$lib/features/coverageMap.svelte";
	import { closeMenu } from "$lib/ui/menus.svelte";
	import { goto } from "$app/navigation";
	import { getMapPath } from "$lib/utils/getMapPath";
	import { ArrowLeft } from "@lucide/svelte";
	import { Tabs } from "bits-ui";
	import RaidIcon from "@/components/icons/RaidIcon.svelte";

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
	let drawerSnapPoint = $state<number>(1);

	let availableBattles = $derived(
		data.bosses
			.filter((battle) => battle.type === battleType)
			.sort((a, b) => {
				if (battleType === "raid") {
					return (
						RAID_LEVELS.indexOf(b.level) - RAID_LEVELS.indexOf(a.level) ||
						a.pokemon_id - b.pokemon_id
					);
				}
				return b.level - a.level || a.pokemon_id - b.pokemon_id;
			})
	);

	function getBattleKey(battle: Battle): string {
		const variant = "bread_mode" in battle ? battle.bread_mode : battle.temp_evolution_id;
		return `${battle.type}-${battle.level}-${battle.pokemon_id}-${battle.form}-${variant}`;
	}

	let selectedBattleKey = $derived(selectedBattle ? getBattleKey(selectedBattle) : undefined);

	$effect(() => {
		battleType;
		selectedBattle = undefined;
	});

	let selectPaddingBottom: string | undefined = $derived.by(() => {
		if (isMenuSidebar()) return;
		if (drawerSnapPoint === 1) return drawerHeight + 70 + "px";
		return drawerSnapPoint + 10 + "px";
	});
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
	<div class="mx-auto flex h-screen w-full max-w-6xl justify-center overflow-hidden">
		<main
			class="h-full min-h-0 min-w-0 flex-1 px-4"
			class:overflow-y-auto={isMenuSidebar()}
		>
			<header
				class="z-20 w-full top-0 bg-background pt-2 mb-4"
				class:fixed={!isMenuSidebar()}
				class:pr-8={!isMenuSidebar()}
				class:sticky={isMenuSidebar()}
			>
					<div class="w-full max-w-3xl rounded-lg border border-border bg-card overflow-hidden">
						<div
							class="w-full pl-4 pr-2 py-2 flex flex-wrap gap-2 items-center justify-between"
						>
							<h1 class="font-semibold">
								Auto Battle
							</h1>

							<!--			todo: coverage map -> auto battle-->
							{#if getConfig().general.customHome && !getCoverageMapInvokedFromMap()}
								<Button size="sm" variant="outline" tag="a" href="/" onclick={() => closeMenu()}>
									<ArrowLeft class="size-4" />
									<span>{m.error_back_to_website()}</span>
								</Button>
							{:else}
								<Button
									size="sm"
									variant="outline"
									onclick={() => {
				goto(getMapPath(getConfig()));
			}}
								>
									<ArrowLeft class="size-4" />
									<span>{m.back_to_map()}</span>
								</Button>
							{/if}
						</div>

						<Tabs.Root bind:value={battleType}>
							<Tabs.List
								class="flex w-full border-t bg-accent py-1.5 text-sm font-medium"
							>
								<Tabs.Trigger
									value="raid"
									class="group flex flex-1 cursor-pointer justify-center text-center focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
								>
							<span
								class="w-fit rounded-lg px-10 py-1.5 transition-colors group-hover:bg-accent-highlight group-data-[state=active]:bg-accent-highlight">
								{m.raids()}
							</span>
								</Tabs.Trigger>
								<Tabs.Trigger
									value="max_battle"
									class="group flex flex-1 cursor-pointer justify-center text-center focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
								>
							<span
								class="w-fit rounded-lg px-8 py-1.5 transition-colors group-hover:bg-accent-highlight group-data-[state=active]:bg-accent-highlight">
								{m.max_battles()}
							</span>
								</Tabs.Trigger>
							</Tabs.List>
						</Tabs.Root>
					</div>

			</header>

			{#if hasLoadedFeature(LoadedFeature.ICON_SETS, LoadedFeature.REMOTE_LOCALE)}
				<div
					class="grid grid-autofill-28 gap-2"
					class:h-full={!isMenuSidebar()}
					class:overflow-y-auto={!isMenuSidebar()}
					style:padding-bottom={selectPaddingBottom}
					class:pt-30={!isMenuSidebar()}
				>
					{#each availableBattles as battle (getBattleKey(battle))}
						{@const pokemon = {
							...battle,
							form: getNormalizedForm(battle.pokemon_id, battle.form)
						}}
						{@const isSelected = selectedBattleKey === getBattleKey(battle)}
						<button
							type="button"
							class={[
								" flex flex-col items-center gap-2 rounded-lg border bg-card py-3 px-2 transition-colors hover:bg-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
								isSelected ? "border-primary bg-primary/10" : "border-border"
							]}
							aria-pressed={isSelected}
							onclick={() => (selectedBattle = battle)}
						>

							<div class="size-12 relative mb-2">
								<img class="size-12" src={resize(getIconPokemon(pokemon), { width: 64 })} alt="" />

								{#if battle.type === "raid"}
									<img
										class="absolute -bottom-2 -right-3 h-6"
										alt={mRaid(battle.level)}
										src={getIconRaidEgg(battle.level)}
									>
								{/if}
							</div>


							<p class="font-medium text-sm">{mPokemon(pokemon)}</p>

							{#if battle.type === "max_battle"}
								<div class="flex text-muted-foreground gap-1 mt-auto">
									{#each Array(battle.level) as _}
										<RaidIcon class="size-3.5" />
									{/each}
								</div>
							{/if}
						</button>
					{/each}
				</div>
			{/if}
		</main>

		{#if isMenuSidebar()}
			<aside
				class="h-screen w-96 shrink-0 overflow-y-auto border-l border-border bg-card p-5"
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
				snapPoints={[270, 1]}
				bind:snapPoint={drawerSnapPoint}
			>
				<Drawer.Portal>
					<Drawer.Viewport class="drawer-viewport flex items-end">
						<Drawer.Popup
							class="drawer-popup relative h-fit w-full rounded-t-xl border border-t-border bg-card pb-[env(safe-area-inset-bottom)]"
						>
							<button
								type="button"
								class="mx-auto my-1 flex h-8 w-16 shrink-0 items-center justify-center"
								aria-label={drawerSnapPoint === 1 ? "Minimize invite panel" : "Expand invite panel"}
								onclick={() => (drawerSnapPoint = drawerSnapPoint === 1 ? 64 : 1)}
							>
								<span class="h-1 w-10 rounded-full bg-ring"></span>
							</button>
							<Drawer.Content class="px-6 pb-5">
								<div bind:clientHeight={drawerHeight}>
									<AutoBattleSteps
										{selectedBattle}
										initialAccounts={[]}
										oninvitesent={() => (drawerSnapPoint = 1)}
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
