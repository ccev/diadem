<script>
	import * as icons from 'lucide-svelte';

	let { name, ...rest } = $props();

	const Icon = icons[name];
</script>

<Icon {...rest} />