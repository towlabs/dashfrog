/**
 * Fetch wrapper that handles authentication globally
 * - Adds Authorization header with Bearer token from auth store
 * - Redirects to login page on 401 Unauthorized responses
 */

export async function fetchWithAuth(
	input: RequestInfo | URL,
	init?: RequestInit,
): Promise<Response> {
	// Get auth token from localStorage (persisted by Zustand)
	const authStorage = localStorage.getItem("auth-storage");
	let token: string | null = null;

	if (authStorage) {
		try {
			const parsed = JSON.parse(authStorage);
			token = parsed.state?.token || null;
		} catch {
			// Invalid JSON, ignore
		}
	}

	// Add Authorization header if token exists
	const headers = new Headers(init?.headers);
	if (token) {
		headers.set("Authorization", `Bearer ${token}`);
	}

	// Make the request with updated headers
	const response = await fetch(input, {
		...init,
		headers,
	});

	// Check for 401 Unauthorized response
	if (response.status === 401) {
		// Clear any stored auth data
		localStorage.removeItem("auth-storage");
		localStorage.removeItem("auth_token");
		localStorage.removeItem("username");

		// Redirect to login page
		window.location.href = "/login";

		// Throw error to prevent further processing
		throw new Error("Authentication required. Redirecting to login...");
	}

	return response;
}
