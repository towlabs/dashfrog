import {
	Building2,
	ChevronLeft,
	ChevronRight,
	CornerDownRight,
	Home,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useLabelsStore } from "@/src/stores/labels";
import SearchDialog from "./SearchDialog";

const topMenuItems = [
	{ id: "home", label: "Home", icon: Home, href: "/" },
	{
		id: "search",
		label: "Go To",
		icon: CornerDownRight,
		href: "/search",
		shortcut: "⌘K",
	},
];

interface SideMenuProps {
	isCollapsed?: boolean;
	onToggleCollapse?: (collapsed: boolean) => void;
}

const MAX_VISIBLE_TENANTS = 10;

export default function SideMenu({
	isCollapsed: controlledCollapsed,
	onToggleCollapse,
}: SideMenuProps = {}) {
	const pathname = useLocation().pathname;
	const [internalCollapsed, setInternalCollapsed] = useState(false);
	const _navigate = useNavigate();
	const [searchOpen, setSearchOpen] = useState(false);
	const tenants = useLabelsStore((state) => state.tenants);

	// Use controlled state if provided, otherwise use internal state
	const isCollapsed =
		controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

	const toggleCollapse = () => {
		const newCollapsed = !isCollapsed;
		if (onToggleCollapse) {
			onToggleCollapse(newCollapsed);
		} else {
			setInternalCollapsed(newCollapsed);
		}
	};

	return (
		<aside
			className={cn(
				"fixed left-0 top-0 flex h-screen flex-col border-r transition-all duration-300 z-30",
				isCollapsed ? "w-16" : "w-64",
				"hidden md:flex",
			)}
			style={{ backgroundColor: "#f9f8f7" }}
		>
			<div className="flex h-14 items-center border-b px-3">
				<div className={cn("flex transition-all items-center")}>
					{!isCollapsed && (
						<img
							src="/assets/logo.svg"
							alt="DashFrog"
							className={cn("transition-all", "w-6")}
						/>
					)}
					{!isCollapsed && <span className="font-semibold">DashFrog</span>}
				</div>
				<Button
					variant="ghost"
					size="icon"
					className="ml-auto h-8 w-8"
					onClick={toggleCollapse}
				>
					{isCollapsed ? (
						<ChevronRight className="h-4 w-4" />
					) : (
						<ChevronLeft className="h-4 w-4" />
					)}
					<span className="sr-only">Toggle sidebar</span>
				</Button>
			</div>

			<div className="flex-1 overflow-y-auto">
				<nav className="space-y-1 p-2">
					{/* Top Menu Items */}
					{topMenuItems.map((item) => {
						const Icon = item.icon;
						const isActive = pathname === item.href;
						const isSearchItem = item.id === "search";

						if (isSearchItem) {
							return (
								<button
									type="button"
									key={item.id}
									onClick={() => setSearchOpen(true)}
									className={cn(
										"flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent w-full text-left",
										isCollapsed && "justify-center px-2",
									)}
									style={{ color: "#5f5e5b" }}
								>
									<Icon className="h-4 w-4 shrink-0" />
									{!isCollapsed && (
										<>
											<span className="flex-1">{item.label}</span>
											{item.shortcut && (
												<span className="ml-auto text-xs text-muted-foreground">
													{item.shortcut}
												</span>
											)}
										</>
									)}
								</button>
							);
						}

						return (
							<Link
								key={item.id}
								to={item.href}
								className={cn(
									"flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent",
									isActive && "bg-accent text-accent-foreground",
									isCollapsed && "justify-center px-2",
								)}
								style={{ color: isActive ? undefined : "#5f5e5b" }}
							>
								<Icon className="h-4 w-4 shrink-0" />
								{!isCollapsed && (
									<>
										<span className="flex-1">{item.label}</span>
										{item.shortcut && (
											<span className="ml-auto text-xs text-muted-foreground">
												{item.shortcut}
											</span>
										)}
									</>
								)}
							</Link>
						);
					})}

					{/* Separator */}
					{!isCollapsed && tenants.length > 0 && (
						<div className="px-3 py-2">
							<Separator />
						</div>
					)}

					{/* Tenant List */}
					{!isCollapsed && tenants.length > 0 && (
						<div className="space-y-1">
							{tenants.slice(0, MAX_VISIBLE_TENANTS).map((tenant) => {
								const tenantPath = `/tenants/${encodeURIComponent(tenant)}`;
								const isActive = pathname === tenantPath;

								return (
									<Link
										key={tenant}
										to={tenantPath}
										className={cn(
											"flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent",
											isActive && "bg-accent text-accent-foreground",
										)}
										style={{ color: isActive ? undefined : "#5f5e5b" }}
									>
										<Building2 className="h-4 w-4 shrink-0" />
										<span className="flex-1 truncate">{tenant}</span>
									</Link>
								);
							})}

							{/* "and x more" button */}
							{tenants.length > MAX_VISIBLE_TENANTS && (
								<button
									type="button"
									onClick={() => setSearchOpen(true)}
									className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent w-full text-left"
									style={{ color: "#5f5e5b" }}
								>
									<div className="h-4 w-4 shrink-0" />
									<span className="flex-1 text-xs text-muted-foreground">
										and {tenants.length - MAX_VISIBLE_TENANTS} more...
									</span>
								</button>
							)}
						</div>
					)}
				</nav>
			</div>

			<SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
		</aside>
	);
}
