"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { useParams } from "react-router-dom";
import { Timeline } from "@/components/Timeline";
import { useTenantStore } from "@/src/stores/tenant";

export const TimelineBlock = createReactBlockSpec(
	{
		type: "timeline" as const,
		propSchema: {
			limit: {
				default: 10,
			},
		},
		content: "none",
	},
	{
		render: () => {
			const { tenant } = useParams<{ tenant: string }>();
			const tenantName = tenant ? decodeURIComponent(tenant) : "";
			const timeWindow = useTenantStore((state) => state.timeWindow);
			const filters = useTenantStore((state) => state.filters);

			if (!tenantName) {
				return (
					<div className="p-4 border rounded-lg">
						<div className="text-sm text-muted-foreground">
							No tenant selected
						</div>
					</div>
				);
			}

			return (
				<div className="my-4 outline-none min-w-0">
					<Timeline
						tenant={tenantName}
						timeWindow={timeWindow}
						filters={filters}
					/>
				</div>
			);
		},
	},
)();
