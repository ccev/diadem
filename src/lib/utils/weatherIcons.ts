import Cloudy from "@/components/icons/weather/Cloudy.svelte";
import Fog from "@/components/icons/weather/Fog.svelte";
import PartlyCloudy from "@/components/icons/weather/PartlyCloudy.svelte";
import Rainy from "@/components/icons/weather/Rainy.svelte";
import Snowy from "@/components/icons/weather/Snowy.svelte";
import Sunny from "@/components/icons/weather/Sunny.svelte";
import Windy from "@/components/icons/weather/Windy.svelte";
import { CloudOff } from "lucide-svelte";
import type { Component } from "svelte";

const weatherIcons: { [key: number]: Component } = {
	1: Sunny,
	2: Rainy,
	3: PartlyCloudy,
	4: Cloudy,
	5: Windy,
	6: Snowy,
	7: Fog
};

export function getWeatherIcon(weatherId: number | undefined | null) {
	return weatherIcons[weatherId ?? 0] ?? CloudOff;
}
