<script lang="ts">
	import favicon from "/static/favicon.png?inline";

	let { title }: { title: string } = $props();
</script>

<div
	class="w-full h-full bg-white text-slate-950 font-bold flex flex-col justify-center items-center"
>
	<div class="flex items-center" style:gap="0.5rem">
		<img src={favicon} alt="logo" class="w-10 h-10 rounded-lg" />
		<p class="text-4xl">
			{title}
		</p>
	</div>
</div>
