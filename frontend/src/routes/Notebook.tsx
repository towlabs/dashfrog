"use client";

import {
	BlockNoteSchema,
	combineByGroup,
	defaultBlockSpecs,
	insertOrUpdateBlock,
} from "@blocknote/core";
import * as locales from "@blocknote/core/locales";
import {
	DragHandleMenu,
	type DragHandleMenuProps,
	getDefaultReactSlashMenuItems,
	RemoveBlockItem,
	SideMenu,
	SideMenuController,
	SuggestionMenuController,
	useCreateBlockNote,
	useEditorChange,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import {
	getMultiColumnSlashMenuItems,
	multiColumnDropCursor,
	locales as multiColumnLocales,
	withMultiColumn,
} from "@blocknote/xl-multi-column";
import {
	ChevronRight,
	History,
	Home,
	TrendingUp,
	Workflow,
	ChartLine,
	RectangleEllipsis,
	Logs,
	TableOfContents,
	ListChecks,
	ListCollapse,
	RectangleHorizontal,
	BarChart3,
} from "lucide-react";
import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { TenantControls } from "@/components/TenantControls";
import { AddBlockButton } from "@/components/ui/add-block";
import { DragHandleButton } from "@/components/ui/drag-block";
import { FlowBlock } from "../blocks/FlowBlock";
import { FlowHistoryBlock } from "../blocks/FlowHistoryBlock";
import { FlowStatusBlock } from "../blocks/FlowStatusBlock";
import { HeatmapBlock } from "../blocks/HeatmapBlock";
import { MetricBlock } from "../blocks/MetricBlock";
import { MetricHistoryBlock } from "../blocks/MetricHistoryBlock";
import { TimelineBlock } from "../blocks/TimelineBlock";
import { useLabelsStore } from "../stores/labels";
import { useNotebooksStore } from "../stores/notebooks";
import { useTenantStore } from "../stores/tenant";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { resolveTimeWindow } from "../types/timewindow";
import { Notebook } from "../types/notebook";

const customDragHandleMenu = (menuProps: DragHandleMenuProps) => {
	const blockType = menuProps.block.type as string;
	if (
		blockType === "timeline" ||
		blockType === "flow" ||
		blockType === "flowHistory" ||
		blockType === "flowStatus" ||
		blockType === "heatmap" ||
		blockType === "metric" ||
		blockType === "metricHistory"
	) {
		return (
			<DragHandleMenu {...menuProps}>
				<DropdownMenuItem
					className={"bn-menu-item"}
					onClick={() =>
						useNotebooksStore.getState().openBlockSettings(menuProps.block.id)
					}
				>
					Settings
				</DropdownMenuItem>
				<RemoveBlockItem {...menuProps}>Delete</RemoveBlockItem>
			</DragHandleMenu>
		);
	} else {
		return <DragHandleMenu {...menuProps} />;
	}
};

export default function NotebookPage() {
	const { tenant, notebookId } = useParams<{
		tenant: string;
		notebookId: string;
	}>();

	const timeWindow = useTenantStore((state) => state.timeWindow);
	const filters = useTenantStore((state) => state.filters);
	const setCurrentTenant = useTenantStore((state) => state.setCurrentTenant);
	const setTimeWindow = useTenantStore((state) => state.setTimeWindow);
	const setFilters = useTenantStore((state) => state.setFilters);
	const labels = useLabelsStore((state) => state.labels);
	const currentNotebook = useNotebooksStore((state) => state.currentNotebook);
	const setCurrentNotebook = useNotebooksStore(
		(state) => state.setCurrentNotebook,
	);
	const updateNotebook = useNotebooksStore((state) => state.updateNotebook);
	const notebooksAreLoading = useNotebooksStore((state) => state.loading);
	const setOpenBlockSettings = useNotebooksStore(
		(state) => state.openBlockSettings,
	);
	const fetchFlows = useNotebooksStore((state) => state.fetchFlows);
	const fetchMetrics = useNotebooksStore((state) => state.fetchMetrics);
	const notebookCreating = useNotebooksStore((state) => state.notebookCreating);

	// Decode the tenant name from the URL
	const tenantName = tenant ? decodeURIComponent(tenant) : "";

	// Create BlockNote editor instance
	const editor = useCreateBlockNote({
		schema: withMultiColumn(
			BlockNoteSchema.create({
				blockSpecs: {
					...defaultBlockSpecs,
					timeline: TimelineBlock,
					flow: FlowBlock,
					flowHistory: FlowHistoryBlock,
					flowStatus: FlowStatusBlock,
					heatmap: HeatmapBlock,
					metric: MetricBlock,
					metricHistory: MetricHistoryBlock,
				},
			}),
		),
		dropCursor: multiColumnDropCursor,
		dictionary: {
			...locales.en,
			multi_column: multiColumnLocales.en,
		},
		placeholders: {
			...locales.en.placeholders,
			emptyDocument: "Write or press '/' for commands",
			default: "Write or press '/' for commands",
		},
	});

	useEffect(() => {
		if (!tenant || !notebookId || notebooksAreLoading) return;
		setCurrentTenant(tenant);
		const notebook = setCurrentNotebook(tenant, notebookId);
		if (!notebook) return;

		const timeoutId = setTimeout(() => {
			editor.replaceBlocks(editor.document, notebook.blocks || []);
		});

		return () => {
			clearTimeout(timeoutId);
		};
	}, [
		notebookId,
		tenant,
		setCurrentNotebook,
		editor,
		notebooksAreLoading,
		setCurrentTenant,
	]);

	useEffect(() => {
		if (!tenant) return;
		const { start, end } = resolveTimeWindow(timeWindow);
		void fetchFlows(tenant, start, end);
		void fetchMetrics(tenant, start, end);
	}, [tenant, timeWindow, fetchFlows, fetchMetrics]);

	// Save editor content changes (debounced in store)
	useEditorChange((editor) => {
		if (tenantName && currentNotebook && !notebookCreating) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			updateNotebook(tenantName, currentNotebook, {
				blocks: editor.document as any,
			});
		}
	}, editor);

	const renderNotebook = (notebook: Notebook) => {
		return (
			<div className="mx-auto py-12">
				{/* Title - Editable */}
				<div className="mx-32">
					<input
						type="text"
						value={notebook.title}
						onChange={(e) => {
							updateNotebook(tenantName, notebook, {
								title: e.target.value,
							});
						}}
						placeholder="Untitled"
						className="w-full text-5xl font-bold mb-4 outline-none border-none bg-transparent placeholder:text-muted-foreground"
					/>

					{/* Description - Editable */}
					<input
						type="text"
						value={notebook.description}
						onChange={(e) => {
							updateNotebook(tenantName, notebook, {
								description: e.target.value,
							});
						}}
						placeholder="Add a description..."
						className="w-full text-lg text-secondary-foreground mb-8 outline-none border-none bg-transparent placeholder:text-muted-foreground"
					/>
				</div>

				{/* BlockNote Editor */}
				<div className="mx-19">
					<BlockNoteView
						editor={editor}
						theme="light"
						slashMenu={false}
						sideMenu={false}
					>
						<SuggestionMenuController
							triggerCharacter="/"
							getItems={async (query: string) => {
								// Simple filter matching title/aliases like defaults
								const all = [
									...combineByGroup(
										getDefaultReactSlashMenuItems(editor),
										getMultiColumnSlashMenuItems(editor),
									),
									{
										title: "Events",
										onItemClick: () => {
											insertOrUpdateBlock(editor, {
												type: "timeline",
											});
										},
										group: "Timeline",
										key: "timeline_events",
										subtext: "Table listing of timeline events",
										icon: <Logs className="h-4 w-4" />,
										aliases: ["timeline"],
									},

									{
										title: "Flows Listing",
										onItemClick: () => {
											insertOrUpdateBlock(editor, {
												type: "flow",
											});
										},
										group: "Flows",
										key: "flows_listing",
										subtext: "Table listing of flows",
										icon: <ListChecks className="h-4 w-4" />,
										aliases: [],
									},
									{
										title: "Flow History",
										onItemClick: () => {
											const block = insertOrUpdateBlock(editor, {
												type: "flowHistory",
											});
											setOpenBlockSettings(block.id);
										},
										group: "Flows",
										key: "flow_history",
										subtext: "Execution history for a specific flow",
										icon: <ListCollapse className="h-4 w-4" />,
										aliases: [],
									},
									{
										title: "Flow Status",
										onItemClick: () => {
											const block = insertOrUpdateBlock(editor, {
												type: "flowStatus",
											});
											setOpenBlockSettings(block.id);
										},
										group: "Flows",
										key: "flow_status",
										subtext: "Status card for a specific flow",
										icon: <RectangleEllipsis className="h-4 w-4" />,
										aliases: [],
									},
									{
										title: "Heatmap",
										onItemClick: () => {
											const block = insertOrUpdateBlock(editor, {
												type: "heatmap",
											});
											setOpenBlockSettings(block.id);
										},
										group: "Flows",
										key: "flow_heatmap",
										subtext: "Heatmap showing daily flow status",
										icon: <BarChart3 className="h-4 w-4" />,
										aliases: ["flow heatmap"],
									},
									{
										title: "Number",
										onItemClick: () => {
											const block = insertOrUpdateBlock(editor, {
												type: "metric",
											});
											setOpenBlockSettings(block.id);
										},
										group: "Metrics",
										key: "metric_number",
										subtext: "Display a metric value",
										icon: <RectangleHorizontal className="h-4 w-4" />,
										aliases: ["metric"],
									},
									{
										title: "Chart",
										onItemClick: () => {
											const block = insertOrUpdateBlock(editor, {
												type: "metricHistory",
											});
											setOpenBlockSettings(block.id);
										},
										group: "Metrics",
										key: "metric_chart",
										subtext: "Chart showing metric history over time",
										icon: <ChartLine className="h-4 w-4" />,
										aliases: ["metric history"],
									},
								];
								const q = query.trim().toLowerCase();
								return q
									? all.filter(
											(i) =>
												i.title?.toLowerCase().includes(q) ||
												i.aliases?.some((a: string) => a.includes(q)),
										)
									: all;
							}}
						/>
						<SideMenuController
							sideMenu={(props) => (
								<SideMenu {...props}>
									<AddBlockButton {...props} />
									<DragHandleButton
										{...props}
										dragHandleMenu={customDragHandleMenu}
									/>
								</SideMenu>
							)}
						/>
					</BlockNoteView>
				</div>
			</div>
		);
	};

	return (
		<div className="flex-1 flex flex-col h-screen">
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
				{/* Time Window and Filters */}
				<TenantControls
					timeWindow={timeWindow}
					filters={filters}
					availableLabels={labels}
					onTimeWindowChange={setTimeWindow}
					onFiltersChange={setFilters}
				/>
			</div>

			{/* Notebook Content */}
			<div className="flex-1 overflow-y-auto">
				{currentNotebook &&
					!notebookCreating &&
					renderNotebook(currentNotebook)}
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
	);
}
