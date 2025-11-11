import {
	ChevronRight,
	Home,
	BarChart3,
	Workflow,
	Clock,
	Database,
} from "lucide-react";
import { useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { FlowTable } from "@/components/FlowTable";
import { MetricsTable } from "@/components/MetricsTable";
import { TableSkeleton } from "@/components/TableSkeleton";
import { TenantControls } from "@/components/TenantControls";
import { Timeline } from "@/components/Timeline";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLabelsStore } from "@/src/stores/labels";
import { useTenantStore } from "@/src/stores/tenant";

export default function TenantPage() {
	const { tenant } = useParams<{ tenant: string }>();
	const [searchParams, setSearchParams] = useSearchParams();
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

	// Get active tab from URL or default to statistics
	const activeTab = searchParams.get("tab") || "statistics";

	// Fetch data when tenant or tab changes
	useEffect(() => {
		if (tenantName) {
			void fetchMetrics(tenantName);
			void fetchFlows(tenantName);
			void fetchTimeline(tenantName);
		}
	}, [tenantName, fetchMetrics, fetchFlows, fetchTimeline]);

	const handleTabChange = (value: string) => {
		setSearchParams({ tab: value });
	};

	return (
		<div className="flex-1 space-y-6 px-8 py-2">
			{/* Breadcrumb and Toolbar */}
			<div className="flex items-center justify-between gap-4">
				{/* Breadcrumb */}
				<nav className="flex items-center text-sm text-muted-foreground">
					<Link to="/" className="hover:text-foreground transition-colors">
						<Home className="h-4 w-4" />
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

			{/* Page Title */}
			<div className="space-y-1">
				<h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
					<Database className="h-8 w-8 text-muted-foreground" />
					{tenantName}
				</h1>
				<p className="text-sm text-secondary-foreground">
					{activeTab === "statistics" &&
						"Overview of key metrics and performance indicators"}
					{activeTab === "flows" && "View and analyze workflow executions"}
					{activeTab === "timeline" && "Track events and activities over time"}
				</p>
			</div>

			{/* Tabs */}
			<Tabs value={activeTab} onValueChange={handleTabChange}>
				<TabsList>
					<TabsTrigger value="statistics" className="flex items-center gap-2">
						<BarChart3 className="h-4 w-4" />
						Statistics
					</TabsTrigger>
					<TabsTrigger value="flows" className="flex items-center gap-2">
						<Workflow className="h-4 w-4" />
						Flows
					</TabsTrigger>
					<TabsTrigger value="timeline" className="flex items-center gap-2">
						<Clock className="h-4 w-4" />
						Timeline
					</TabsTrigger>
				</TabsList>

				<TabsContent value="statistics" className="space-y-4">
					{metricsLoading ? (
						<TableSkeleton columns={3} rows={5} />
					) : (
						<MetricsTable metrics={metrics} />
					)}
				</TabsContent>

				<TabsContent value="flows" className="space-y-4">
					{flowsLoading ? (
						<TableSkeleton columns={6} rows={5} />
					) : (
						<FlowTable flows={flows} onAddFilter={addFilter} />
					)}
				</TabsContent>

				<TabsContent value="timeline" className="space-y-4">
					{timelineLoading ? (
						<TableSkeleton columns={4} rows={10} />
					) : (
						<Timeline events={timeline} />
					)}
				</TabsContent>
			</Tabs>
		</div>
	);
}
