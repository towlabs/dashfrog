"use client";

import { FilterBadgesEditor } from "@/components/FilterBadgesEditor";
import { TimeWindowSelector } from "@/components/TimeWindowSelector";
import type { Filter } from "@/src/types/filter";
import type { Label } from "@/src/types/label";
import type { TimeWindow } from "@/src/types/timewindow";

interface TenantControlsProps {
	timeWindow: TimeWindow;
	filters: Filter[];
	availableLabels: Label[];
	onTimeWindowChange: (timeWindow: TimeWindow) => void;
	onFiltersChange: (filters: Filter[]) => void;
}

export function TenantControls({
	timeWindow,
	filters,
	availableLabels,
	onTimeWindowChange,
	onFiltersChange,
}: TenantControlsProps) {
	return (
		<div className="flex items-center flex-wrap gap-2">
			<FilterBadgesEditor
				availableLabels={availableLabels}
				filters={filters}
				onFiltersChange={onFiltersChange}
			/>
			<TimeWindowSelector value={timeWindow} onChange={onTimeWindowChange} />
		</div>
	);
}
