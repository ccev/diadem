<script lang="ts">
	import { isPopupExpanded } from "@/lib/ui/popupActions.js";
	import PopupButtons from "@/components/ui/popups/common/PopupButtons.svelte";
	import Card from "@/components/ui/Card.svelte";
	import { Copy, Share2, X } from "lucide-svelte";
	import type { Snippet } from "svelte";
	import { slide } from "svelte/transition";
	import { cubicIn, cubicOut } from "svelte/easing";
	import Button from "@/components/ui/input/Button.svelte";
	import CloseButton from "@/components/ui/CloseButton.svelte";
	import { closePopup, getCurrentPath } from "@/lib/mapObjects/interact";
	import { getCurrentSelectedData } from "@/lib/mapObjects/currentSelectedState.svelte";
	import { backupShareUrl, canNativeShare, copyToClipboard, hasClipboardWrite } from "@/lib/utils/device";
	import { getLocale } from "@/lib/paraglide/runtime";
	import * as m from "@/lib/paraglide/messages";

	let {
		lat,
		lon,
		image,
		title,
		description = undefined,
		content = undefined
	}: {
		lat: number;
		lon: number;
		heightCol?: string;
		heightExp?: string;
		image: Snippet;
		title: Snippet;
		description?: Snippet;
		content?: Snippet;
	} = $props();

	function getShareUrl() {
		return window.location.origin + getCurrentPath() + "?lang=" + getLocale();
	}
</script>

<Card class="h-full relative overflow-hidden pt-4 mx-2">

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
		<Button variant="ghost" size="" class="rounded-full p-2 size-8" title={m.close()} onclick={closePopup}>
			<X class="size-4.5" />
		</Button>
	</div>

	<div class="flex pl-6 pr-3 w-full items-center mb-2">
		{@render image()}
		<div class="w-full h-fit ml-4 max-h-full">
			<div class="mr-16">
				{@render title()}
			</div>

			{#if !isPopupExpanded(getCurrentSelectedData()?.type)}
				<div
					class="mt-1"
					in:slide={{ duration: 90, easing: cubicOut }}
					out:slide={{ duration: 90, easing: cubicIn }}
				>
					{@render description?.()}
				</div>
			{/if}
		</div>
	</div>

	{#if isPopupExpanded(getCurrentSelectedData()?.type)}
		<div
			class="px-6 overflow-y-auto mb-2"
			style="max-height: calc(100vh - 26rem);"
			in:slide={{ duration: 90, easing: cubicIn }}
			out:slide={{ duration: 90, easing: cubicOut }}
		>
			{@render content?.()}
		</div>
	{/if}

	<PopupButtons {lat} {lon} />
</Card>
