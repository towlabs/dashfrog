import {
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	Clock,
	XCircle,
} from "lucide-react";
import React from "react";
import type { Step } from "@/src/types/step";

/**
 * Parse a UTC date string and ensure it's treated as UTC
 * Handles dates with or without 'Z' suffix
 */
function parseUTCDate(utcDateString: string): Date {
	const dateStr = utcDateString.endsWith("Z")
		? utcDateString
		: `${utcDateString}Z`;
	return new Date(dateStr);
}

interface StepTimelineProps {
	steps: Step[];
	workflowCreatedAt: string | null;
	workflowEndedAt: string | null;
	workflowLabels?: Record<string, string>;
}

interface StepItemProps {
	step: Step;
	depth?: number;
	workflowStartTime: number;
	workflowEndTime: number;
	totalDuration: number;
	workflowLabels: Record<string, string>;
}

const StepItem: React.FC<StepItemProps> = ({
	step,
	depth = 0,
	workflowStartTime,
	workflowEndTime,
	totalDuration,
	workflowLabels,
}) => {
	const [isExpanded, setIsExpanded] = React.useState(false);
	const hasChildren = step.children && step.children.length > 0;

	const getStatusIcon = (status: string) => {
		const statusLower = status.toLowerCase();
		if (statusLower === "success" || statusLower === "completed") {
			return <CheckCircle2 className="h-4 w-4 text-green-500" />;
		} else if (statusLower === "failed" || statusLower === "error") {
			return <XCircle className="h-4 w-4 text-red-500" />;
		} else {
			return <Clock className="h-4 w-4 text-blue-500" />;
		}
	};

	const getStatusBarColor = (status: string) => {
		const statusLower = status.toLowerCase();
		if (statusLower === "success" || statusLower === "completed") {
			return "bg-green-500";
		} else if (statusLower === "failed" || statusLower === "error") {
			return "bg-red-500";
		} else {
			return "bg-blue-500";
		}
	};

	const formatDuration = (ms: number) => {
		if (ms >= 1000) {
			return `${(ms / 1000).toFixed(2)}s`;
		}
		return `${ms}ms`;
	};

	// Calculate timeline positions
	const stepCreatedTime = step.created_at
		? parseUTCDate(step.created_at).getTime()
		: null;
	const stepStartedTime = step.started_at
		? parseUTCDate(step.started_at).getTime()
		: null;
	const stepEndedTime = step.ended_at
		? parseUTCDate(step.ended_at).getTime()
		: null;

	// Calculate delays and positions relative to workflow timeline
	let delayStartPercent = 0;
	let delayWidthPercent = 0;
	let activeStartPercent = 0;
	let activeWidthPercent = 0;
	let showDelay = false;

	if (
		stepCreatedTime &&
		stepStartedTime &&
		stepEndedTime &&
		totalDuration > 0
	) {
		// Delay bar: from step created_at to step started_at
		const delayDuration = stepStartedTime - stepCreatedTime;
		showDelay = delayDuration >= 1000; // Only show if delay >= 1 second

		if (showDelay) {
			delayStartPercent =
				((stepCreatedTime - workflowStartTime) / totalDuration) * 100;
			delayWidthPercent = (delayDuration / totalDuration) * 100;
		}

		// Active bar: from step started_at to step ended_at
		const activeDuration = stepEndedTime - stepStartedTime;
		activeStartPercent =
			((stepStartedTime - workflowStartTime) / totalDuration) * 100;
		activeWidthPercent = (activeDuration / totalDuration) * 100;
	}

	// Filter out labels that exist in workflow labels with the same value
	const uniqueLabels = Object.entries(step.labels).filter(([key, value]) => {
		return !workflowLabels[key] || workflowLabels[key] !== value;
	});

	return (
		<div className="relative">
			<div className="flex items-stretch hover:bg-muted/30 transition-colors">
				{/* Sticky left section - Fixed width name column - spans full row height */}
				<div className="flex flex-col gap-1 py-2 flex-shrink-0 sticky left-0 top-0 bg-background z-10 w-80 border-r border-border">
					{/* Top section: Indentation + Expand + Status + Name */}
					<div className="flex items-start gap-2">
						{/* Indentation spacer + Expand button + Status icon */}
						<div
							className="flex items-start gap-2 flex-shrink-0"
							style={{ width: `${depth * 24 + 40}px` }}
						>
							<div
								style={{ width: `${depth * 24}px` }}
								className="flex-shrink-0"
							/>

							{/* Expand/Collapse button for steps with children */}
							{hasChildren ? (
								<button
									type="button"
									onClick={() => setIsExpanded(!isExpanded)}
									className="flex-shrink-0 mt-1 p-0.5 hover:bg-muted rounded transition-colors"
								>
									{isExpanded ? (
										<ChevronDown className="h-3 w-3" />
									) : (
										<ChevronRight className="h-3 w-3" />
									)}
								</button>
							) : (
								<div className="w-4 flex-shrink-0" />
							)}

							{/* Status icon */}
							<div className="flex-shrink-0 mt-0.5">
								{getStatusIcon(step.status)}
							</div>
						</div>

						{/* Step name - Takes remaining space in fixed column */}
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2">
								<span className="font-medium text-sm truncate">
									{step.name}
								</span>
							</div>
						</div>
					</div>

					{/* Service name tag */}
					{step.service_name && (
						<div style={{ paddingLeft: `${depth * 24 + 40}px` }}>
							<span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">
								{step.service_name}
							</span>
						</div>
					)}

					{/* Step-specific labels */}
					{uniqueLabels.length > 0 && (
						<div
							className="flex gap-1 flex-wrap"
							style={{ paddingLeft: `${depth * 24 + 40}px` }}
						>
							{uniqueLabels.map(([key, value]) => (
								<span
									key={key}
									className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
								>
									{key}: {value}
								</span>
							))}
						</div>
					)}

					{/* Description and status reason */}
					{(step.description || step.status_reason) && (
						<div
							className="text-xs text-muted-foreground pr-2"
							style={{ paddingLeft: `${depth * 24 + 40}px` }}
						>
							{step.description && <p className="mb-1">{step.description}</p>}
							{step.status_reason && (
								<p className="text-red-600 mb-1">{step.status_reason}</p>
							)}
						</div>
					)}
				</div>

				{/* Timeline visualization - scrollable */}
				<div className="flex-1 min-w-0 flex items-center py-2 relative ml-3">
					{/* Background grid lines */}
					<div className="absolute inset-0 flex">
						{[...Array(10)].map((_, i) => (
							<div key={i} className="flex-1 border-l border-muted/20"></div>
						))}
					</div>

					{/* Timeline bars container */}
					<div className="relative w-full h-6 flex items-center min-w-[600px]">
						{/* Delay bar (phantom) */}
						{showDelay && (
							<div
								className="absolute h-4 bg-gray-300 opacity-50 rounded-sm"
								style={{
									left: `${Math.max(0, delayStartPercent)}%`,
									width: `${Math.max(0.5, delayWidthPercent)}%`,
								}}
								title={`Delay: ${formatDuration(stepStartedTime! - stepCreatedTime!)}`}
							/>
						)}

						{/* Active bar (colored) */}
						{stepStartedTime && stepEndedTime && (
							<div
								className={`absolute h-4 rounded-sm flex items-center px-1 ${getStatusBarColor(step.status)}`}
								style={{
									left: `${Math.max(0, activeStartPercent)}%`,
									width: `${Math.max(0.5, activeWidthPercent)}%`,
								}}
								title={`Active: ${!step.ended_at ? "?" : formatDuration(step.duration)}`}
							>
								{activeWidthPercent > 5 && (
									<span className="text-white text-[10px] font-medium truncate">
										{!step.ended_at ? "?" : formatDuration(step.duration)}
									</span>
								)}
							</div>
						)}
					</div>
				</div>

				{/* Duration display */}
				<div className="flex-shrink-0 w-20 text-right py-2 ml-3">
					<span className="text-xs text-muted-foreground font-mono">
						{!step.ended_at ? "?" : formatDuration(step.duration)}
					</span>
				</div>
			</div>

			{/* Render children recursively */}
			{hasChildren && isExpanded && (
				<div>
					{step.children!.map((child, index) => (
						<StepItem
							key={`${child.span_id}-${index}`}
							step={child}
							depth={depth + 1}
							workflowStartTime={workflowStartTime}
							workflowEndTime={workflowEndTime}
							totalDuration={totalDuration}
							workflowLabels={workflowLabels}
						/>
					))}
				</div>
			)}
		</div>
	);
};

export const StepTimeline: React.FC<StepTimelineProps> = ({
	steps,
	workflowCreatedAt,
	workflowEndedAt,
	workflowLabels = {},
}) => {
	if (!steps || steps.length === 0) {
		return (
			<div className="p-8 border-2 border-dashed border-muted rounded-lg bg-muted/50">
				<div className="text-center text-muted-foreground">
					<div className="text-sm font-medium mb-1">No Steps Available</div>
					<div className="text-xs">
						This flow does not have any steps recorded
					</div>
				</div>
			</div>
		);
	}

	// Calculate workflow timeline bounds
	const workflowStartTime = workflowCreatedAt
		? parseUTCDate(workflowCreatedAt).getTime()
		: Date.now();
	const workflowEndTime = workflowEndedAt
		? parseUTCDate(workflowEndedAt).getTime()
		: Date.now();
	const totalDuration = workflowEndTime - workflowStartTime;

	if (totalDuration <= 0) {
		return (
			<div className="p-8 border-2 border-dashed border-muted rounded-lg bg-muted/50">
				<div className="text-center text-muted-foreground">
					<div className="text-sm font-medium mb-1">Invalid Timeline</div>
					<div className="text-xs">Workflow timeline data is incomplete</div>
				</div>
			</div>
		);
	}

	const formatDuration = (ms: number) => {
		if (ms >= 1000) {
			return `${(ms / 1000).toFixed(2)}s`;
		}
		return `${ms}ms`;
	};

	return (
		<div className="space-y-1 min-w-[1200px]">
			{/* Timeline header with time markers - Sticky vertically and horizontally */}
			<div className="flex items-center pb-2 border-b text-xs text-muted-foreground font-medium sticky top-0 bg-background z-20">
				{/* Sticky left header - Fixed width name column */}
				<div className="flex items-center flex-shrink-0 sticky left-0 bg-background z-20 w-80 px-3 border-r border-border">
					Step Name
				</div>

				{/* Scrollable timeline header */}
				<div className="flex-1 flex justify-between px-2 ml-3 min-w-[600px]">
					<span>0s</span>
					<span>{formatDuration(totalDuration / 2)}</span>
					<span>{formatDuration(totalDuration)}</span>
				</div>

				<div className="flex-shrink-0 w-20 text-right ml-3">Duration</div>
			</div>

			{/* Steps */}
			{steps.map((step, index) => (
				<StepItem
					key={`${step.span_id}-${index}`}
					step={step}
					workflowStartTime={workflowStartTime}
					workflowEndTime={workflowEndTime}
					totalDuration={totalDuration}
					workflowLabels={workflowLabels}
				/>
			))}
		</div>
	);
};
