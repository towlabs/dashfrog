"use client";

import {
	type Block,
	BlockNoteSchema,
	defaultBlockSpecs,
	insertOrUpdateBlock,
} from "@blocknote/core";
import * as locales from "@blocknote/core/locales";
import {
	SideMenu,
	SideMenuController,
	type SideMenuProps,
	SuggestionMenuController,
	useEditorChange,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import {
	multiColumnDropCursor,
	locales as multiColumnLocales,
	withMultiColumn,
} from "@blocknote/xl-multi-column";
import {
	BarChart3,
	ChartLine,
	ChevronRight,
	Home,
	ListChecks,
	ListCollapse,
	Logs,
	RectangleEllipsis,
	RectangleHorizontal,
} from "lucide-react";
import React, { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { TenantControls } from "@/components/TenantControls";
import { AddBlockButton } from "@/components/ui/add-block";
import { DragHandleButton } from "@/components/ui/drag-block";
import { SuggestionMenu } from "@/components/ui/suggestion-menu";
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
import type { Notebook } from "../types/notebook";
import { resolveTimeWindow } from "../types/timewindow";
import { customEditor, getSlashMenuItems } from "../utils/editor";

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
	const setOpenBlockSettings = useNotebooksStore(
		(state) => state.openBlockSettings,
	);
	const fetchFlows = useNotebooksStore((state) => state.fetchFlows);
	const fetchMetrics = useNotebooksStore((state) => state.fetchMetrics);
	const notebookCreating = useNotebooksStore((state) => state.notebookCreating);
	const openBlockSettings = useNotebooksStore(
		(state) => state.openBlockSettings,
	);

	// Decode the tenant name from the URL
	const tenantName = tenant ? decodeURIComponent(tenant) : "";

	// Create BlockNote editor instance
	// biome-ignore lint/correctness/noUnusedVariables: removing table from defaultSpecs
	const { table, ...defaultSpecs } = defaultBlockSpecs;
	const editor = customEditor({
		schema: withMultiColumn(
			BlockNoteSchema.create({
				blockSpecs: {
					...defaultSpecs,
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
		extensions: [],
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
		if (!tenant || timeWindow === undefined || filters === undefined) return;
		const { start, end } = resolveTimeWindow(timeWindow);
		void fetchFlows(tenant, start, end, filters);
		void fetchMetrics();
	}, [tenant, fetchFlows, fetchMetrics, timeWindow, filters]);

	// Save editor content changes (debounced in store)
	useEditorChange((editor) => {
		if (tenantName && currentNotebook && !notebookCreating) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			updateNotebook(tenantName, currentNotebook, {
				blocks: editor.document as Block[],
			});
		}
	}, editor);

	// const customDragHandleMenu = React.useCallback(
	// 	(menuProps: DragHandleMenuProps) => {
	// 		const blockType = menuProps.block.type as string;
	// 		if (
	// 			blockType === "timeline" ||
	// 			blockType === "flow" ||
	// 			blockType === "flowHistory" ||
	// 			blockType === "flowStatus" ||
	// 			blockType === "heatmap" ||
	// 			blockType === "metric" ||
	// 			blockType === "metricHistory"
	// 		) {
	// 			return (
	// 				<DragHandleMenu {...menuProps}>
	// 					<DropdownMenuItem
	// 						className={"bn-menu-item"}
	// 						onClick={() => {
	// 							openBlockSettings(menuProps.block.id);
	// 						}}
	// 					>
	// 						Settings
	// 					</DropdownMenuItem>
	// 					<RemoveBlockItem {...menuProps}>Delete</RemoveBlockItem>
	// 				</DragHandleMenu>
	// 			);
	// 		} else {
	// 			return <DragHandleMenu {...menuProps} />;
	// 		}
	// 	},
	// 	[openBlockSettings],
	// );

	const customSideMenu = React.useCallback(
		(props: SideMenuProps) => {
			return (
				<SideMenu {...props}>
					<AddBlockButton {...props} />
					<DragHandleButton openBlockSettings={openBlockSettings} {...props} />
				</SideMenu>
			);
		},
		[openBlockSettings],
	);

	const renderNotebook = React.useCallback(
		(notebook: Notebook) => {
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
					<div className="mx-19 mb-32">
						<BlockNoteView
							editor={editor}
							// key={notebook.id}
							theme="light"
							slashMenu={false}
							sideMenu={false}
							// tableHandles={false}
						>
							<SuggestionMenuController
								triggerCharacter="/"
								suggestionMenuComponent={SuggestionMenu}
								getItems={async (query: string) => {
									// Simple filter matching title/aliases like defaults
									const all = getSlashMenuItems(editor, [
										{
											title: "Events",
											onItemClick: () => {
												insertOrUpdateBlock(editor, {
													type: "timeline",
												});
											},
											group: "Timeline",
											subtext: "Table listing of timeline events",
											icon: <Logs className="size-4.5" />,
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
											subtext: "Table listing of flows",
											icon: <ListChecks className="size-4.5" />,
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
											subtext: "Execution history for a specific flow",
											icon: <ListCollapse className="size-4.5" />,
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
											icon: <RectangleEllipsis className="size-4.5" />,
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
											icon: <BarChart3 className="size-4.5" />,
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
											icon: <RectangleHorizontal className="size-4.5" />,
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
											icon: <ChartLine className="size-4.5" />,
											aliases: ["metric history"],
										},
									]);
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
							<SideMenuController sideMenu={customSideMenu} />
						</BlockNoteView>
					</div>
				</div>
			);
		},
		[tenantName, editor, setOpenBlockSettings, updateNotebook, customSideMenu],
	);

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
