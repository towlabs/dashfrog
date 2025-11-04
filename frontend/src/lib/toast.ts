import { toast as sonnerToast } from "sonner";

/**
 * Toast utility for API errors and notifications
 */
export const toast = {
	/**
	 * Show error toast (500+ errors)
	 */
	error: (message: string) => {
		sonnerToast.error(message);
	},

	/**
	 * Show warning toast (4xx errors)
	 */
	warning: (message: string) => {
		sonnerToast.warning(message);
	},

	/**
	 * Show success toast
	 */
	success: (message: string) => {
		sonnerToast.success(message);
	},

	/**
	 * Show info toast
	 */
	info: (message: string) => {
		sonnerToast.info(message);
	},
};

/**
 * Format API error message based on status code
 */
export function formatApiError(action: string, resource: string): string {
	return `Could not ${action} ${resource}`;
}

/**
 * Show toast for API error
 */
export function showApiError(action: string, resource: string) {
	const message = formatApiError(action, resource);

	toast.error(message);
}
