/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import { Replicache, TEST_LICENSE_KEY } from "replicache";
import { useSubscribe } from "replicache-react";
import type { Message } from "@replicache-cloudflare/shared";

async function init() {
	const licenseKey =
		import.meta.env.VITE_REPLICACHE_LICENSE_KEY ?? TEST_LICENSE_KEY;
	if (!licenseKey) {
		throw new Error("Missing VITE_REPLICACHE_LICENSE_KEY");
	}

	function Root() {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const [r, setR] = useState<Replicache<any> | null>(null);

		useEffect(() => {
			console.log("updating replicache");
			const r = new Replicache({
				name: "chat-user-id",
				licenseKey,
				pushURL:
					"https://replicache-cloudflare-kai-syncserverscript.kaispencer98.workers.dev/api/replicache/push",
				pullURL:
					"https://replicache-cloudflare-kai-syncserverscript.kaispencer98.workers.dev/api/replicache/pull",
				logLevel: "debug",
			});
			setR(r);
			listen(r);
			return () => {
				void r.close();
			};
		}, []);

		const messages = useSubscribe(
			r,
			async (tx) => {
				const list = await tx
					.scan<Message>({ prefix: "message/" })
					.entries()
					.toArray();
				list.sort(([, { order: a }], [, { order: b }]) => a - b);
				return list;
			},
			{ default: [] },
		);

		const usernameRef = useRef<HTMLInputElement>(null);
		const contentRef = useRef<HTMLInputElement>(null);

		const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			// TODO: Create Message
		};

		return (
			<div>
				<form onSubmit={onSubmit}>
					<input ref={usernameRef} required /> says:
					<input ref={contentRef} required /> <input type="submit" />
				</form>
				{messages.map(([k, v]) => (
					<div key={k}>
						<b>{v.from}: </b>
						{v.content}
					</div>
				))}
			</div>
		);
	}

	ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
		<React.StrictMode>
			<Root />
		</React.StrictMode>,
	);
}

function listen(rep: Replicache) {
	console.log(rep.clientID);
	// TODO: Listen for changes on server
}

await init();
