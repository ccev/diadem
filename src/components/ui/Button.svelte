<script lang="ts">

	let {
		class: class_ = "",
		variant = "default",
		size = "default",
		children = null,
		tag = "button",
		...rest
	} = $props()

	const variants = {
		default: "bg-primary text-primary-foreground hover:bg-primary/90",
		destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
		outline:
			"border-input bg-background hover:bg-accent hover:text-accent-foreground border",
		secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
		ghost: "hover:bg-accent hover:text-accent-foreground",
		link: "text-primary underline-offset-4 hover:underline",
	}

	const sizes = {
		default: "h-10 px-4 py-2",
		sm: "h-9 rounded-md px-3",
		lg: "h-11 rounded-md px-8",
		icon: "h-10 w-10",
	}

	class_ = variants[variant] + " " + sizes[size] + " " + class_
</script>

<svelte:element
	this={tag}
	class="cursor-pointer ring-offset-background focus-visible:ring-ring inline-flex items-center gap-1.5 justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 {class_}"
	{...rest}
>
	{@render children?.()}
</svelte:element>
