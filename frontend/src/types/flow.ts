export interface Flow {
	name: string;
	description: string | null;
	labels: Record<string, string>;
	status: string;
	status_reason: string | null;
	duration: number;
	service_name: string;
	trace_id: string;
	created_at: string | null;
	started_at: string | null;
	ended_at: string | null;
}
