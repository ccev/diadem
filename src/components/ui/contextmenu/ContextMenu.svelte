<script lang="ts">
	import { ContextMenu } from "bits-ui"
	import { fly } from "svelte/transition"
	import BuilderTest from '@/components/ui/contextmenu/BuilderTest.svelte';

	let {
		open,
		pos
	}: {
		open: boolean,
		pos: {x: number, y: number}
	} = $props()

	$effect(() => {
		open
		pos
		console.log(pos)
		console.log("test")
	})

	let builder
	$effect(() => console.log(builder))
</script>

<ContextMenu.Root
	open={true}
>
	<ContextMenu.Trigger asChild let:builder>
		<BuilderTest builders={builder}/>
<!--		<div use:builder></div>-->
<!--		<div use:builder.action {...builder}>Open accordion item</div>-->
	</ContextMenu.Trigger>
	<ContextMenu.Content
		class="z-50 absolute w-full max-w-[229px] rounded-xl border border-muted bg-background px-1 py-1.5 shadow-popover outline-none"
		transition={fly}
		style="top: {pos.y}px; left: {pos.x}px;"
	>
		<ContextMenu.Item
			class="flex h-10 select-none items-center rounded-button py-3 pl-3 pr-1.5 text-sm font-medium outline-none !ring-0 !ring-transparent data-[highlighted]:bg-muted"
		>
			<div class="flex items-center">
				Edit
			</div>
			<div class="ml-auto flex items-center gap-px">
				<kbd
					class="inline-flex size-5 items-center justify-center rounded-button border border-dark-10 bg-background-alt text-[13px] text-muted-foreground shadow-kbd"
				>
					⌘
				</kbd>
				<kbd
					class="inline-flex size-5 items-center justify-center rounded-button border border-dark-10 bg-background-alt text-[11px] text-muted-foreground shadow-kbd"
				>
					E
				</kbd>
			</div>
		</ContextMenu.Item>
		<ContextMenu.Sub>
			<ContextMenu.SubTrigger
				class="flex h-10 select-none items-center rounded-button py-3 pl-3 pr-1.5 text-sm font-medium outline-none !ring-0 !ring-transparent data-[highlighted]:bg-muted data-[state=open]:bg-muted"
			>
				<div class="flex items-center">
					Add
				</div>
				<div class="ml-auto flex items-center gap-px">
					<kbd
						class="inline-flex size-5 items-center justify-center rounded-button border border-dark-10 bg-background-alt text-[13px] text-muted-foreground shadow-kbd"
					>
						⌘
					</kbd>
					<kbd
						class="inline-flex size-5 items-center justify-center rounded-button border border-dark-10 bg-background-alt text-[11px] text-muted-foreground shadow-kbd"
					>
						N
					</kbd>
				</div>
			</ContextMenu.SubTrigger>
			<ContextMenu.SubContent
				class="z-50 w-full max-w-[209px] select-none rounded-xl border border-muted bg-background px-1 py-1.5 shadow-popover outline-none"
				transition={fly}
				sideOffset={10}
			>
				<ContextMenu.Item
					class="flex h-10 items-center rounded-button py-3 pl-3 pr-1.5 text-sm font-normal outline-none !ring-0 !ring-transparent data-[highlighted]:bg-muted"
				>
					Header
				</ContextMenu.Item>
				<ContextMenu.Item
					class="flex h-10 items-center rounded-button py-3 pl-3 pr-1.5 text-sm font-normal outline-none !ring-0 !ring-transparent data-[highlighted]:bg-muted"
				>
					Paragraph
				</ContextMenu.Item>
				<ContextMenu.Item
					class="flex h-10 items-center rounded-button py-3 pl-3 pr-1.5 text-sm font-normal outline-none !ring-0 !ring-transparent data-[highlighted]:bg-muted"
				>
					Codeblock
				</ContextMenu.Item>
				<ContextMenu.Item
					class="flex h-10 items-center rounded-button py-3 pl-3 pr-1.5 text-sm font-normal outline-none !ring-0 !ring-transparent data-[highlighted]:bg-muted"
				>
					List
				</ContextMenu.Item>
				<ContextMenu.Item
					class="flex h-10 items-center rounded-button py-3 pl-3 pr-1.5 text-sm font-normal outline-none !ring-0 !ring-transparent data-[highlighted]:bg-muted"
				>
					Task
				</ContextMenu.Item>
			</ContextMenu.SubContent>
		</ContextMenu.Sub>
		<ContextMenu.Item
			class="flex h-10 select-none items-center rounded-button py-3 pl-3 pr-1.5 text-sm font-medium outline-none !ring-0 !ring-transparent data-[highlighted]:bg-muted"
		>
			<div class="flex items-center">
				Duplicate
			</div>
			<div class="ml-auto flex items-center gap-px">
				<kbd
					class="inline-flex size-5 items-center justify-center rounded-button border border-dark-10 bg-background-alt text-[13px] text-muted-foreground shadow-kbd"
				>
					⌘
				</kbd>
				<kbd
					class="inline-flex size-5 items-center justify-center rounded-button border border-dark-10 bg-background-alt text-[11px] text-muted-foreground shadow-kbd"
				>
					D
				</kbd>
			</div>
		</ContextMenu.Item>
		<ContextMenu.Separator class="-mx-1 my-1 block h-px bg-muted" />
		<ContextMenu.Item
			class="flex h-10 select-none items-center rounded-button py-3 pl-3 pr-1.5 text-sm font-medium outline-none !ring-0 !ring-transparent data-[highlighted]:bg-muted"
		>
			<div class="flex items-center">
				Delete
			</div>
		</ContextMenu.Item>
	</ContextMenu.Content>
</ContextMenu.Root>