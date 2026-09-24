/**
 * SFTP: files a provider drops on its server, such as daily CSV exports.
 *
 * Library: edgeport (https://github.com/gmitch215/edgeport), SSH and SFTP
 * written for Cloudflare Workers on `cloudflare:sockets`. It is young (2026)
 * and has one maintainer: its version is pinned; read its changelog before
 * upgrading.
 *
 * Getting access (the recipe is in INTEGRATIONS.md):
 * - Who: the provider. Ask for the host, the port if it is not 22, a
 *   read-only user name, and a password or a private key.
 * - Also ask for the server's host key fingerprint (the `SHA256:...` line
 *   that `ssh-keygen -lf` prints). The shell refuses any server that does
 *   not present it: that is what stops someone from impersonating the
 *   provider. Without it, the first call fails and shows the fingerprint the
 *   server presented: confirm it with the provider before saving it.
 * - If the provider only lets known IP addresses in, this cannot work:
 *   Workers have no fixed outgoing address. Ask the provider to push the files
 *   to an R2 bucket instead, or upload the CSVs in the app.
 * - Secrets: SFTP_HOST, SFTP_USERNAME, SFTP_PASSWORD or SFTP_PRIVATE_KEY (a
 *   PKCS#8 or OpenSSH key), SFTP_HOST_KEY_FINGERPRINT, and SFTP_PORT if not 22.
 *
 * Facts:
 * - Each call opens a connection, does its work and closes it. Failed
 *   connections are retried; a method that writes passes `retries = 0` to
 *   `#session` so it never runs twice.
 * - The next methods to add: `sftp.readText(path)` for a CSV,
 *   `sftp.readFile(path)` for bytes, `sftp.stat(path)` for size and date.
 * - Key exchange curve25519 or nistp256, ciphers AES-GCM, AES-CTR or ChaCha20.
 *   An old server that offers none of them fails with a protocol error.
 * - A Worker has 128 MB of memory: read big files with
 *   `sftp.createReadStream(path)` and store them in R2.
 * - SSH needs more CPU time than the Workers Free plan gives each request:
 *   use Workers Paid.
 */
import { AuthError, ProtocolError } from "edgeport/core";
import { connect, type SftpSession } from "edgeport/sftp";
import { fingerprint } from "edgeport/ssh";
import { Effect } from "effect";
import { IntegrationError, retryTransient } from "./http";

const SERVICE = "SFTP";

interface SftpCredentials {
	host: string;
	/** Default 22. Text is fine, as secrets are text. */
	port?: string | number;
	username: string;
	password?: string;
	/** Instead of a password: a PKCS#8 or OpenSSH private key. */
	privateKey?: string;
	/** `SHA256:...`: the only server key the shell accepts. */
	hostKeyFingerprint?: string;
}

export class Sftp {
	/**
	 * `Sftp.init({ host: env.SFTP_HOST, username: env.SFTP_USERNAME, password: env.SFTP_PASSWORD, hostKeyFingerprint: env.SFTP_HOST_KEY_FINGERPRINT })`
	 */
	static init(credentials: SftpCredentials): Sftp {
		return new Sftp(credentials);
	}

	readonly #credentials: SftpCredentials;

	private constructor(credentials: SftpCredentials) {
		this.#credentials = credentials;
	}

	/**
	 * EXAMPLE METHOD: copy it for each operation the app needs.
	 *
	 * The files and folders of a directory, for example "/exports".
	 */
	listFiles(directory: string) {
		return this.#session((sftp) => sftp.list(directory)).pipe(
			Effect.map((entries) =>
				entries
					.filter((entry) => entry.filename !== "." && entry.filename !== "..")
					.map((entry) => ({
						name: entry.filename,
						isDirectory: entry.attrs.isDirectory,
						size: entry.attrs.size ?? null,
						modifiedAt: entry.attrs.mtime
							? new Date(entry.attrs.mtime * 1000).toISOString()
							: null,
					})),
			),
		);
	}

	#session<A>(use: (sftp: SftpSession) => Promise<A>, retries = 3) {
		const { host, port, username, password, privateKey, hostKeyFingerprint } =
			this.#credentials;
		// Accepts the bare fingerprint or the whole line `ssh-keygen -lf` prints.
		const pinned = hostKeyFingerprint?.match(/SHA256:[A-Za-z0-9+/]+/)?.[0];
		let presented: string | undefined;
		return retryTransient(
			Effect.tryPromise({
				try: async () => {
					const sftp = await connect({
						hostKey: {
							verify: async (_type, key) => {
								presented = await fingerprint(key);
								return presented === pinned;
							},
						},
						hostname: host,
						password,
						port: port ? Number(port) : 22,
						privateKey: privateKey ? { pem: privateKey } : undefined,
						timeoutMs: 15_000,
						username,
					});
					try {
						return await use(sftp);
					} finally {
						await sftp.close();
					}
				},
				catch: (error) => toIntegrationError(error, presented, pinned),
			}),
			retries,
		);
	}
}

const toIntegrationError = (
	error: unknown,
	presented: string | undefined,
	expected: string | undefined,
) => {
	const detail = String(error);
	if (presented && presented !== expected) {
		return new IntegrationError({
			detail,
			message: expected
				? `Le serveur SFTP présente l'empreinte ${presented}, pas celle attendue. Ne continuez pas sans l'avoir vérifiée auprès du fournisseur.`
				: `Le serveur SFTP présente l'empreinte ${presented}. Vérifiez-la auprès du fournisseur, puis enregistrez-la dans SFTP_HOST_KEY_FINGERPRINT.`,
			reason: "forbidden",
			service: SERVICE,
		});
	}
	if (error instanceof AuthError) {
		return new IntegrationError({
			detail,
			message:
				"Le serveur SFTP a refusé l'identifiant, le mot de passe ou la clé.",
			reason: "unauthorized",
			service: SERVICE,
		});
	}
	const sftpStatus = (error as { sftpStatus?: number }).sftpStatus;
	if (sftpStatus === 2) {
		return new IntegrationError({
			detail,
			message: "Ce fichier ou ce dossier n'existe pas sur le serveur SFTP.",
			reason: "not_found",
			service: SERVICE,
		});
	}
	if (sftpStatus === 3) {
		return new IntegrationError({
			detail,
			message: "Le compte SFTP n'a pas accès à ce fichier ou ce dossier.",
			reason: "forbidden",
			service: SERVICE,
		});
	}
	if (error instanceof ProtocolError) {
		return new IntegrationError({
			detail,
			message:
				"Le serveur SFTP a refusé l'échange : protocole ou algorithmes non pris en charge.",
			reason: "bad_request",
			service: SERVICE,
		});
	}
	// ConnectionError, TimeoutError, or anything else: retried as a network failure.
	return new IntegrationError({
		detail,
		message: "Le serveur SFTP est injoignable pour le moment.",
		reason: "network",
		service: SERVICE,
	});
};
