// Node stand-in for Cloudflare's `cloudflare:sockets`, so `pnpm integration`
// can run the shells that speak TCP instead of HTTP (SFTP). Plain TCP only,
// which is all SSH needs; the app itself uses the real module in the Worker.
import { connect as netConnect } from "node:net";
import { Duplex } from "node:stream";

export const connect = (address: { hostname: string; port: number }) => {
	const socket = netConnect({ host: address.hostname, port: address.port });
	const { readable, writable } = Duplex.toWeb(socket);
	return {
		close: async () => {
			socket.destroy();
		},
		closed: new Promise<void>((resolve) => socket.once("close", resolve)),
		opened: new Promise((resolve, reject) => {
			socket.once("connect", () => resolve({}));
			socket.once("error", reject);
		}),
		readable,
		startTls: () => {
			throw new Error("TLS upgrades are not available in pnpm integration.");
		},
		writable,
	};
};
