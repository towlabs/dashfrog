import * as React from "react";
import { Toaster } from "sonner";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useLabelsStore } from "@/src/stores/labels";
import { useUIStore } from "@/src/stores/ui";
import SideMenu from "./SideMenu";

export default function LayoutClient({
	children,
}: {
	children: React.ReactNode;
}) {
	const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
	const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed);
	const fetchLabelsAndTenants = useLabelsStore(
		(state) => state.fetchLabelsAndTenants,
	);

	// Load labels on app startup
	React.useEffect(() => {
		// fetch every 5 seconds
		const interval = setInterval(() => {
			void fetchLabelsAndTenants();
		}, 5000);
		return () => clearInterval(interval);
	}, [fetchLabelsAndTenants]);

	return (
		<>
			<Toaster position="top-right" richColors closeButton />
			<div className="flex min-h-screen w-screen overflow-hidden">
				{/* Desktop Sidebar */}
				<SideMenu isCollapsed={sidebarCollapsed} />

				{/* Mobile Sidebar */}
				<Drawer open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
					<DrawerContent side="left" className="p-0">
						<SideMenu />
					</DrawerContent>
				</Drawer>

				{/* Main Content */}
				<div className="flex flex-1 flex-col min-w-0">
					<header className="border-b bg-background"></header>
					<main className="flex-1 overflow-y-auto overflow-x-hidden">
						{children}
					</main>
				</div>
			</div>
		</>
	);
}
