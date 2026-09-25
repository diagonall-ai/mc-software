// Gives someone who forgot their password a new one: the free plan cannot
// send reset e-mails. Prints a random temporary password to pass on to them.
//
//   node scripts/reset-password.mjs colleague@example.com          (deployed app)
//   node scripts/reset-password.mjs colleague@example.com --local  (local dev)
import { execFileSync } from "node:child_process";
import { randomBytes, scryptSync } from "node:crypto";

const [rawEmail, ...flags] = process.argv.slice(2);
const email = rawEmail?.trim().toLowerCase();
// Strict shape, so the address can go into the SQL below without escaping.
if (!email || !/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email)) {
	console.error("Usage: node scripts/reset-password.mjs <email> [--local]");
	process.exit(2);
}

// Better Auth's hash format and parameters, as in app/lib/auth-server.ts.
const password = randomBytes(9).toString("base64url");
const salt = randomBytes(16).toString("hex");
const key = scryptSync(password.normalize("NFKC"), salt, 64, {
	N: 16384,
	r: 16,
	p: 1,
	maxmem: 128 * 16384 * 16 * 2,
});

const sql = `UPDATE account SET password = '${salt}:${key.toString("hex")}', updated_at = ${Date.now()} WHERE provider_id = 'credential' AND user_id = (SELECT id FROM user WHERE email = '${email}') RETURNING user_id`;
const output = execFileSync(
	"pnpm",
	[
		"wrangler",
		"d1",
		"execute",
		"DB",
		flags.includes("--local") ? "--local" : "--remote",
		"--config",
		"wrangler.jsonc",
		"--json",
		"--command",
		sql,
	],
	{ encoding: "utf8" },
);

// RETURNING lists the updated row: local runs report no change count.
if (JSON.parse(output)[0]?.results?.length !== 1) {
	console.error(`No account with a password for ${email}.`);
	process.exit(1);
}
console.log(`New password for ${email}: ${password}`);
