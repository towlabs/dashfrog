/**
 * Authentication API service
 */

export type LoginResponse = {
	access_token: string;
	token_type: string;
};

export const Auth = {
	/**
	 * Login with username and password
	 * Returns access token on success
	 */
	login: async (username: string, password: string): Promise<LoginResponse> => {
		// Use x-www-form-urlencoded as per API spec
		const formData = new URLSearchParams();
		formData.append("username", username);
		formData.append("password", password);

		const response = await fetch("/api/auth/token", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: formData.toString(),
		});

		if (!response.ok) {
			if (response.status === 401) {
				throw new Error("Invalid username or password");
			}
			throw new Error(`Authentication failed: ${response.statusText}`);
		}

		return await response.json();
	},
};
