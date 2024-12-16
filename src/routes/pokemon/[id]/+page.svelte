<script lang="ts">
	import type { PageData } from './$types';
	import {goto} from '$app/navigation';
	import { browser } from '$app/environment';

	let { data }: { data: PageData } = $props();

	if (browser) {
		goto("/")
	}
</script>

<!--TODO: direct links-->
