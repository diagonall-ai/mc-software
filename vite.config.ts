import { fileURLToPath } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { FontaineTransform } from "fontaine";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		cloudflare({
			viteEnvironment: { name: "ssr" },
			// Keep local dev offline, so it starts without a Cloudflare login.
			// Workers AI has no local version: AI calls work once deployed.
			remoteBindings: false,
		}),
		tanstackStart({
			srcDirectory: "app",
		}),
		tailwindcss(),
		// Metric-matched fallbacks for the self-hosted fonts in public/fonts, so
		// text keeps its layout while the brand fonts load.
		FontaineTransform.vite({
			fallbacks: ["Arial"],
			resolvePath: (id) => new URL(`./public${id}`, import.meta.url),
		}),
	],
	server: {
		port: 3934,
	},
	resolve: {
		alias: {
			"~": fileURLToPath(new URL("./app", import.meta.url)),
		},
	},
});
