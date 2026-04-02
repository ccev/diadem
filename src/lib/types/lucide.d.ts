import { SvelteComponentTyped } from "svelte";
import type { IconProps } from "lucide-svelte";

type Events = { [evt: string]: CustomEvent<any> };
type Slots = { default: {} };
export type LucideIcon = typeof SvelteComponentTyped<typeof IconProps, typeof Events, typeof Slots>;
