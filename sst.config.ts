/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
	app(input) {
		return {
			name: "replicache-cloudflare",
			removal: input?.stage === "production" ? "retain" : "remove",
			home: "cloudflare",
		};
	},
	async run() {
		// const web = new sst.cloudflare.StaticSite("Web", {
		// 	path: "apps/web",
		// 	build: {
		// 		command: "pnpm run build",
		// 		output: "dist",
		// 	},
		// });
		const hono = new sst.cloudflare.Worker("SyncServer", {
			url: true,
			handler: "apps/sync-server/src/index.ts",
		});

		return {
			api: hono.url,
			// web: web.url,
		};
	},
});
