import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface TenantState {
	currentTenant: string | null;
	setCurrentTenant: (tenant: string) => void;
}

export const useTenantStore = create<TenantState>()(
	devtools(
		(set, _get) => ({
			currentTenant: null,
			setCurrentTenant: (tenant: string) => {
				set({ currentTenant: tenant });
			},
		}),
		{ name: "tenant" },
	),
);
