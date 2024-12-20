<script lang="ts">
	import { builderActions, getAttrs, type Builder } from "bits-ui";
	export let builders: Builder;

	console.log("BUILDER!")
	console.log(builders)
</script>

<button>
	<slot />
	tets
</button>