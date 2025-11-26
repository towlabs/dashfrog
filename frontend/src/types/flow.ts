export type FlowStatus = "success" | "failure" | "running";

export interface StaticFlow {
	name: string;
	labels: string[];
}

export interface Flow {
	groupId: string;
	name: string;
	labels: Record<string, string>;
	lastRunStatus: FlowStatus;
	lastRunStartedAt: Date;
	lastRunEndedAt: Date | null;
	runCount: number;
	successCount: number;
	pendingCount: number;
	failedCount: number;
	lastDurationInSeconds: number | null;
	avgDurationInSeconds: number | null;
	minDurationInSeconds: number | null;
	maxDurationInSeconds: number | null;
}

export interface FlowHistory {
	flowId: string;
	groupId: string;
	startTime: Date;
	endTime: Date | null;
	status: FlowStatus;
	events: FlowHistoryEvent[];
	steps: FlowHistoryStep[];
	labels: Record<string, string>;
}

export interface FlowHistoryEvent {
	eventName: string;
	eventDt: Date;
}

export interface FlowHistoryStep {
	name: string;
	startTime: Date;
	endTime: Date | null;
	status: "success" | "failure" | "running";
}

export interface FlowRunCount {
	labels: Record<string, string>;
	runCount: number;
	successCount: number;
	failedCount: number;
	pendingCount: number;
}

export interface StaticFlow {
	name: string;
	labels: Record<string, string>;
}
