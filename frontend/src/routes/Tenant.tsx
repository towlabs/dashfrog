import { ChevronRight, Home, BarChart3, Workflow, Clock } from "lucide-react";
import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { FlowTable } from "@/components/FlowTable";
import { MetricsTable } from "@/components/MetricsTable";
import { TableSkeleton } from "@/components/TableSkeleton";
import { TenantControls } from "@/components/TenantControls";
import { Timeline } from "@/components/Timeline";
import { useLabelsStore } from "@/src/stores/labels";
import { useTenantStore } from "@/src/stores/tenant";

export default function TenantPage() {
	const { tenant } = useParams<{ tenant: string }>();
	const fetchTimeline = useTenantStore((state) => state.fetchTimeline);
	const fetchFlows = useTenantStore((state) => state.fetchFlows);
	const fetchMetrics = useTenantStore((state) => state.fetchMetrics);
	const timeline = useTenantStore((state) => state.timeline);
	const timelineLoading = useTenantStore((state) => state.timelineLoading);
	const flows = useTenantStore((state) => state.flows);
	const flowsLoading = useTenantStore((state) => state.flowsLoading);
	const metrics = useTenantStore((state) => state.metrics);
	const metricsLoading = useTenantStore((state) => state.metricsLoading);
	const timeWindow = useTenantStore((state) => state.timeWindow);
	const filters = useTenantStore((state) => state.filters);
	const setTimeWindow = useTenantStore((state) => state.setTimeWindow);
	const setFilters = useTenantStore((state) => state.setFilters);
	const addFilter = useTenantStore((state) => state.addFilter);

	// Get labels for filter dropdown
	const labels = useLabelsStore((state) => state.labels);

	// Decode the tenant name from the URL
	const tenantName = tenant ? decodeURIComponent(tenant) : "";

	// Fetch timeline, flows, and metrics when tenant changes
	useEffect(() => {
		if (tenantName) {
			void fetchTimeline(tenantName);
			void fetchFlows(tenantName);
			void fetchMetrics(tenantName);
		}
	}, [tenantName, fetchTimeline, fetchFlows, fetchMetrics]);

	return (
		<div className="flex-1 space-y-6 p-8">
			{/* Breadcrumb and Toolbar */}
			<div className="flex items-center justify-between gap-4">
				{/* Breadcrumb */}
				<nav className="flex items-center space-x-2 text-sm text-muted-foreground">
					<Link to="/" className="hover:text-foreground transition-colors">
						<Home className="h-4 w-4" />
					</Link>
					<ChevronRight className="h-4 w-4" />
					<Link to="/" className="hover:text-foreground transition-colors">
						Tenants
					</Link>
					<ChevronRight className="h-4 w-4" />
					<span className="font-medium text-foreground">{tenantName}</span>
				</nav>

				{/* Time Window and Filters */}
				<TenantControls
					timeWindow={timeWindow}
					filters={filters}
					availableLabels={labels}
					onTimeWindowChange={setTimeWindow}
					onFiltersChange={setFilters}
				/>
			</div>

			{/* Page Header */}
			<div className="space-y-1">
				<h2 className="text-3xl font-bold tracking-tight">{tenantName}</h2>
				<p className="text-muted-foreground">Tenant dashboard and analytics</p>
			</div>

			{/* Metrics Section */}
			<section className="space-y-4">
				<h3 className="text-xl font-semibold flex items-center gap-2">
					<BarChart3 className="h-5 w-5" />
					Metrics
				</h3>
				{metricsLoading ? (
					<TableSkeleton columns={3} rows={5} />
				) : (
					<MetricsTable metrics={metrics} />
				)}
			</section>

			{/* Flows Section */}
			<section className="space-y-4">
				<h3 className="text-xl font-semibold flex items-center gap-2">
					<Workflow className="h-5 w-5" />
					Flows
				</h3>
				{flowsLoading ? (
					<TableSkeleton columns={6} rows={5} />
				) : (
					<FlowTable flows={flows} onAddFilter={addFilter} />
				)}
			</section>

			{/* Timeline Section */}
			<section className="space-y-4">
				<h3 className="text-xl font-semibold flex items-center gap-2">
					<Clock className="h-5 w-5" />
					Timeline
				</h3>
				{timelineLoading ? (
					<TableSkeleton columns={4} rows={10} />
				) : (
					<Timeline events={timeline} />
				)}
			</section>
		</div>
	);
}
