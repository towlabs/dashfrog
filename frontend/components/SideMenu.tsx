import {
	BookOpen,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	CornerDownRight,
	Database,
	Home,
	Plus,
	Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [notebookToDelete, setNotebookToDelete] = useState<{
		id: string;
		title: string;
	} | null>(null);
	const _tenants = useLabelsStore((state) => state.tenants);
	const notebooksStore = useNotebooksStore((state) => state.notebooks);
	const notebooksLoading = useNotebooksStore((state) => state.loading);
	const fetchNotebooks = useNotebooksStore((state) => state.fetchNotebooks);
	const createNotebook = useNotebooksStore((state) => state.createNotebook);
	const deleteNotebook = useNotebooksStore((state) => state.deleteNotebook);
	const navigate = useNavigate();

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
					label: "Data Library",
					icon: Database,
					href: `/tenants/${encodeURIComponent(selectedTenant)}`,
				},
			]
		: [];

	const handleCreateNotebook = () => {
		if (!selectedTenant) return;

		const newNotebook = {
			title: "Untitled Notebook",
			description: "",
			blocks: null,
		};

		// Create notebook (returns immediately with UUID)
		const created = createNotebook(selectedTenant, newNotebook);

		// Navigate immediately (API call happens in background)
		navigate(
			`/tenants/${encodeURIComponent(selectedTenant)}/notebooks/${created.id}`,
		);
	};

	const handleDeleteClick = (
		e: React.MouseEvent,
		notebookId: string,
		notebookTitle: string,
	) => {
		e.preventDefault(); // Prevent navigation
		e.stopPropagation(); // Prevent parent click

		setNotebookToDelete({ id: notebookId, title: notebookTitle });
		setDeleteDialogOpen(true);
	};

	const handleConfirmDelete = async () => {
		if (!selectedTenant || !notebookToDelete) return;

		try {
			await deleteNotebook(selectedTenant, notebookToDelete.id);
			setDeleteDialogOpen(false);
			setNotebookToDelete(null);
			// Navigate to tenant page after deletion
			navigate(`/tenants/${encodeURIComponent(selectedTenant)}`);
		} catch (error) {
			console.error("Failed to delete notebook:", error);
			setDeleteDialogOpen(false);
			setNotebookToDelete(null);
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
				<div className={cn("flex transition-all items-center gap-1")}>
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
								<div className="flex items-center gap-1 group">
									<CollapsibleTrigger className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent flex-1">
										<BookOpen className="h-4 w-4 shrink-0" />
										<span className="flex-1 text-left">Notebooks</span>
										<Plus
											className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
											onClick={(event) => {
												event.preventDefault();
												void handleCreateNotebook();
											}}
										/>
										<ChevronDown
											className={cn(
												"h-4 w-4 shrink-0 transition-transform",
												notebooksOpen && "rotate-180",
											)}
										/>
									</CollapsibleTrigger>
								</div>
								<CollapsibleContent className="space-y-1 pl-4">
									{notebooksLoading ? (
										[1, 2, 3].map((i) => (
											<div
												key={i}
												className="h-9 rounded-lg bg-accent/50 animate-pulse"
											/>
										))
									) : notebooks.length > 0 ? (
										notebooks.map((notebook) => {
											const isActive =
												pathname ===
												`/tenants/${encodeURIComponent(selectedTenant)}/notebooks/${notebook.id}`;
											return (
												<div key={notebook.id} className="group relative">
													<Link
														to={`/tenants/${encodeURIComponent(selectedTenant)}/notebooks/${notebook.id}`}
														className={cn(
															"flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent pr-10",
															isActive && "bg-accent text-accent-foreground",
														)}
														style={{
															color: isActive ? undefined : "#5f5e5b",
														}}
													>
														{notebook.title}
													</Link>
													<Button
														variant="ghost"
														size="icon"
														className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
														onClick={(e) =>
															handleDeleteClick(e, notebook.id, notebook.title)
														}
														title="Delete notebook"
													>
														<Trash2 className="h-3.5 w-3.5 text-destructive" />
													</Button>
												</div>
											);
										})
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

			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete notebook?</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete "{notebookToDelete?.title}"? This
							action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleConfirmDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</aside>
	);
}
