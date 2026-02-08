<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	let {
		class: class_ = '',
		variant = 'default',
		size = 'default',
		children = undefined,
		tag = 'button',
		...rest
	}: {
		class?: string
		variant?: keyof typeof variants
		size?: keyof typeof sizes
		children?: Snippet,
		tag?: 'a' | 'button',
	} & HTMLButtonAttributes & HTMLAnchorAttributes = $props();

	const variants = {
		default: 'bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/90',
		destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/90',
		outline:
			'border-input bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent active:text-accent-foreground border',
		secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/80',
		ghost: 'hover:bg-accent hover:text-accent-foreground active:bg-accent active:text-accent-foreground',
		link: 'text-primary underline-offset-4 hover:underline active:underline',
		"": ""
	};

	const sizes = {
		default: 'h-10 px-4 py-2 rounded-md',
		sm: 'h-9 rounded-md px-3',
		lg: 'h-11 rounded-md px-8',
		icon: 'h-10 w-10 rounded-md',
		'': ''
	};

	let className = $derived(variants[variant] + ' ' + (sizes[size] ?? ''));
</script>

<svelte:element
	this={tag}
	class="cursor-pointer pointer-events-auto ring-offset-background focus-visible:ring-ring inline-flex items-center gap-1.5 justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 {className} {class_}"
	{...rest}
>
	{@render children?.()}
</svelte:element>
