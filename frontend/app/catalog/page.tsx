import { Download, RefreshCcw, TrendingUp, Workflow } from "lucide-react";
import { useState } from "react";
import type { Filter } from "@/components/FilterBadgesEditor";
import { MetricsCatalog } from "@/components/metrics-catalog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkflowsCatalog } from "@/components/workflows-catalog";

export default function CatalogPage() {
	const [searchTerm, setSearchTerm] = useState("");
	const [activeTab, setActiveTab] = useState("workflows");
	const [filters, setFilters] = useState<Filter[]>([]);

	const handleRefresh = async () => {
		// Refresh will be handled by the child components via their useEffect hooks
		// We can force a re-render by clearing and resetting filters, or we could
		// add a refresh prop/callback to the child components
		window.location.reload();
	};

	const handleExport = () => {
		console.log("Exporting data...");
	};

	return (
		<div className="flex-1 space-y-4 p-8 pt-6">
			{/* Header */}
			<div className="flex items-center justify-between space-y-2">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">Data Catalog</h2>
					<p className="text-gray-500">
						Browse and manage your workflows and metrics
					</p>
				</div>
				<div className="flex items-center space-x-4">
					{/* Tabs moved to header */}
					<Tabs value={activeTab} onValueChange={setActiveTab}>
						<TabsList className="grid w-full max-w-md grid-cols-2">
							<TabsTrigger
								value="workflows"
								className="flex items-center gap-2"
							>
								<Workflow className="h-4 w-4" />
								Workflows
							</TabsTrigger>
							<TabsTrigger value="metrics" className="flex items-center gap-2">
								<TrendingUp className="h-4 w-4" />
								Metrics
							</TabsTrigger>
						</TabsList>
					</Tabs>
					<div className="flex items-center space-x-2">
						<Button variant="outline" size="default" onClick={handleRefresh}>
							<RefreshCcw className="h-4 w-4" />
							<span className="ml-2 hidden lg:inline">Refresh</span>
						</Button>
						<Button variant="outline" size="default" onClick={handleExport}>
							<Download className="h-4 w-4" />
							<span className="ml-2 hidden lg:inline">Export</span>
						</Button>
					</div>
				</div>
			</div>

			{/* Tab Content */}
			<Tabs
				value={activeTab}
				onValueChange={setActiveTab}
				className="space-y-4"
			>
				{/* Workflows Tab */}
				<TabsContent value="workflows" className="space-y-4">
					<WorkflowsCatalog
						searchTerm={searchTerm}
						onSearchChange={setSearchTerm}
						filters={filters}
						onFiltersChange={setFilters}
					/>
				</TabsContent>

				{/* Metrics Tab */}
				<TabsContent value="metrics" className="space-y-4">
					<MetricsCatalog
						searchTerm={searchTerm}
						onSearchChange={setSearchTerm}
						filters={filters}
						onFiltersChange={setFilters}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}
