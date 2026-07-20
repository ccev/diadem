import { Dialog } from "bits-ui";
import Backdrop from "./Backdrop.svelte";
import Close from "./Close.svelte";
import Content from "./Content.svelte";
import Indent from "./Indent.svelte";
import IndentBackground from "./IndentBackground.svelte";
import Popup from "./Popup.svelte";
import Provider from "./Provider.svelte";
import Root from "./Root.svelte";
import SwipeArea from "./SwipeArea.svelte";
import Trigger from "./Trigger.svelte";
import Viewport from "./Viewport.svelte";
import VirtualKeyboardProvider from "./VirtualKeyboardProvider.svelte";
import { createHandle } from "./handle.js";

export const Drawer = {
	Root,
	Provider,
	Trigger,
	Portal: Dialog.Portal,
	Backdrop,
	Viewport,
	Popup,
	Content,
	Title: Dialog.Title,
	Description: Dialog.Description,
	Close,
	SwipeArea,
	Indent,
	IndentBackground,
	VirtualKeyboardProvider,
	createHandle
};

export * from "./types.js";
export * from "./handle.js";
