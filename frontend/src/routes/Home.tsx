import { ChevronRight, Home as HomeIcon, Inbox } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
	const tenantLabels = useLabelsStore((state) => state.tenants);
	const loading = useLabelsStore((state) => state.loading);
	const navigate = useNavigate();

	// Get tenant values (these are the different tenants)
	// Since tenants is an array of Label objects, we get the first one and extract its values
	const tenants = tenantLabels.length > 0 ? tenantLabels[0].values : [];

	const handleTenantClick = (tenantName: string) => {
		navigate(`/tenants/${encodeURIComponent(tenantName)}`);
	};

	return (
		<div className="flex-1 space-y-6 p-8">
			{/* Breadcrumb */}
			<nav className="flex items-center space-x-2 text-sm text-muted-foreground">
				<HomeIcon className="h-4 w-4" />
				<ChevronRight className="h-4 w-4" />
				<span className="font-medium text-foreground">Tenants</span>
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
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Tenant Name</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{loading ? (
							<TableRow>
								<TableCell colSpan={2} className="text-center py-12">
									<div className="flex flex-col items-center justify-center space-y-3">
										<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
										<p className="text-sm text-muted-foreground">
											Loading tenants...
										</p>
									</div>
								</TableCell>
							</TableRow>
						) : tenants.length === 0 ? (
							<TableRow>
								<TableCell colSpan={2} className="text-center py-12">
									<div className="flex flex-col items-center justify-center space-y-4">
										<div className="rounded-full bg-muted p-4">
											<Inbox className="h-8 w-8 text-muted-foreground" />
										</div>
										<div className="space-y-1">
											<h3 className="font-semibold">No tenants found</h3>
											<p className="text-sm text-muted-foreground">
												There are no tenants configured in the system yet.
											</p>
										</div>
									</div>
								</TableCell>
							</TableRow>
						) : (
							tenants.map((tenantName) => (
								<TableRow
									key={tenantName}
									onClick={() => handleTenantClick(tenantName)}
									className="cursor-pointer"
								>
									<TableCell className="font-medium">{tenantName}</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
