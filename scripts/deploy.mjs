/**
 * `pnpm run deploy`: builds, deploys, and on the first deploy stores the
 * printed address as the SITE_URL secret (MCP sign-in needs it). An existing
 * SITE_URL, such as a custom domain, is left as it is.
 */
import { execSync } from "node:child_process";

const config = "-c dist/server/wrangler.json";

execSync("pnpm build", { stdio: "inherit" });

const output = execSync(`wrangler deploy ${config}`, {
	encoding: "utf8",
	stdio: ["inherit", "pipe", "inherit"],
});
process.stdout.write(output);

const secrets = JSON.parse(
	execSync(`wrangler secret list ${config}`, {
		encoding: "utf8",
		stdio: ["ignore", "pipe", "inherit"],
	}),
);
const address = output.match(/https:\/\/[\w.-]+\.workers\.dev/)?.[0];

if (address && !secrets.some((secret) => secret.name === "SITE_URL")) {
	execSync(`wrangler secret put SITE_URL ${config}`, {
		input: address,
		stdio: ["pipe", "inherit", "inherit"],
	});
	console.log(`SITE_URL set to ${address}`);
}
