import { cn } from "@/lib/utils";
import type { FlowHistoryStep } from "@/src/types/flow";

type WaterfallProps = {
	steps: FlowHistoryStep[];
	startTime: Date;
	endTime: Date | null;
};

export function Waterfall({ steps, startTime, endTime }: WaterfallProps) {
	if (steps.length === 0) {
		return (
			<div className="text-sm text-muted-foreground py-4">
				No steps recorded for this execution.
			</div>
		);
	}

	// Calculate the total timeline duration
	const timelineStart = startTime.getTime();
	const timelineEnd = endTime ? endTime.getTime() : Date.now();
	const totalDuration = timelineEnd - timelineStart;

	// Calculate position and width for each step
	const getStepMetrics = (step: FlowHistoryStep) => {
		const stepStart = step.startTime.getTime();
		const stepEnd = step.endTime ? step.endTime.getTime() : Date.now();
		const stepDuration = stepEnd - stepStart;

		// Position as percentage from the start
		const leftPercent = ((stepStart - timelineStart) / totalDuration) * 100;
		// Width as percentage of total duration
		const widthPercent = (stepDuration / totalDuration) * 100;

		return {
			left: `${leftPercent}%`,
			width: `${widthPercent}%`,
			durationMs: stepDuration,
		};
	};

	const formatDuration = (ms: number) => {
		if (ms < 1000) return `${Math.round(ms)}ms`;
		if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
		return `${(ms / 60000).toFixed(2)}m`;
	};

	const getStatusColor = (status: FlowHistoryStep["status"]) => {
		switch (status) {
			case "success":
				return "bg-[#5cb660]";
			case "failure":
				return "bg-[#e56458]";
			case "running":
				return "bg-[#2883df]";
			default:
				return "bg-gray-500";
		}
	};

	return (
		<div className="py-4 px-2 space-y-3">
			{steps.map((step, index) => {
				const metrics = getStepMetrics(step);
				return (
					<div key={index} className="relative">
						<div className="flex items-center gap-3 mb-1">
							<span className="text-sm font-medium w-32 flex-shrink-0 truncate">
								{step.name}
							</span>
							<div className="flex-1 relative h-6 bg-muted rounded">
								<div
									className={cn(
										"absolute h-full rounded transition-all",
										getStatusColor(step.status),
									)}
									style={{
										left: metrics.left,
										width: metrics.width,
									}}
								/>
							</div>
							<span className="text-xs text-muted-foreground w-16 text-right flex-shrink-0">
								{formatDuration(metrics.durationMs)}
							</span>
						</div>
					</div>
				);
			})}
		</div>
	);
}
