import {
	BarChart3,
	ChevronRight,
	Database,
	Home,
	PanelLeft,
	Workflow,
} from "lucide-react";
import { useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { MetricsTable } from "@/components/MetricsTable";
import { StaticFlowTable } from "@/components/StaticFlowTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTenantStore } from "@/src/stores/tenant";
import { useUIStore } from "../stores/ui";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function TenantPage() {
	const { tenant } = useParams<{ tenant: string }>();
	const [searchParams, setSearchParams] = useSearchParams();
	const setCurrentTenant = useTenantStore((state) => state.setCurrentTenant);
	const toggleSidebar = useUIStore((state) => state.toggleSidebar);
	// Decode the tenant name from the URL
	const tenantName = tenant ? decodeURIComponent(tenant) : "";

	// Get active tab from URL or default to metrics
	const activeTab = searchParams.get("tab") || "metrics";

	const handleTabChange = (value: string) => {
		setSearchParams({ tab: value });
	};

	useEffect(() => {
		setCurrentTenant(tenantName);
	}, [tenantName, setCurrentTenant]);

	return (
		<div className="flex-1 min-w-0 space-y-6 px-8 py-4">
			{/* Breadcrumb and Toolbar */}
			<div className="flex items-center justify-between gap-4">
				{/* Breadcrumb */}
				<nav className="flex items-center text-muted-foreground gap-1">
					<Button
						variant="ghost"
						size="icon"
						className="h-6 w-6"
						onClick={toggleSidebar}
					>
						<PanelLeft className="h-4 w-4" />
						<span className="sr-only">Toggle sidebar</span>
					</Button>
					<Separator
						orientation="vertical"
						className="h-4 mr-2 text-secondary-foreground"
					/>
					<Link
						to="/"
						className="hover:text-foreground transition-colors font-lg"
					>
						<span style={{ color: "#558f6f" }} className="font-extrabold">
							d
						</span>
					</Link>
					/
					<Link
						to={`/tenants/${encodeURIComponent(tenantName)}`}
						className="hover:text-foreground transition-colors font-medium"
					>
						{tenantName}
					</Link>
				</nav>
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
				</p>
			</div>

			{/* Tabs */}
			<Tabs value={activeTab} onValueChange={handleTabChange}>
				<TabsList>
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
					<MetricsTable tenant={tenantName} />
				</TabsContent>

				<TabsContent value="flows" className="space-y-4">
					<StaticFlowTable tenant={tenantName} />
				</TabsContent>
			</Tabs>
		</div>
	);
}
