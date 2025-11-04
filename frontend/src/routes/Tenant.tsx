import { ChevronRight, Home } from "lucide-react";
import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { FilterBadgesEditor } from "@/components/FilterBadgesEditor";
import { TimeWindowSelector } from "@/components/TimeWindowSelector";
import { useLabelsStore } from "@/src/stores/labels";
import { useTenantStore } from "@/src/stores/tenant";

export default function TenantPage() {
	const { tenant } = useParams<{ tenant: string }>();
	const fetchTimeline = useTenantStore((state) => state.fetchTimeline);
	const timeline = useTenantStore((state) => state.timeline);
	const loading = useTenantStore((state) => state.loading);
	const timeWindow = useTenantStore((state) => state.timeWindow);
	const filters = useTenantStore((state) => state.filters);
	const setTimeWindow = useTenantStore((state) => state.setTimeWindow);
	const setFilters = useTenantStore((state) => state.setFilters);

	// Get labels for filter dropdown
	const labels = useLabelsStore((state) => state.labels);

	// Decode the tenant name from the URL
	const tenantName = tenant ? decodeURIComponent(tenant) : "";

	// Fetch timeline when tenant changes
	useEffect(() => {
		if (tenantName) {
			void fetchTimeline(tenantName);
		}
	}, [tenantName, fetchTimeline]);

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
				<div className="flex items-center gap-3 flex-wrap">
					{/* Time Window Selector */}
					<TimeWindowSelector
						value={timeWindow}
						onChange={(timeWindow) => {
							setTimeWindow(timeWindow);
						}}
					/>

					{/* Filter Badges Editor */}
					<FilterBadgesEditor
						availableLabels={labels.map((l) => l.name)}
						filters={filters}
						onFiltersChange={setFilters}
					/>
				</div>
			</div>

			{/* Page Header */}
			<div className="space-y-1">
				<h2 className="text-3xl font-bold tracking-tight">{tenantName}</h2>
				<p className="text-muted-foreground">Tenant dashboard and analytics</p>
			</div>

			{/* Page Content */}
			<div className="rounded-lg border bg-card p-8">
				{loading ? (
					<div className="text-center text-muted-foreground">
						Loading timeline...
					</div>
				) : (
					<div className="text-center text-muted-foreground">
						Timeline loaded: {timeline.length} events
					</div>
				)}
			</div>
		</div>
	);
}
