import { ChevronRight, Home } from "lucide-react";
import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { FlowTable } from "@/components/FlowTable";
import { TableSkeleton } from "@/components/TableSkeleton";
import { TenantControls } from "@/components/TenantControls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLabelsStore } from "@/src/stores/labels";
import { useTenantStore } from "@/src/stores/tenant";

export default function TenantPage() {
	const { tenant } = useParams<{ tenant: string }>();
	const fetchTimeline = useTenantStore((state) => state.fetchTimeline);
	const fetchFlows = useTenantStore((state) => state.fetchFlows);
	const timeline = useTenantStore((state) => state.timeline);
	const flows = useTenantStore((state) => state.flows);
	const flowsLoading = useTenantStore((state) => state.flowsLoading);
	const timeWindow = useTenantStore((state) => state.timeWindow);
	const filters = useTenantStore((state) => state.filters);
	const setTimeWindow = useTenantStore((state) => state.setTimeWindow);
	const setFilters = useTenantStore((state) => state.setFilters);
	const addFilter = useTenantStore((state) => state.addFilter);

	// Get labels for filter dropdown
	const labels = useLabelsStore((state) => state.labels);

	// Decode the tenant name from the URL
	const tenantName = tenant ? decodeURIComponent(tenant) : "";

	// Fetch timeline and flows when tenant changes
	useEffect(() => {
		if (tenantName) {
			void fetchTimeline(tenantName);
			void fetchFlows(tenantName);
		}
	}, [tenantName, fetchTimeline, fetchFlows]);

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

			{/* Page Content */}
			<Tabs defaultValue="flows" className="space-y-4">
				<div className="flex justify-end">
					<TabsList>
						<TabsTrigger value="flows">Flows</TabsTrigger>
						<TabsTrigger value="timeline">Timeline</TabsTrigger>
					</TabsList>
				</div>

				<TabsContent value="flows" className="space-y-4">
					{flowsLoading ? (
						<TableSkeleton columns={6} rows={5} />
					) : (
						<FlowTable flows={flows} onAddFilter={addFilter} />
					)}
				</TabsContent>

				<TabsContent value="timeline" className="space-y-4">
					<div className="rounded-lg border bg-card p-8">
						<div className="text-center text-muted-foreground">
							Timeline: {timeline.length} events
						</div>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
