<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import { Pencil, Share, Share2, Trash } from "@lucide/svelte";
	import { fly } from "svelte/transition";
	import {
		filtersetPageClose,
		filtersetPageEdit,
		filtersetPageSave,
		getCurrentFiltersetPage
	} from "@/lib/features/filters/filtersetPages.svelte";
	import {
		deleteCurrentSelectedFilterset,
		existsCurrentSelectedFilterset,
		getCurrentSelectedFilterset,
		getCurrentSelectedFiltersetEncoded,
		getCurrentSelectedFiltersetInEdit,
		getCurrentSelectedFiltersetIsEmpty
	} from "@/lib/features/filters/filtersetPageData.svelte";
	import {
		backupShareUrl,
		canBackupShare,
		canNativeShare,
		hasClipboardWrite
	} from "@/lib/utils/device";
	import { getShareUrl } from "@/lib/utils/shareUrl";
	import * as m from "@/lib/paraglide/messages";
	import { isOpenModal, type ModalType } from "@/lib/ui/modal.svelte";
	import { closeModal } from "@/lib/ui/modal.svelte.js";

	import { MapObjectType } from "@/lib/mapObjects/mapObjectTypes";

	let {
		modalType,
		mapObject
	}: {
		modalType: ModalType;
		mapObject: MapObjectType;
	} = $props();

	let showBaseButtons = $derived(getCurrentFiltersetPage() === "base");
	let showProgressButtons = $derived(
		getCurrentFiltersetPage() !== "new" &&
			!(existsCurrentSelectedFilterset() && getCurrentFiltersetPage() === "base")
	);

	function ondelete() {
		if (existsCurrentSelectedFilterset()) {
			deleteCurrentSelectedFilterset(mapObject);
		}
		closeModal(modalType);
	}

	function getFilterShareUrl() {
		const filterset = getCurrentSelectedFilterset();
		if (filterset) {
			let subCat = "";
			if (filterset.subCategory) subCat = `/${filterset.subCategory}`;
			return getShareUrl(
				`/filter/${filterset.majorCategory}${subCat}/${getCurrentSelectedFiltersetEncoded()}`
			);
		} else {
			return getShareUrl("/");
		}
	}
</script>

{#if showBaseButtons || showProgressButtons}
	<div class="@container">
		<div
			class="flex flex-wrap gap-2 pt-3 justify-end w-full"
			transition:fly={{ duration: isOpenModal(modalType) ? 100 : 0, y: 80 }}
		>
			{#if showBaseButtons}
				{#if existsCurrentSelectedFilterset()}
					<Button class="flex-1 @sm:flex-none @sm:mr-auto" variant="secondary" onclick={ondelete}>
						<Trash size="14" />
						<span>
							{m.delete()}
						</span>
					</Button>

					{#if canBackupShare({ url: getFilterShareUrl() })}
						<Button
							class="flex-1 @sm:flex-none"
							variant="secondary"
							onclick={() => backupShareUrl(getFilterShareUrl())}
						>
							<Share2 size="14" />
							<span>
								{m.popup_share()}
							</span>
						</Button>
					{/if}
				{/if}

				<Button
					class={existsCurrentSelectedFilterset()
						? "order-first w-full @sm:order-none @sm:w-auto"
						: "flex-1 @sm:flex-none @sm:mr-auto"}
					variant={existsCurrentSelectedFilterset() ? "default" : "secondary"}
					onclick={() => filtersetPageEdit()}
				>
					<Pencil size="14" />
					<span>
						{m.edit()}
					</span>
				</Button>
			{/if}

			{#if showProgressButtons}
				<Button
					class="flex-1 @sm:flex-none"
					variant="secondary"
					onclick={() => filtersetPageClose(modalType)}
				>
					{m.cancel()}
				</Button>
				<Button
					class="order-first w-full @sm:order-none @sm:w-auto"
					variant="default"
					onclick={() => filtersetPageSave(modalType, mapObject)}
					disabled={getCurrentSelectedFiltersetIsEmpty() &&
						getCurrentFiltersetPage() !== "attribute"}
				>
					{m.save()}
				</Button>
			{/if}
		</div>
	</div>
{/if}
