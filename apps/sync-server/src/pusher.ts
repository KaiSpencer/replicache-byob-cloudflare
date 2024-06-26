export class Pusher {
	private app_id: string;
	private key: string;
	private secret: string;
	private cluster: string;

	constructor(app_id: string, key: string, secret: string, cluster: string) {
		this.app_id = app_id;
		this.key = key;
		this.secret = secret;
		this.cluster = cluster;
	}

	/**
	 * Triggers event on the channel
	 * @param channel - channel name
	 * @param event - event name
	 * @param data - data to send, nedd to be JSON object or string
	 */
	async trigger(channel: string, event: string, data: object | string) {
		//get current timestamp
		const timestamp = (Date.now() / 1000) | 0;

		const body = JSON.stringify({
			name: event,
			//if data is JSON object stringify it, otherwise use it as is
			data: typeof data === "string" ? data : JSON.stringify(data),
			channel: channel,
		});

		const md5 = await this._md5(body);

		//create the request signarute to use with PUSHER
		const signature = await this._createSignature(timestamp, body, md5);

		//send event to pusher using fetch, use try/catch to handle errors
		try {
			const response = await fetch(
				`https://api-${this.cluster}.pusher.com/apps/${this.app_id}/events?auth_key=${this.key}&auth_timestamp=${timestamp}&auth_version=1.0&body_md5=${md5}&auth_signature=${signature}`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: body,
				},
			);

			await response.text();
		} catch (error) {
			console.log("Error", error);
		}
	}
	private async _md5(str: string) {
		const encoder = new TextEncoder();
		const data = encoder.encode(str);
		const hashBuffer = await crypto.subtle.digest("MD5", data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const hashHex = hashArray
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
		return hashHex;
	}

	private async _createSignature(timestamp: number, body: string, md5: string) {
		// deepcode ignore InsecureHash: <please specify a reason of ignoring this>
		const stringToSign = `POST\n/apps/${this.app_id}/events\nauth_key=${this.key}&auth_timestamp=${timestamp}&auth_version=1.0&body_md5=${md5}`;

		const encoder = new TextEncoder();
		const encodedData = encoder.encode(stringToSign);
		const encodedSecret = encoder.encode(this.secret);

		const importedKey = await crypto.subtle.importKey(
			"raw",
			encodedSecret,
			{
				name: "HMAC",
				hash: "SHA-256",
			},
			false,
			["sign"],
		);

		const signature = await crypto.subtle.sign(
			{
				name: "HMAC",
				hash: "SHA-256",
			},
			importedKey,
			encodedData,
		);

		const signatureArray = Array.from(new Uint8Array(signature));
		const signatureHex = signatureArray
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
		return signatureHex;
	}
}
