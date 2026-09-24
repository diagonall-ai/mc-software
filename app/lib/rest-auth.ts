export type McpSession = {
	accessToken: string;
	refreshToken: string;
	accessTokenExpiresAt: Date | string;
	refreshTokenExpiresAt: Date | string;
	clientId: string;
	userId: string;
	scopes: string;
};
