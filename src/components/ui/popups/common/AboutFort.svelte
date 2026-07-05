<script lang="ts">
	import * as m from "$lib/paraglide/messages";
	import { openWayfarerMap } from "$lib/features/wayfarerMap.svelte";
	import { openFortDetailsModal } from "@/components/ui/popups/common/FortDetailsModal.svelte";
	import Button from "@/components/ui/input/Button.svelte";
	import BasicMainCard from "@/components/ui/popups/common/BasicMainCard.svelte";
	import IconValue from "@/components/ui/popups/common/IconValue.svelte";
	import StatsMainCard from "@/components/ui/popups/common/StatsMainCard.svelte";
	import TitledMainSection from "@/components/ui/popups/common/TitledMainSection.svelte";
	import UpdatedTimes from "@/components/ui/popups/common/UpdatedTimes.svelte";
	import { ArrowRight, BadgeEuro, Info } from "@lucide/svelte";
	import { tick } from "svelte";

	let {
		title,
		name,
		description,
		imageUrl,
		sponsorId,
		partnerId,
		defaultName,
		updated,
		lastModified,
		firstSeen
	}: {
		title: string;
		name?: string | null;
		description?: string | null;
		imageUrl?: string | null;
		sponsorId?: number | null;
		partnerId?: string | null;
		defaultName: string;
		updated?: number;
		lastModified?: number;
		firstSeen?: number;
	} = $props();

	let expandedDescription: string | null = $state(null);
	let showFullDescription = $derived(Boolean(description && expandedDescription === description));
	let descriptionIsClamped = $state(false);

	function measureDescriptionClamp(
		_description: string | null | undefined,
		_showFullDescription: boolean
	) {
		return (node: HTMLParagraphElement) => {
			const measure = () => {
				if (showFullDescription) {
					descriptionIsClamped = false;
					return;
				}

				descriptionIsClamped = node.scrollHeight > node.clientHeight + 1;
			};

			tick().then(measure);

			const resizeObserver = new ResizeObserver(measure);
			resizeObserver.observe(node);

			return () => {
				resizeObserver.disconnect();
			};
		};
	}
</script>

<TitledMainSection Icon={Info} {title}>
	<BasicMainCard>
		{#if !name}
			<p class="-mb-2 text-muted-foreground">
				{m.unknown_details()}
			</p>
		{:else}
			<p class="mb-2 font-semibold">
				{name}
			</p>

			{#if !description}
				<p class="text-muted-foreground">{m.no_description()}</p>
			{:else}
				<p
					{@attach measureDescriptionClamp(description, showFullDescription)}
					class="text-muted-foreground"
					class:line-clamp-3={!showFullDescription}
				>
					{description}
				</p>

				{#if descriptionIsClamped}
					<Button
						class="mt-1 h-auto p-0 text-base! text-muted-foreground!"
						variant="link"
						size=""
						onclick={() => (expandedDescription = description)}
					>
						{m.read_more()}
					</Button>
				{/if}
			{/if}
		{/if}

		{#if sponsorId || partnerId}
			<IconValue class="mt-2" Icon={BadgeEuro}>
				{m.wayfarer_sponsored()}
			</IconValue>
		{/if}

		{#if imageUrl}
			<div class="relative mt-2 h-28 w-full overflow-hidden rounded-md">
				<button
					class="absolute z-10 flex size-full items-center justify-center bg-black/50 backdrop-blur-[1px] cursor-pointer"
					onclick={() => {
						if (!imageUrl) return;

						openFortDetailsModal({
							alt: m.cover_photo_of({ name: name ?? defaultName }),
							fortUrl: imageUrl,
							fortName: name ?? defaultName,
							fortDescription: description ?? undefined
						});
					}}
				>
					<div class="rounded-md bg-neutral-800/90 px-4 py-2 text-neutral-50">
						{m.view_full_image()}
					</div>
				</button>
				<img
					class="absolute size-full object-cover"
					alt={m.cover_photo_of({ name: name ?? defaultName })}
					src={imageUrl}
				/>
			</div>
		{/if}

		<Button class="mt-3 mb-2 w-full" variant="link" onclick={openWayfarerMap}>
			{m.go_to_wayfarer_map()}
			<ArrowRight class="size-3.5" />
		</Button>
	</BasicMainCard>

	<StatsMainCard class="mt-4">
		<UpdatedTimes {updated} {lastModified} {firstSeen} />
	</StatsMainCard>
</TitledMainSection>
