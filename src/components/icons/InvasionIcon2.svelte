<script lang="ts">
	import { Icon, type LucideProps, type IconNode } from "@lucide/svelte";

	const iconNode: IconNode = [
		[
			"path",
			{
				d: "M12.43 17.32v215.36H78.9v-60.71h54.86l32.28 60.71h71.53l-37.4-71.85c20.99-12.3 35.19-36.69 35.1-67.39-.18-62.54-46.22-76.12-67.48-76.12H12.44ZM78.9 75.69h66.46c9.8 0 17.75 7.95 17.75 17.75s-7.95 17.75-17.75 17.75H78.9V75.7Z"
			}
		],
	];

	const props: LucideProps = $props();
</script>

<Icon {...props} {iconNode} viewBox="0 0 250 250" fill="currentColor" stroke="0" />