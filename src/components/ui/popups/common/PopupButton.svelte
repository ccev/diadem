<script lang="ts">
	import Button, { type ButtonProps } from "@/components/ui/input/Button.svelte";
	import { Circle, CircleCheck, Ellipsis } from "lucide-svelte";
	import type { LucideIcon } from "@/lib/types/lucide";
	import { DropdownMenu } from "bits-ui";
	import { fly, slide } from "svelte/transition";
	import type { PopupActionDropdown } from "@/lib/ui/popupActions";

	let {
		Icon,
		label,
		active = $bindable(false),
		IconActive,
		labelActive,
		actions = [],
		...rest
	}: {
		Icon: LucideIcon;
		label: string;
		active?: boolean;
		IconActive?: LucideIcon;
		labelActive?: string;
		actions?: PopupActionDropdown[];
	} & ButtonProps = $props();
</script>

<div class="flex gap-0.5 [&>*:first-child:not(:last-child)]:rounded-r-none" role="group">
	<Button size="default" variant="secondary" class="items-center" {...rest}>
		{#if !active}
			<Icon class="size-4 mb-0.5" />
			{label}
		{:else if labelActive}
			<IconActive class="size-4 mb-0.5" />
			{labelActive}
		{/if}
	</Button>

	{#if actions.length}
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button class="px-3! rounded-l-none" size="default" variant="secondary" {...props}>
						<Ellipsis class="size-4 mt-0.5" />
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content
				class="border-border w-64 border bg-card shadow-popover outline-hidden rounded-lg px-1 py-1.5"
				side="top"
				sideOffset={6}
				align="end"
				alignOffset={0}
				forceMount
			>
				{#snippet child({ wrapperProps, props, open })}
					{#if open}
						<div {...wrapperProps}>
							<div {...props} transition:fly={{ y: 6, duration: 90 }}>
								{#each actions as action}
									{@const Icon = action.Icon}
									<DropdownMenu.Item
										class="data-highlighted:bg-muted cursor-pointer rounded-md px-3 h-9 flex font-medium text-sm items-center gap-2"
										onSelect={action.onclick}
									>
										<Icon class="size-3.5" />
										{action.label}

										{#if action.getActive}
											{#if action.getActive()}
												<CircleCheck class="size-3.5 ml-auto" />
											{:else}
												<Circle class="size-3.5 ml-auto text-muted-foreground" />
											{/if}
										{/if}
									</DropdownMenu.Item>
								{/each}
							</div>
						</div>
					{/if}
				{/snippet}
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	{/if}
</div>
