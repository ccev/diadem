<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import * as m from "@/lib/paraglide/messages";
	import { tick } from "svelte";

	let {
		description,
		lines = 3,
		showFallback = true,
		class: class_ = "",
		buttonClass = "text-base!"
	}: {
		description?: string | null;
		lines?: 2 | 3;
		showFallback?: boolean;
		class?: string;
		buttonClass?: string;
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

			return () => resizeObserver.disconnect();
		};
	}
</script>

{#if !description}
	{#if showFallback}
		<p class="text-muted-foreground {class_}">{m.no_description()}</p>
	{/if}
{:else}
	<p
		{@attach measureDescriptionClamp(description, showFullDescription)}
		class="text-muted-foreground {class_}"
		class:line-clamp-2={!showFullDescription && lines === 2}
		class:line-clamp-3={!showFullDescription && lines === 3}
	>
		{description}
	</p>

	{#if descriptionIsClamped}
		<Button
			class="mt-1 h-auto p-0 text-muted-foreground! {buttonClass}"
			variant="link"
			size=""
			onclick={() => (expandedDescription = description)}
		>
			{m.read_more()}
		</Button>
	{/if}
{/if}
