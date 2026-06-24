import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
	appId: "ee.malt.diadem",
	appName: "Diadem",
	webDir: "build",
	server: {
		androidScheme: "https"
	}
};

export default config;
