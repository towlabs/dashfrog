import { NewRestAPI } from "@/src/services/api/_helper";
import type { ApiFilter } from "@/src/types/filter";
import type { Flow } from "@/src/types/flow";
import type { Step } from "@/src/types/step";

const FlowsAPI = NewRestAPI(`api/flows`);

export interface PaginationParams {
	page?: number;
	nb_items?: number;
}

export interface DateRangeParams {
	from_date?: string; // ISO string
	to_date?: string; // ISO string
}

export interface PaginatedResponse<T> {
	items: T[];
	total: number;
	total_pages: number;
	page: number;
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
