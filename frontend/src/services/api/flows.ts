import { NewRestAPI } from "@/src/services/api/_helper";
import type { ApiFilter } from "@/src/types/filter";
import type { Flow } from "@/src/types/flow";
import type { Step } from "@/src/types/step";

const FlowsAPI = NewRestAPI(`api/flows`);

/**
 * Pagination parameters for API requests
 */
export interface PaginationParams {
	/** Page number (1-indexed) */
	page?: number;
	/** Number of items per page */
	nb_items?: number;
}

/**
 * Date range parameters for filtering API requests
 */
export interface DateRangeParams {
	/** Start date in ISO string format */
	from_date?: string;
	/** End date in ISO string format */
	to_date?: string;
}

/**
 * Generic paginated response structure from the API
 *
 * @template T - The type of items being paginated
 */
export interface PaginatedResponse<T> {
	/** Array of items for the current page */
	items: T[];
	/** Total number of items across all pages */
	total: number;
	/** Total number of pages */
	total_pages: number;
	/** Current page number */
	page: number;
	/** Number of items per page */
	nb_items: number;
}

const Flows = {
	latest: (filters?: ApiFilter[], pagination?: PaginationParams) => {
		const params = new URLSearchParams();
		if (pagination?.page !== undefined) {
			params.append("page", pagination.page.toString());
		}
		if (pagination?.nb_items !== undefined) {
			params.append("nb_items", pagination.nb_items.toString());
		}

		const queryString = params.toString();
		const path = queryString ? `latest?${queryString}` : "latest";

		if (filters && filters.length > 0) {
			return FlowsAPI.post<Flow[]>(path, {
				data: { filters },
			});
		}
		return FlowsAPI.get<Flow[]>(path);
	},
	history: (
		name: string,
		filters?: ApiFilter[],
		pagination?: PaginationParams,
		dateRange?: DateRangeParams,
	) => {
		const params = new URLSearchParams();
		if (pagination?.page !== undefined) {
			params.append("page", pagination.page.toString());
		}
		if (pagination?.nb_items !== undefined) {
			params.append("nb_items", pagination.nb_items.toString());
		}

		const queryString = params.toString();
		const path = queryString ? `${name}?${queryString}` : name;

		if (filters && filters.length > 0) {
			return FlowsAPI.post<PaginatedResponse<Flow>>(path, {
				data: {
					filters,
					from_date: dateRange?.from_date,
					to_date: dateRange?.to_date,
				},
			});
		}
		return FlowsAPI.get<PaginatedResponse<Flow>>(path);
	},
	getSteps: (name: string, traceId: string) => {
		return FlowsAPI.get<Step[]>(`${name}/${traceId}/steps`);
	},
};

export { FlowsAPI, Flows };
