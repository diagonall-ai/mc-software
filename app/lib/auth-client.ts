import { apiKeyClient } from "@better-auth/api-key/client";
import { oauthProviderClient } from "@better-auth/oauth-provider/client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	fetchOptions: {
		onError: (error) => {
			console.error(error);
		},
		throw: false,
	},
	// oauthProviderClient carries the signed OAuth request from the MCP sign-in
	// and consent pages, so signing in resumes the agent's authorization.
	plugins: [apiKeyClient(), oauthProviderClient()],
});
