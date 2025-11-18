import * as React from "react";
import { Toaster } from "sonner";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useLabelsStore } from "@/src/stores/labels";
import SideMenu from "./SideMenu";

export default function LayoutClient({
	children,
}: {
	children: React.ReactNode;
}) {
	const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
	const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
	const fetchLabels = useLabelsStore((state) => state.fetchLabels);
	const fetchTenants = useLabelsStore((state) => state.fetchTenants);

	// Load labels on app startup
	React.useEffect(() => {
		void fetchLabels();
		void fetchTenants();
	}, [fetchLabels, fetchTenants]);

	return (
		<>
			<Toaster position="top-right" richColors closeButton />
			<div className="relative flex min-h-screen">
				{/* Desktop Sidebar - Fixed */}
				<SideMenu
					isCollapsed={sidebarCollapsed}
					onToggleCollapse={setSidebarCollapsed}
				/>

				{/* Mobile Sidebar */}
				<Drawer open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
					<DrawerContent side="left" className="p-0">
						<SideMenu />
					</DrawerContent>
				</Drawer>

				{/* Main Content - With left margin to account for fixed sidebar */}
				<div
					className={`flex flex-1 flex-col transition-all duration-300 overflow-hidden ${sidebarCollapsed ? "md:ml-16" : "md:ml-64"}`}
				>
					<header className="border-b bg-background"></header>
					<main className="flex-1 overflow-y-auto overflow-x-hidden">
						{children}
					</main>
				</div>
			</div>
		</>
	);
}
