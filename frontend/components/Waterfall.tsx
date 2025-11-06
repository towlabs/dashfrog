import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { FlowHistoryEvent, FlowHistoryStep } from "@/src/types/flow";

type WaterfallProps = {
	steps: FlowHistoryStep[];
	events: FlowHistoryEvent[];
	startTime: Date;
	endTime: Date | null;
};

export function Waterfall({
	steps,
	events,
	startTime,
	endTime,
}: WaterfallProps) {
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

	// Calculate position for events
	const getEventPosition = (event: FlowHistoryEvent) => {
		const eventTime = event.eventDt.getTime();
		const position = ((eventTime - timelineStart) / totalDuration) * 100;
		return Math.max(0, Math.min(100, position)); // Clamp between 0-100%
	};

	return (
		<TooltipProvider>
			<div className="py-4 px-2 space-y-3">
				{/* Steps */}
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

				{/* Event Timeline */}
				{events.length > 0 && (
					<div className="flex items-center gap-3 pt-2">
						{/* Empty spacer matching step name width */}
						<span className="w-32 flex-shrink-0" />

						{/* Event timeline - line with dots */}
						<div className="flex-1 relative h-6">
							{/* Timeline line */}
							<div className="absolute top-1/2 left-0 right-0 h-px bg-muted-foreground/20" />

							{/* Event dots */}
							{events.map((event, index) => {
								const position = getEventPosition(event);
								return (
									<Tooltip key={index}>
										<TooltipTrigger asChild>
											<div
												className="absolute w-2 h-2 rounded-full bg-muted-foreground/80
                                           hover:bg-primary hover:scale-125 cursor-pointer
                                           transition-all -translate-x-1/2 -translate-y-1/2"
												style={{
													left: `${position}%`,
													top: "50%",
												}}
											/>
										</TooltipTrigger>
										<TooltipContent>
											<div className="font-medium">{event.eventName}</div>
											<div className="text-xs text-muted-foreground">
												{event.eventDt.toLocaleTimeString()}
											</div>
										</TooltipContent>
									</Tooltip>
								);
							})}
						</div>

						{/* Empty spacer matching duration width */}
						<span className="w-16 flex-shrink-0" />
					</div>
				)}
			</div>
		</TooltipProvider>
	);
}
