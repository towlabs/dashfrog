import { Building2, Home, PanelLeft } from "lucide-react";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/TableSkeleton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useLabelsStore } from "@/src/stores/labels";
import { useUIStore } from "../stores/ui";

export default function HomePage() {
	const tenants = useLabelsStore((state) => state.tenants);
	const loading = useLabelsStore((state) => state.loading);
	const navigate = useNavigate();
	const fetchLabelsAndTenants = useLabelsStore(
		(state) => state.fetchLabelsAndTenants,
	);
	const toggleSidebar = useUIStore((state) => state.toggleSidebar);

	useEffect(() => {
		void fetchLabelsAndTenants();
	}, [fetchLabelsAndTenants]);

	const handleTenantClick = (tenantName: string) => {
		navigate(`/tenants/${encodeURIComponent(tenantName)}`);
	};

	return (
		<div className="flex-1 space-y-6 px-8 py-4">
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
			</nav>

			{/* Page Title */}
			<div className="space-y-1">
				<h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
					<Home className="h-8 w-8 text-muted-foreground" />
					Tenants
				</h1>
				<p className="text-sm text-secondary-foreground">
					Select a tenant namespace to view their data
				</p>
			</div>

			{/* Tenant Table */}
			<div>
				{loading && !tenants ? (
					<TableSkeleton columns={1} rows={5} />
				) : tenants.length === 0 ? (
					<EmptyState
						icon={Building2}
						title="No tenants yet"
						description="Tenants will appear automatically once you start pushing events to Dashfrog."
					/>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Tenant</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{tenants.map((tenantName) => (
								<TableRow
									key={tenantName}
									onClick={() => handleTenantClick(tenantName)}
									className="cursor-pointer"
								>
									<TableCell className="font-medium">d/{tenantName}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</div>
		</div>
	);
}
