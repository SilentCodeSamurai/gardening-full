import { defineConfig } from "nitro/config";

export default defineConfig({
	plugins: ["./plugins/nitro-lifecycle.ts"],
	// Inline `tslib` instead of leaving it as an external import in the SSR bundle.
	// `tsyringe@4.10.0` uses ESM5 helpers from "tslib", and Netlify Functions
	// can't resolve the bare external at runtime.
	noExternals: ["tslib"],
});
