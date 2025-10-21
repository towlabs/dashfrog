import Axios, { type AxiosError, type AxiosRequestConfig } from "axios";
import { showApiError } from "@/src/lib/toast";

// Use relative URL (empty string) to go through nginx proxy in production
// Set VITE_API_URL in .env for local development (e.g., http://localhost:8080)
const API_URL = import.meta.env.VITE_API_URL || "";

// Default timeout for all API requests (180 seconds)
const DEFAULT_TIMEOUT = 180000; // 180s in milliseconds

export type APIError = {
	status: number;
	error?: string;
	key?: string;
	details?: { key: string; message: string; value?: object }[];
};

/**
 * Extended Axios config to include metadata for error toasts
 */
export interface APIRequestConfig extends AxiosRequestConfig {
	meta?: {
		action?: string; // e.g., "create", "update", "delete", "fetch"
		resource?: string; // e.g., "notebook", "event", "label"
		skipErrorToast?: boolean; // Skip automatic error toast
	};
}

const NewRestAPI = (basePath: string) => {
	const method =
		(methodName: "GET" | "POST" | "PUT" | "PATCH" | "DELETE") =>
		async <ResponseType>(
			path: string,
			options?: Omit<APIRequestConfig, "url" | "method">,
		) => {
			// const token = await retrieveToken();
			if (options === undefined) {
				options = {};
			}

			// Extract metadata for error handling
			const meta = options.meta;
			const skipErrorToast = meta?.skipErrorToast || false;

			// Set default Content-Type for POST/PUT/PATCH requests
			const defaultHeaders: Record<string, string> = {
				X_REQUEST_ID: crypto.randomUUID(),
			};

			if (["POST", "PUT", "PATCH"].includes(methodName)) {
				defaultHeaders["Content-Type"] = "application/json";
			}

			if (options.headers) {
				Object.assign(options.headers, defaultHeaders);
			} else {
				options.headers = defaultHeaders;
			}

			try {
				return await Axios.request<ResponseType>({
					...options,
					url: `${API_URL}/${basePath}/${path}`,
					method: methodName,
					// Set default timeout if not provided
					timeout:
						options.timeout !== undefined ? options.timeout : DEFAULT_TIMEOUT,
					headers: {
						// Authorization: `Bearer ${token}`,
						...options.headers,
					},
				});
			} catch (error) {
				const axiosError = error as AxiosError<APIError>;

				// Check if error is a timeout
				const isTimeout =
					axiosError.code === "ECONNABORTED" ||
					axiosError.code === "ERR_NETWORK";

				// Show error toast if not skipped
				if (!skipErrorToast && meta?.action && meta?.resource) {
					if (isTimeout) {
						// Special message for timeout errors
						showApiError(
							meta.action,
							meta.resource,
							408, // Request Timeout status code
							"Request timed out after 180 seconds",
						);
					} else {
						const status = axiosError.response?.status || 500;
						const apiErrorMessage =
							axiosError.response?.data?.error ||
							axiosError.response?.data?.key ||
							undefined;

						showApiError(meta.action, meta.resource, status, apiErrorMessage);
					}
				}

				// Re-throw the error for handling by the caller
				throw error;
			}
		};

	return {
		get: method("GET"),
		post: method("POST"),
		put: method("PUT"),
		delete: method("DELETE"),
	};
};
const ParseErrorToNotify = (
	error: AxiosError<APIError>,
	default_msg = "Unknown error",
): [string, { type: string }] => {
	if (error.response === undefined) {
		return [default_msg, { type: "error" }];
	}

	return [
		(error.response.data?.error
			? error.response.data?.error + error.response.data?.key
			: undefined) ||
			(error.response.data?.details &&
				JSON.stringify(error.response.data?.details)) ||
			default_msg,
		{
			type: (error.response.status || 500) < 500 ? "warning" : "error",
		},
	];
};

export { NewRestAPI, ParseErrorToNotify };
