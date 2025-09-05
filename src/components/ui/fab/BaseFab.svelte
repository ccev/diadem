<script lang="ts">
	import Button from '@/components/ui/input/Button.svelte';
	import {Locate} from 'lucide-svelte';

	let {
		children,
		class: class_ = "",
		...rest
	} = $props()
</script>

<Button
	variant="ghost"
	size=""
	class="size-14 bg-card border rounded-xl shadow-lg flex items-center justify-center hover:bg-accent hover:text-accent-foreground active:bg-accent active:text-accent-foreground pointer-events-auto disabled:pointer-events-none {class_}"
	{...rest}
>
	{@render children()}
</Button>