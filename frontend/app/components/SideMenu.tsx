"use client";

import {
	BookOpen,
	Calendar,
	ChartScatter,
	ChevronLeft,
	ChevronRight,
	Hash,
	Home,
	Package,
	Plus,
	Search,
	Settings,
	Tags,
	User,
	Zap,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { notebookStorage } from "@/lib/notebook-storage";
import { cn } from "@/lib/utils";
import { useNotebooks } from "./notebooks-context";
import SearchDialog from "./SearchDialog";

const topMenuItems = [
	{ id: "home", label: "Home", icon: Home, href: "/" },
	{
		id: "search",
		label: "Search",
		icon: Search,
		href: "/search",
		shortcut: "⌘K",
	},
	{ id: "catalog", label: "Data Catalog", icon: BookOpen, href: "/catalog" },
	{ id: "labels", label: "Labels", icon: Tags, href: "/labels" },
	{ id: "events", label: "Calendar", icon: Calendar, href: "/events" },
];

interface SideMenuProps {
	isCollapsed?: boolean;
	onToggleCollapse?: (collapsed: boolean) => void;
}

export default function SideMenu({
	isCollapsed: controlledCollapsed,
	onToggleCollapse,
}: SideMenuProps = {}) {
	const pathname = useLocation().pathname;
	const [internalCollapsed, setInternalCollapsed] = useState(false);
	const navigate = useNavigate();
	const [searchOpen, setSearchOpen] = useState(false);
	const { notebooks, refreshNotebooks } = useNotebooks();

	const handleCreateNotebook = () => {
		const newNotebook = notebookStorage.create({
			title: "Untitled Notebook",
			description: "",
			locked: false,
			timeWindow: {
				type: "relative",
				metadata: { value: "24h" },
			},
			blockNoteId: uuidv4(),
		});
		refreshNotebooks();
		navigate(`/notebook/${newNotebook.id}`);
	};

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
				<div
					className={cn(
						"flex items-center gap-2 transition-all",
						isCollapsed && "justify-center",
					)}
				>
					<Package className="h-6 w-6" />
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
					<div className="py-2">
						<div className="border-t border-border" />
					</div>

					{/* Notebooks Section */}
					{!isCollapsed && (
						<div className="group px-3 py-1 flex items-center justify-between">
							<h3 className="text-xs font-medium" style={{ color: "#5f5e5b" }}>
								Notebooks
							</h3>
							{notebooks.length > 0 && (
								<button
									onClick={handleCreateNotebook}
									className="opacity-0 group-hover:opacity-100 hover:bg-accent rounded p-1 transition-all"
									title="Add notebook"
								>
									<Plus className="h-3 w-3" />
								</button>
							)}
						</div>
					)}
					{notebooks.length === 0
						? !isCollapsed && (
								<Button
									onClick={handleCreateNotebook}
									variant="outline"
									className="mx-2 my-1 flex w-[calc(100%-1rem)] items-center justify-center gap-2 px-3 py-2"
								>
									<Plus className="h-4 w-4 text-muted-foreground" />
									Create new notebook
								</Button>
							)
						: notebooks.map((notebook) => {
								const isNotebookActive =
									pathname === `/notebook/${notebook.id}`;
								return (
									<Link
										key={notebook.id}
										to={`/notebook/${notebook.id}`}
										className={cn(
											"flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent",
											isNotebookActive && "bg-accent text-accent-foreground",
											isCollapsed && "justify-center px-2",
										)}
										style={{ color: isNotebookActive ? undefined : "#5f5e5b" }}
									>
										<Hash className="h-4 w-4 shrink-0 text-muted-foreground" />
										{!isCollapsed && (
											<span className="flex-1">{notebook.title}</span>
										)}
									</Link>
								);
							})}
				</nav>
			</div>

			{/* Bottom Section - Settings and Avatar */}
			<div className="mt-auto border-t border-border">
				<div className="space-y-1 p-2">
					<Link
						to="/settings"
						className={cn(
							"flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent",
							pathname === "/settings" && "bg-accent text-accent-foreground",
							isCollapsed && "justify-center px-2",
						)}
						style={{ color: pathname === "/settings" ? undefined : "#5f5e5b" }}
					>
						<Settings className="h-4 w-4 shrink-0" />
						{!isCollapsed && <span>Settings</span>}
					</Link>

					<div
						className={cn(
							"flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent",
							isCollapsed && "justify-center px-2",
						)}
					>
						<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
							<User className="h-4 w-4" />
						</div>
						{!isCollapsed && (
							<div className="flex flex-col">
								<span
									className="text-sm font-medium"
									style={{ color: "#5f5e5b" }}
								>
									John Doe
								</span>
								<span className="text-xs" style={{ color: "#5f5e5b" }}>
									john@example.com
								</span>
							</div>
						)}
					</div>
				</div>
			</div>

			<SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
		</aside>
	);
}
