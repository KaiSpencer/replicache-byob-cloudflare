/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import {
	Replicache,
	TEST_LICENSE_KEY,
	type WriteTransaction,
} from "replicache";
import { useSubscribe } from "replicache-react";
import type {
	Message,
	MessageWithID,
} from "@replicache-byob-cloudflare/shared";
import { nanoid } from "nanoid";
import Pusher from "pusher-js";

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
				pushURL: `${import.meta.env.VITE_API_URL}/api/replicache/push`,
				pullURL: `${import.meta.env.VITE_API_URL}/api/replicache/pull`,
				logLevel: "debug",
				mutators: {
					async createMessage(
						tx: WriteTransaction,
						{ id, from, content, order }: MessageWithID,
					) {
						await tx.set(`message/${id}`, {
							from,
							content,
							order,
						});
					},
				},
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
			let last: Message | null = null;
			if (messages.length) {
				const lastMessageTuple = messages[messages.length - 1];
				last = lastMessageTuple[1];
			}
			const order = (last?.order ?? 0) + 1;
			const username = usernameRef.current?.value ?? "";
			const content = contentRef.current?.value ?? "";
			console.log("order", order);

			await r?.mutate.createMessage({
				id: nanoid(),
				from: username,
				content,
				order,
			});

			if (contentRef.current) {
				contentRef.current.value = "";
			}
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
	console.log("listening");
	// Listen for pokes, and pull whenever we get one.
	Pusher.logToConsole = true;
	if (
		!import.meta.env.VITE_PUBLIC_PUSHER_KEY ||
		!import.meta.env.VITE_PUBLIC_PUSHER_CLUSTER
	) {
		throw new Error("Missing PUSHER_KEY or PUSHER_CLUSTER in env");
	}
	const pusher = new Pusher(import.meta.env.VITE_PUBLIC_PUSHER_KEY, {
		cluster: import.meta.env.VITE_PUBLIC_PUSHER_CLUSTER,
	});
	const channel = pusher.subscribe("default");
	channel.bind("poke", async () => {
		console.log("got poked");
		await rep.pull();
	});
}

await init();
