import {
	BarChart3,
	ChevronRight,
	Clock,
	Database,
	Home,
	Workflow,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { FlowTable } from "@/components/FlowTable";
import { MetricsTable } from "@/components/MetricsTable";
import { TenantControls } from "@/components/TenantControls";
import { Timeline } from "@/components/Timeline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLabelsStore } from "@/src/stores/labels";
import { useTenantStore } from "@/src/stores/tenant";
import type { Filter } from "../types/filter";
import type { TimeWindow } from "../types/timewindow";

export default function TenantPage() {
	const { tenant } = useParams<{ tenant: string }>();
	const [searchParams, setSearchParams] = useSearchParams();
	const [timeWindow, setTimeWindow] = useState<TimeWindow>({
		type: "relative",
		metadata: { value: "24h" },
	});
	const [filters, setFilters] = useState<Filter[]>([]);
	const setCurrentTenant = useTenantStore((state) => state.setCurrentTenant);

	// Get labels for filter dropdown
	const labels = useLabelsStore((state) => state.labels);

	// Decode the tenant name from the URL
	const tenantName = tenant ? decodeURIComponent(tenant) : "";

	// Get active tab from URL or default to timeline
	const activeTab = searchParams.get("tab") || "timeline";

	const handleTabChange = (value: string) => {
		setSearchParams({ tab: value });
	};

	useEffect(() => {
		setCurrentTenant(tenantName);
	}, [tenantName, setCurrentTenant]);

	return (
		<div className="flex-1 min-w-0 space-y-6 px-8 py-3">
			{/* Breadcrumb and Toolbar */}
			<div className="flex items-center justify-between gap-4">
				{/* Breadcrumb */}
				<nav className="flex items-center text-sm text-muted-foreground">
					<Link to="/" className="hover:text-foreground transition-colors">
						<Home className="h-4 w-4" />
					</Link>
					<ChevronRight className="h-4 w-4" />
					<span className="font-medium">{tenantName}</span>
					<ChevronRight className="h-4 w-4" />
					<span className="font-medium text-foreground">
						{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
					</span>
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
					{activeTab === "metrics" &&
						"Overview of key metrics and performance indicators"}
					{activeTab === "flows" && "View and analyze workflow executions"}
					{activeTab === "timeline" && "Track events and activities over time"}
				</p>
			</div>

			{/* Tabs */}
			<Tabs value={activeTab} onValueChange={handleTabChange}>
				<TabsList>
					<TabsTrigger value="timeline" className="flex items-center gap-2">
						<Clock className="h-4 w-4" />
						Timeline
					</TabsTrigger>
					<TabsTrigger value="metrics" className="flex items-center gap-2">
						<BarChart3 className="h-4 w-4" />
						Metrics
					</TabsTrigger>
					<TabsTrigger value="flows" className="flex items-center gap-2">
						<Workflow className="h-4 w-4" />
						Flows
					</TabsTrigger>
				</TabsList>

				<TabsContent value="metrics" className="space-y-4">
					<MetricsTable
						tenant={tenantName}
						timeWindow={timeWindow}
						filters={filters}
					/>
				</TabsContent>

				<TabsContent value="flows" className="space-y-4">
					<FlowTable
						tenant={tenantName}
						timeWindow={timeWindow}
						filters={filters}
					/>
				</TabsContent>

				<TabsContent value="timeline" className="space-y-4">
					<Timeline
						tenant={tenantName}
						timeWindow={timeWindow}
						filters={filters}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}
