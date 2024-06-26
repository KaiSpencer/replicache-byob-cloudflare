/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
	app(input) {
		return {
			name: "replicache-byob-cloudflare",
			removal: input?.stage === "production" ? "retain" : "remove",
			home: "cloudflare",
		};
	},
	async run() {
		const pusherAppId = new sst.Secret("PusherAppId");
		const pusherKey = new sst.Secret("PusherKey");
		const pusherSecret = new sst.Secret("PusherSecret");
		const pusherCluster = new sst.Secret("PusherCluster");

		const cloudflareAccountId = new sst.Secret(
			"CloudflareAccountId",
			sst.cloudflare.DEFAULT_ACCOUNT_ID,
		);
		const cloudflareApiToken = new sst.Secret(
			"CloudflareApiToken",
			process.env.CLOUDFLARE_API_TOKEN,
		);
		const db = new sst.cloudflare.D1("DB");

		const databaseId = db.id.apply((id) => new sst.Secret("DatabaseId", id));

		const hono = new sst.cloudflare.Worker("SyncServer", {
			url: true,
			handler: "apps/sync-server/src/index.ts",
			link: [
				db,
				cloudflareAccountId,
				cloudflareApiToken,
				databaseId,
				pusherAppId,
				pusherKey,
				pusherSecret,
				pusherCluster,
			],
		});

		const web = new sst.cloudflare.StaticSite("Web", {
			path: "apps/web",
			build: {
				command: "pnpm run build",
				output: "dist",
			},
			environment: {
				VITE_PUSHER_KEY: pusherKey.value,
				VITE_PUSHER_CLUSTER: pusherCluster.value,
				VITE_API_URL: hono.url as unknown as string,
			},
		});

		return {
			api: hono.url,
			web: web.url,
		};
	},
});
