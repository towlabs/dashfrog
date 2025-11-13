import {
	BookOpen,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	CornerDownRight,
	Database,
	Home,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useLabelsStore } from "@/src/stores/labels";
import { useNotebooksStore } from "@/src/stores/notebooks";
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

const _MAX_VISIBLE_TENANTS = 10;

export default function SideMenu({
	isCollapsed: controlledCollapsed,
	onToggleCollapse,
}: SideMenuProps = {}) {
	const pathname = useLocation().pathname;
	const [internalCollapsed, setInternalCollapsed] = useState(false);
	const _navigate = useNavigate();
	const [searchOpen, setSearchOpen] = useState(false);
	const [notebooksOpen, setNotebooksOpen] = useState(true);
	const _tenants = useLabelsStore((state) => state.tenants);
	const notebooksStore = useNotebooksStore((state) => state.notebooks);
	const notebooksLoading = useNotebooksStore((state) => state.loading);
	const fetchNotebooks = useNotebooksStore((state) => state.fetchNotebooks);

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

	// Detect selected tenant from URL
	const selectedTenant = pathname.startsWith("/tenants/")
		? decodeURIComponent(pathname.split("/")[2])
		: null;

	// Fetch notebooks when tenant changes
	useEffect(() => {
		if (selectedTenant) {
			void fetchNotebooks(selectedTenant);
		}
	}, [selectedTenant, fetchNotebooks]);

	// Get notebooks for the selected tenant
	const notebooks = selectedTenant ? notebooksStore[selectedTenant] || [] : [];

	const tenantMenuItems = selectedTenant
		? [
				{
					id: "data",
					label: "Data",
					icon: Database,
					href: `/tenants/${encodeURIComponent(selectedTenant)}`,
				},
			]
		: [];

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
							className={cn("transition-all", "w-12")}
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

					{/* Tenant Navigation */}
					{!isCollapsed && selectedTenant && (
						<>
							<div className="px-3 py-2">
								<Separator />
							</div>
							<div className="px-3 py-2">
								<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
									{selectedTenant}
								</h3>
							</div>

							<div className="space-y-1">
								{tenantMenuItems.map((item) => {
									const Icon = item.icon;
									const isActive = pathname === item.href;

									return (
										<Link
											key={item.id}
											to={item.href}
											className={cn(
												"flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent",
												isActive && "bg-accent text-accent-foreground",
											)}
											style={{ color: isActive ? undefined : "#5f5e5b" }}
										>
											<Icon className="h-4 w-4 shrink-0" />
											<span className="flex-1">{item.label}</span>
										</Link>
									);
								})}
							</div>

							{/* Notebooks Collapsible */}
							<Collapsible
								open={notebooksOpen}
								onOpenChange={setNotebooksOpen}
								className="space-y-1"
							>
								<CollapsibleTrigger className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent w-full">
									<BookOpen className="h-4 w-4 shrink-0" />
									<span className="flex-1 text-left">Notebooks</span>
									<ChevronDown
										className={cn(
											"h-4 w-4 shrink-0 transition-transform",
											notebooksOpen && "rotate-180",
										)}
									/>
								</CollapsibleTrigger>
								<CollapsibleContent className="space-y-1 pl-4">
									{notebooksLoading ? (
										[1, 2, 3].map((i) => (
											<div
												key={i}
												className="h-9 rounded-lg bg-accent/50 animate-pulse"
											/>
										))
									) : notebooks.length > 0 ? (
										notebooks.map((notebook) => (
											<Link
												key={notebook.id}
												to={`/tenants/${encodeURIComponent(selectedTenant)}/notebooks/${notebook.id}`}
												className={cn(
													"flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent",
													pathname ===
														`/tenants/${encodeURIComponent(selectedTenant)}/notebooks/${notebook.id}` &&
														"bg-accent text-accent-foreground",
												)}
												style={{
													color:
														pathname ===
														`/tenants/${encodeURIComponent(selectedTenant)}/notebooks/${notebook.id}`
															? undefined
															: "#5f5e5b",
												}}
											>
												{notebook.title}
											</Link>
										))
									) : (
										<div className="px-3 py-2 text-xs text-muted-foreground">
											No notebooks
										</div>
									)}
								</CollapsibleContent>
							</Collapsible>
						</>
					)}
				</nav>
			</div>

			<SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
		</aside>
	);
}
