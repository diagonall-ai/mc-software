import { apiKeyClient } from "@better-auth/api-key/client";

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	fetchOptions: {
		onError: (error) => {
			console.error(error);
		},
		throw: false,
	},
	plugins: [apiKeyClient()],
});
