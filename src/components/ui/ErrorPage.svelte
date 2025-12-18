<script lang="ts">
	import Button from "@/components/ui/input/Button.svelte";
	import Card from "@/components/ui/Card.svelte";
	import * as m from "@/lib/paraglide/messages";

	let {
		error,
		description = undefined,
		href = "/",
		linkLabel = m.error_back_to_website()
	}: {
		error: string,
		description?: string,
		href?: string,
		linkLabel?: string
	} = $props();
</script>

<div class="w-full h-screen flex items-center justify-center">
	<div class="stars absolute w-full h-full">
		<div class="absolute w-full h-full bg-radial from-transparent to-background to-60%"></div>
	</div>

	<Card class="bg-card max-w-xl relative px-8 pt-8 pb-6 mx-4">
		<p class="text-xl font-semibold text-center">
			{error}
		</p>

		{#if description}
			<p class="text-center mt-2 text-muted-foreground">
				{description}
			</p>
		{/if}

		{#if href && linkLabel}
			<div class="mt-6 flex justify-center w-full">
				<Button tag="a" {href}>{linkLabel}</Button>
			</div>
		{/if}
	</Card>
</div>

<style>
    .stars::before {
        content: "";
        position: absolute;
        inset: 0;
        background-image: radial-gradient(1px 1px at 10% 20%, var(--color-foreground), transparent),
        radial-gradient(1px 1px at 30% 80%, var(--color-foreground), transparent),
        radial-gradient(1px 1px at 50% 40%, var(--color-foreground), transparent),
        radial-gradient(1px 1px at 70% 10%, var(--color-foreground), transparent),
        radial-gradient(1px 1px at 90% 60%, var(--color-foreground), transparent),
        radial-gradient(2px 2px at 10% 50%, var(--color-foreground), transparent),
        radial-gradient(2px 2px at 60% 70%, var(--color-foreground), transparent);
        background-repeat: repeat;
        background-size: 220px 220px;
    }
</style>