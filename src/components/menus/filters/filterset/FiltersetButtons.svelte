<script lang="ts">
	import Button from '@/components/ui/input/Button.svelte';
	import { Pencil, Share, Share2, Trash } from 'lucide-svelte';
	import { fly } from 'svelte/transition';
	import {
		filtersetPageClose, filtersetPageEdit,
		filtersetPageSave,
		getCurrentFiltersetPage
	} from '@/lib/features/filters/filtersetPages.svelte';
	import {
		deleteCurrentSelectedFilterset,
		existsCurrentSelectedFilterset, getCurrentSelectedFilterset, getCurrentSelectedFiltersetEncoded,
		getCurrentSelectedFiltersetInEdit, getCurrentSelectedFiltersetIsEmpty
	} from '@/lib/features/filters/filtersetPageData.svelte';
	import { backupShareUrl, canBackupShare, canNativeShare, hasClipboardWrite } from '@/lib/utils/device';
	import * as m from '@/lib/paraglide/messages';
	import { isOpenModal, type ModalType } from '@/lib/ui/modal.svelte';
	import { closeModal } from '@/lib/ui/modal.svelte.js';
	import type { MapObjectType } from "@/lib/types/mapObjectData/mapObjects";

	let {
		modalType,
		mapObject
	}: {
		modalType: ModalType,
		mapObject: MapObjectType
	} = $props()

	function ondelete() {
		if (existsCurrentSelectedFilterset()) {
			deleteCurrentSelectedFilterset(mapObject)
		}
		closeModal(modalType)
	}

	function getShareUrl() {
		const filterset = getCurrentSelectedFilterset()
		if (filterset) {
			let subCat = ""
			if (filterset.subCategory) subCat = `/${filterset.subCategory}`
			return `${window.location.origin}/filter/${filterset.majorCategory}${subCat}/${getCurrentSelectedFiltersetEncoded()}`
		} else {
			return window.location.origin
		}
	}
</script>

<div
	class="flex gap-2 mt-3 justify-end absolute bottom-0 w-full"
	transition:fly={{duration: isOpenModal(modalType) ? 100 : 0, y: 80}}
>
	{#if getCurrentFiltersetPage() === "base"}
		{#if existsCurrentSelectedFilterset()}
			<Button class="mr-auto" variant="secondary" onclick={ondelete}>
				<Trash size="14" />
				<span>
					Delete
				</span>
			</Button>

			{#if canBackupShare({ url: getShareUrl() })}
				<Button
					class=""
					variant="secondary"
					onclick={() => backupShareUrl(getShareUrl())}>
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
				Edit
			</span>
		</Button>
	{/if}

	{#if
		getCurrentFiltersetPage() !== "new"
		&& !((existsCurrentSelectedFilterset()) && getCurrentFiltersetPage() === "base")
	}
		<Button class="" variant="secondary" onclick={() => filtersetPageClose(modalType)}>
			Cancel
		</Button>
		<Button
			class=""
			variant="default"
			onclick={() => filtersetPageSave(modalType, mapObject)}
			disabled={getCurrentSelectedFiltersetIsEmpty() && getCurrentFiltersetPage() !== "attribute"}
		>
			Save
		</Button>
	{/if}
</div>