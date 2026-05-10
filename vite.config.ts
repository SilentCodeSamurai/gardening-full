import path from "node:path";
import { fileURLToPath } from "node:url";
import { paraglideVitePlugin } from "@inlang/paraglide-js";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { config as loadEnvConfig } from "dotenv";
import { nitro } from "nitro/vite";
import type { WarningHandlerWithDefault } from "rollup";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnvConfig({ path: [".env.development.local", ".env.development", ".env.local", ".env"] });

const ignoreModuleLevelDirectiveWarnings: WarningHandlerWithDefault = (warning, warn) => {
	if (warning.code === "MODULE_LEVEL_DIRECTIVE" && warning.id?.includes("node_modules")) {
		return;
	}
	warn(warning);
};

const config = defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src/app"),
			"@backend": path.resolve(__dirname, "./src/backend"),
		},
	},	
	plugins: [
		devtools(),
		paraglideVitePlugin({
			project: "./project.inlang",
			outdir: "./src/app/paraglide",
			cookieName: "locale",
			strategy: ["cookie", "baseLocale", "preferredLanguage"],
		}),
		nitro({ rollupConfig: { external: [/^@sentry\//], onwarn: ignoreModuleLevelDirectiveWarnings } }),
		tsconfigPaths({ projects: ["./tsconfig.json"] }),
		tailwindcss(),
		tanstackStart({
			start: {
				entry: "app/start.ts",
			},
			server: {
				entry: "app/server.ts",
			},
			router: {
				routesDirectory: "app/routes",
				entry: "app/router.tsx",
				generatedRouteTree: "app/routeTree.gen.ts",
			},
		}),
		viteReact({
			include: [/src\/app\/.*\.[tj]sx?$/],
			babel: {
				plugins: ["babel-plugin-transform-typescript-metadata", "babel-plugin-react-compiler"],
			},
		}),
	],
});

export default config;
