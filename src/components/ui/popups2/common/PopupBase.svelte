<script module lang="ts">
	import type { Snippet } from "svelte";
	import type { MapData } from "$lib/mapObjects/mapObjectTypes";

	export type MapObjectPopupProps = {
		type: string,
		title: string,
		image: Snippet<[MapData]>,
		overview: Snippet<[MapData]>,
		main: Snippet<[MapData]>,
	}
</script>

<script lang="ts">
	import { Drawer } from "diadem-vaul-svelte";
	import { getCurrentSelectedData, setCurrentSelectedData } from "$lib/mapObjects/currentSelectedState.svelte";
	import * as m from "$lib/paraglide/messages";
	import PopupButtons from "@/components/ui/popups/common/PopupButtons.svelte";
	import { backupShareUrl, canNativeShare, copyToClipboard, hasClipboardWrite } from "$lib/utils/device";
	import Button from "@/components/ui/input/Button.svelte";
	import { Copy, Navigation, Share2, X } from "lucide-svelte";
	import { getRootOrigin } from "$lib/native/runtime";
	import { getCurrentPath } from "$lib/mapObjects/interact";
	import { getLocale } from "$lib/paraglide/runtime";
	import { getMapsUrl } from "$lib/utils/mapUrl";
	import { Coords } from "$lib/utils/coordinates";
	import { getShareTitle } from "$lib/features/shareTexts";
	import PopupButton from "@/components/ui/popups/common/PopupButton.svelte";

	let {
		open = $bindable(false),
		coords,
		props,
		data
	}: {
		open: boolean,
		coords: Coords,
		data: MapData | undefined
		props: MapObjectPopupProps | undefined
	} = $props();

	const snapPoints = ["250px", 1];
	let activeSnapPoint: number | string = $state(snapPoints[0]);

	function getShareUrl() {
		return getRootOrigin() + getCurrentPath({ data }) + "?lang=" + getLocale();
	}

</script>

<Drawer.Root
	{open}
	onRelease={(_, open) => {
		if (!open) setCurrentSelectedData(null);
	}}
	closeOnOutsideClick={false}
	{snapPoints}
	bind:activeSnapPoint
>
	<Drawer.Portal>
		<Drawer.Content
			class="duration-150! fixed flex flex-col bottom-0 z-50 w-full h-full rounded-t-xl border border-t-border bg-card pb-[env(safe-area-inset-bottom)] mt-safe-inset-top"
		>
			<div class="w-10 mx-auto my-3 rounded-full bg-ring h-1 shrink-0"></div>
			<div class="flex gap-6 px-4">
				{#if props && data}
					{@render props.image(data)}
					<div>
						<p class="text-muted-foreground text-sm font-medium">
							{props.type}
						</p>
						<h1 class="font-semibold text-xl">
							{props.title}
						</h1>
					</div>
				{/if}

				<div class="absolute right-2 top-3 flex gap-1.5">
					{#if canNativeShare({ url: getShareUrl() })}
						<Button
							variant="ghost"
							size=""
							class="rounded-full size-8 p-2"
							title={m.popup_share()}
							onclick={() => backupShareUrl(getShareUrl())}
						>
							<Share2 class="size-3.5" />
						</Button>
					{:else if hasClipboardWrite()}
						<Button
							variant="ghost"
							size=""
							class="rounded-full size-8 p-2"
							title={m.copy_link()}
							onclick={() => copyToClipboard(getShareUrl())}
						>
							<Copy class="size-3.5" />
						</Button>
					{/if}

					<Button
						variant="ghost"
						size=""
						class="rounded-full p-2 size-8"
						title={m.close()}
						onclick={() => setCurrentSelectedData(null)}
					>
						<X class="size-4.5" />
					</Button>
				</div>
			</div>

			{#if activeSnapPoint !== 1}

				<div class="mt-4 w-full">
					<div class="overflow-x-auto flex *:shrink-0 gap-2 px-4">
						{#if props && data}
							{@render props.overview(data)}
						{/if}
					</div>
				</div>
			{/if}

			<div class="mt-5">
				{#if activeSnapPoint === 1}
					<PopupButton
						class="mx-4 w-full"
						variant="default"
						Icon={Navigation}
						label={m.popup_navigate()}
						tag="a"
						href={getMapsUrl(coords, getShareTitle(getCurrentSelectedData()))}
						target="_blank"
					/>
				{:else}
					<PopupButtons lat={coords.lat} lon={coords.lon} />
				{/if}
			</div>

			<div class="px-4 pt-2 mt-2 pb-6 space-y-7 overflow-y-auto">
				{#if props && data}
					{@render props.main(data)}
				{/if}
			</div>

		</Drawer.Content>
	</Drawer.Portal>
</Drawer.Root>
