"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";
import {
	ChevronRight,
	ChevronsRight,
	Home,
	MessageSquare,
	MessageSquareText,
	Pencil,
	PenLine,
} from "lucide-react";
import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import BlockNoteEditor from "@/components/BlockNoteEditor";
import { CommentsSideMenu } from "@/components/CommentsSideMenu";
import { TenantControls } from "@/components/TenantControls";
import { Button } from "@/components/ui/button";
import { useLabelsStore } from "../stores/labels";
import { useNotebooksStore } from "../stores/notebooks";
import { useTenantStore } from "../stores/tenant";

export default function NotebookPage() {
	const { tenant, notebookId } = useParams<{
		tenant: string;
		notebookId: string;
	}>();

	const setCurrentTenant = useTenantStore((state) => state.setCurrentTenant);
	const labels = useLabelsStore((state) => state.labels);
	const currentNotebook = useNotebooksStore((state) => state.currentNotebook);
	const timeWindow = useNotebooksStore(
		(state) => state.currentNotebook?.timeWindow,
	);
	const filters = useNotebooksStore((state) => state.currentNotebook?.filters);
	const setCurrentNotebook = useNotebooksStore(
		(state) => state.setCurrentNotebook,
	);
	const updateNotebook = useNotebooksStore((state) => state.updateNotebook);
	const notebooksAreLoading = useNotebooksStore((state) => state.loading);
	const fetchFlows = useNotebooksStore((state) => state.fetchFlows);
	const fetchMetrics = useNotebooksStore((state) => state.fetchMetrics);
	const notebookCreating = useNotebooksStore((state) => state.notebookCreating);
	const openBlockSettings = useNotebooksStore(
		(state) => state.openBlockSettings,
	);
	const startDate = useNotebooksStore((state) => state.startDate);
	const endDate = useNotebooksStore((state) => state.endDate);
	const commentsDrawerOpen = useNotebooksStore(
		(state) => state.commentsDrawerOpen,
	);
	const toggleCommentsDrawer = useNotebooksStore(
		(state) => state.toggleCommentsDrawer,
	);
	const fetchComments = useNotebooksStore((state) => state.fetchComments);

	// Decode the tenant name from the URL
	const tenantName = tenant ? decodeURIComponent(tenant) : "";

	// Fetch comments when start or end dates change
	useEffect(() => {
		if (startDate === null || endDate === null) return;
		void fetchComments(undefined, startDate, endDate);
	}, [startDate, endDate, fetchComments]);

	useEffect(() => {
		if (!tenant || !notebookId || notebooksAreLoading) return;
		setCurrentTenant(tenant);
		setCurrentNotebook(tenant, notebookId);
	}, [
		notebookId,
		tenant,
		setCurrentNotebook,
		notebooksAreLoading,
		setCurrentTenant,
	]);

	useEffect(() => {
		if (
			!tenant ||
			startDate === null ||
			endDate === null ||
			filters === undefined ||
			notebookId === undefined
		)
			return;
		void fetchFlows(tenant, startDate, endDate, filters, notebookId);
		void fetchMetrics();
	}, [
		tenant,
		fetchFlows,
		fetchMetrics,
		startDate,
		endDate,
		filters,
		notebookId,
	]);

	return (
		<div className="flex-1 flex h-screen">
			{/* Main Content Area */}
			<div className="flex-1 flex flex-col">
				{/* Toolbar */}
				<div className="flex items-center justify-between gap-4 px-8 py-3">
					{/* Breadcrumb */}
					<nav className="flex items-center text-sm text-muted-foreground">
						<Link to="/" className="hover:text-foreground transition-colors">
							<Home className="h-4 w-4" />
						</Link>
						<ChevronRight className="h-4 w-4" />
						<span className="font-medium">{tenantName}</span>
						<ChevronRight className="h-4 w-4" />
						<span className="font-medium text-foreground">
							{currentNotebook ? currentNotebook.title : ""}
						</span>
					</nav>
					{/* Time Window, Filters, and Comments */}
					<div className="flex items-center gap-0">
						{timeWindow !== undefined && filters !== undefined && (
							<TenantControls
								timeWindow={timeWindow}
								filters={filters}
								availableLabels={labels}
								onTimeWindowChange={(timeWindow) => {
									if (!currentNotebook) return;
									updateNotebook(tenantName, currentNotebook, {
										timeWindow,
									});
								}}
								onFiltersChange={(filters) => {
									if (!currentNotebook) return;
									updateNotebook(tenantName, currentNotebook, {
										filters,
									});
								}}
							/>
						)}
						{/* Comments Button */}
						<Button
							variant="ghost"
							size="sm"
							className="justify-start text-sm text-muted-foreground h-6"
							onClick={toggleCommentsDrawer}
						>
							{commentsDrawerOpen ? (
								<ChevronsRight className="size-5" />
							) : (
								<Pencil className="size-4" />
							)}
						</Button>
					</div>
				</div>

				{/* Notebook Content */}
				<div className="flex-1 overflow-y-auto">
					{currentNotebook && !notebookCreating && (
						<BlockNoteEditor
							tenantName={tenantName}
							notebook={currentNotebook}
							openBlockSettings={openBlockSettings}
							updateNotebook={updateNotebook}
						/>
					)}
					{(!currentNotebook || notebookCreating) && (
						<div className="mx-auto py-12">
							<div className="mx-32 space-y-4">
								{/* Title skeleton */}
								<div className="h-7 w-3/4 bg-muted rounded-lg animate-pulse" />
								{/* Description skeleton */}
								<div className="h-7 w-1/2 bg-muted rounded-lg animate-pulse" />
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Comments Side Menu */}
			<CommentsSideMenu visible={commentsDrawerOpen} />
		</div>
	);
}
