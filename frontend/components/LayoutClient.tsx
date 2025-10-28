import * as React from "react";
import { Toaster } from "sonner";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { EventsProvider } from "@/src/contexts/events";
import { LabelsProvider } from "@/src/contexts/labels";
import { MetricsProvider } from "@/src/contexts/metrics";
import SideMenu from "./SideMenu";

export default function LayoutClient({
	children,
}: {
	children: React.ReactNode;
}) {
	const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
	const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

	return (
		<LabelsProvider>
			<MetricsProvider>
				<EventsProvider>
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
							className={`flex flex-1 flex-col transition-all duration-300 ${sidebarCollapsed ? "md:ml-16" : "md:ml-64"}`}
						>
							<header className="border-b bg-background"></header>
							<main className="flex-1 overflow-y-auto">{children}</main>
						</div>
					</div>
				</EventsProvider>
			</MetricsProvider>
		</LabelsProvider>
	);
}
