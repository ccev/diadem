<script lang="ts">
	import Button from '@/components/ui/Button.svelte';
	import {Locate} from 'lucide-svelte';

	let {
		children,
		class: class_ = "",
		...rest
	} = $props()
</script>

<!--TODO disabled hover styles-->
<button
	class="h-14 w-14 bg-card border rounded-xl shadow-lg flex items-center justify-center hover:bg-accent hover:text-accent-foreground pointer-events-auto disabled:pointer-events-none {class_}"
	{...rest}
>
	{@render children()}
</button>