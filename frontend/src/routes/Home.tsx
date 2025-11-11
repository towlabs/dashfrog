import { Building2, ChevronRight, Home as HomeIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { TableSkeleton } from "@/components/TableSkeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useLabelsStore } from "@/src/stores/labels";

export default function HomePage() {
	const tenants = useLabelsStore((state) => state.tenants);
	const loading = useLabelsStore((state) => state.loading);
	const navigate = useNavigate();

	const handleTenantClick = (tenantName: string) => {
		navigate(`/tenants/${encodeURIComponent(tenantName)}`);
	};

	return (
		<div className="flex-1 space-y-6 px-8 py-4">
			{/* Breadcrumb */}
			<nav className="flex items-center space-x-2 text-sm text-muted-foreground">
				<HomeIcon className="h-4 w-4 mr-2" />
				Tenants
			</nav>

			{/* Page Header */}
			<div className="space-y-1">
				<h2 className="text-3xl font-bold tracking-tight">Tenants</h2>
				<p className="text-muted-foreground">
					Select a tenant to view their data
				</p>
			</div>

			{/* Tenant Table */}
			<div>
				{loading ? (
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
								<TableHead>Tenant Name</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{tenants.map((tenantName) => (
								<TableRow
									key={tenantName}
									onClick={() => handleTenantClick(tenantName)}
									className="cursor-pointer"
								>
									<TableCell className="font-medium">{tenantName}</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</div>
		</div>
	);
}
