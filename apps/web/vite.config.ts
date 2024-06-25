import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
	return {
		plugins: [react()],
		build: {
			target: "esnext",
		},
		server: {
			proxy: {
				"/api": {
					target:
						command === "serve"
							? "http://localhost:8787"
							: "https://replicache-cloudflare-kai-syncserverscript.kaispencer98.workers.dev",
				},
			},
		},
	};
});
