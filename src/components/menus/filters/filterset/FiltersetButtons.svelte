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
	import { getRootOrigin } from "@/lib/native/runtime";
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

	function getShareUrl() {
		const filterset = getCurrentSelectedFilterset();
		if (filterset) {
			let subCat = "";
			if (filterset.subCategory) subCat = `/${filterset.subCategory}`;
			return `${getRootOrigin()}/filter/${filterset.majorCategory}${subCat}/${getCurrentSelectedFiltersetEncoded()}`;
		} else {
			return getRootOrigin();
		}
	}
</script>

{#if showBaseButtons || showProgressButtons}
	<!-- button padding cuz they're absolute -->
	<div class="h-12"></div>
{/if}

<div
	class="flex gap-2 mt-3 justify-end absolute bottom-0 w-full"
	transition:fly={{ duration: isOpenModal(modalType) ? 100 : 0, y: 80 }}
>
	{#if showBaseButtons}
		{#if existsCurrentSelectedFilterset()}
			<Button class="mr-auto" variant="secondary" onclick={ondelete}>
				<Trash size="14" />
				<span>
					{m.delete()}
				</span>
			</Button>

			{#if canBackupShare({ url: getShareUrl() })}
				<Button class="" variant="secondary" onclick={() => backupShareUrl(getShareUrl())}>
					<Share2 size="14" />
					<span>
						{m.popup_share()}
					</span>
				</Button>
			{/if}
		{/if}

		<Button
			class={!existsCurrentSelectedFilterset() ? "mr-auto" : ""}
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
		<Button class="" variant="secondary" onclick={() => filtersetPageClose(modalType)}>
			{m.cancel()}
		</Button>
		<Button
			class=""
			variant="default"
			onclick={() => filtersetPageSave(modalType, mapObject)}
			disabled={getCurrentSelectedFiltersetIsEmpty() && getCurrentFiltersetPage() !== "attribute"}
		>
			{m.save()}
		</Button>
	{/if}
</div>
