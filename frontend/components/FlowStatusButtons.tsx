"use client";

import type { Flow } from "@/src/types/flow";

type StatusFilter = "all" | "running" | "success" | "failure";

type Props = {
	flow: Flow;
	statusFilter: StatusFilter;
	onStatusFilterChange: (filter: StatusFilter) => void;
};

export function FlowStatusButtons({
	flow,
	statusFilter,
	onStatusFilterChange,
}: Props) {
	return (
		<>
			<button
				type="button"
				data-active={statusFilter === "all"}
				className="data-[active=true]:bg-muted/50 relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
				onClick={() => onStatusFilterChange("all")}
			>
				<span className="text-muted-foreground text-xs flex items-center gap-2">
					All
				</span>
				<span className="text-lg leading-none font-bold sm:text-3xl">
					{flow.runCount.toLocaleString()}
				</span>
			</button>
			<button
				type="button"
				data-active={statusFilter === "success"}
				className="data-[active=true]:bg-muted/50 relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
				onClick={() => onStatusFilterChange("success")}
			>
				<span className="text-muted-foreground text-xs flex items-center gap-2">
					<div className="h-2 w-2 rounded-full bg-green-500" />
					Success
				</span>
				<span className="text-lg leading-none font-bold sm:text-3xl text-green-500">
					{flow.successCount.toLocaleString()}
				</span>
			</button>
			<button
				type="button"
				data-active={statusFilter === "failure"}
				className="data-[active=true]:bg-muted/50 relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
				onClick={() => onStatusFilterChange("failure")}
			>
				<span className="text-muted-foreground text-xs flex items-center gap-2">
					<div className="h-2 w-2 rounded-full bg-red-500" />
					Failed
				</span>
				<span className="text-lg leading-none font-bold sm:text-3xl text-red-500">
					{flow.failedCount.toLocaleString()}
				</span>
			</button>
			<button
				type="button"
				data-active={statusFilter === "running"}
				className="data-[active=true]:bg-muted/50 relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6"
				onClick={() => onStatusFilterChange("running")}
			>
				<span className="text-muted-foreground text-xs flex items-center gap-2">
					<div className="h-2 w-2 rounded-full bg-blue-500" />
					Running
				</span>
				<span className="text-lg leading-none font-bold sm:text-3xl text-blue-500">
					{flow.pendingCount.toLocaleString()}
				</span>
			</button>
		</>
	);
}

export type { StatusFilter };
