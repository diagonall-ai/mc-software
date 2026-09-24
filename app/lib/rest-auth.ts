/**
 * Who is calling the MCP server or the API with a machine credential: an MCP
 * OAuth access token (verified JWT) or an API key.
 */
export type McpSession = {
	userId: string;
	/** OAuth client id, or "api-key". */
	clientId: string;
	scopes: string[];
	accessToken: string;
	/** Seconds since the epoch. */
	expiresAt?: number;
};
