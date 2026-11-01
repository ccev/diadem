<script lang="ts">
	import { getToastText, closeToast } from "@/lib/ui/toasts.svelte.js";
	import { slide } from "svelte/transition";
	import Button from "@/components/ui/input/Button.svelte";
	import { X } from "@lucide/svelte";
</script>

<div class="top-safe-inset-top flex w-full justify-center px-2 pointer-events-none fixed z-100">
	<div
		transition:slide={{ duration: 70 }}
		class="max-w-full bg-background text-foreground border-border pointer-events-auto flex items-center justify-between gap-4 rounded-md border pl-6 pr-2 py-2 shadow-lg transition-all"
	>
		<span class="min-w-0 wrap-anywhere">
			{getToastText()}
		</span>

		<Button
			variant="ghost"
			size=""
			class="shrink-0 self-start rounded-sm p-2"
			onclick={() => closeToast()}
		>
			<X />
		</Button>
	</div>
</div>
