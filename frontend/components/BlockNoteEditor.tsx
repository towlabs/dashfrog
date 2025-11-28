"use client";

import {
	type Block,
	BlockNoteSchema,
	defaultBlockSpecs,
	insertOrUpdateBlock,
} from "@blocknote/core";
import * as locales from "@blocknote/core/locales";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/shadcn/style.css";
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
	ChartLine,
	History,
	LayoutGrid,
	RectangleEllipsis,
	SquareDivide,
	SquareDot,
	Table2,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { AddBlockButton } from "@/components/ui/add-block";
import { DragHandleButton } from "@/components/ui/drag-block";
import { SuggestionMenu } from "@/components/ui/suggestion-menu";
import { FlowBlock } from "@/src/blocks/FlowBlock";
import { FlowHistoryBlock } from "@/src/blocks/FlowHistoryBlock";
import { FlowStatusBlock } from "@/src/blocks/FlowStatusBlock";
import { HeatmapBlock } from "@/src/blocks/HeatmapBlock";
import { MetricBlock } from "@/src/blocks/MetricBlock";
import { MetricHistoryBlock } from "@/src/blocks/MetricHistoryBlock";
import { MetricRatioBlock } from "@/src/blocks/MetricRatioBlock";
import { useNotebooksStore } from "@/src/stores/notebooks";
import type { Notebook } from "@/src/types/notebook";
import { customEditor, getSlashMenuItems } from "@/src/utils/editor";
import { Filter } from "@/src/types/filter";

type BlockNoteEditorProps = {
	tenantName: string;
	notebook: Notebook;
	openBlockSettings: (blockId: string) => void;
	updateNotebook: (
		tenantName: string,
		notebook: Notebook,
		updates: Partial<Notebook>,
	) => void;
	editable?: boolean;
};

export default function BlockNoteEditor({
	tenantName,
	notebook,
	openBlockSettings,
	updateNotebook,
	editable = true,
}: BlockNoteEditorProps) {
	const [initialized, setInitialized] = useState(false);
	const [mounted, setMounted] = useState(false);

	// Get store functions and state
	const startDate = useNotebooksStore((state) => state.startDate);
	const endDate = useNotebooksStore((state) => state.endDate);
	const fetchComments = useNotebooksStore((state) => state.fetchComments);

	// Create BlockNote editor instance
	// biome-ignore lint/correctness/noUnusedVariables: removing table from defaultSpecs
	const { table, ...defaultSpecs } = defaultBlockSpecs;
	const editor = customEditor({
		schema: withMultiColumn(
			BlockNoteSchema.create({
				blockSpecs: {
					...defaultSpecs,
					flow: FlowBlock,
					flowHistory: FlowHistoryBlock,
					flowStatus: FlowStatusBlock,
					heatmap: HeatmapBlock,
					metric: MetricBlock,
					metricHistory: MetricHistoryBlock,
					metricRatio: MetricRatioBlock,
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

	editor.onMount(() => {
		setMounted(true);
	});

	useEffect(() => {
		setInitialized(false);

		if (!mounted) return;

		// biome-ignore lint/suspicious/noExplicitAny: json payload
		editor.replaceBlocks(editor.document, (notebook.blocks || []) as any);
		setInitialized(true);
	}, [notebook.id, editor, mounted]);

	// Fetch comments when start or end dates change
	useEffect(() => {
		if (startDate === null || endDate === null) return;
		void fetchComments(notebook.id);
	}, [startDate, endDate, notebook.id, fetchComments]);

	// Save editor content changes (debounced in store)
	useEditorChange((editor) => {
		if (!initialized) return;

		const flowBlocksFilters: { names: string[]; filters: Filter[] }[] = [];
		const metricBlocksFilters: { names: string[]; filters: Filter[] }[] = [];

		editor.document.forEach((block) => {
			if (block.type === "flow") {
				flowBlocksFilters.push({
					names: [],
					filters: JSON.parse(block.props.blockFilters as string),
				});
			} else if (
				block.type === "flowHistory" ||
				block.type === "flowStatus" ||
				block.type === "heatmap"
			) {
				flowBlocksFilters.push({
					names: [block.props.flowName],
					filters: JSON.parse(block.props.blockFilters as string),
				});
			} else if (block.type === "metric" || block.type === "metricHistory") {
				metricBlocksFilters.push({
					names: [block.props.metricName],
					filters: JSON.parse(block.props.blockFilters as string),
				});
			} else if (block.type === "metricRatio") {
				metricBlocksFilters.push({
					names: [block.props.metricAName],
					filters: JSON.parse(block.props.filtersA as string),
				});
				metricBlocksFilters.push({
					names: [block.props.metricBName],
					filters: JSON.parse(block.props.filtersB as string),
				});
			}
		});

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		updateNotebook(tenantName, notebook, {
			blocks: editor.document as Block[],
			flowBlocksFilters,
			metricBlocksFilters,
		});
	}, editor);

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

	return (
		<div className="flex-1 flex flex-col h-screen">
			{/* Notebook Content */}
			<div className="flex-1 overflow-y-auto">
				<div className="mx-auto py-12">
					{/* Title */}
					<div className="mx-32">
						{editable ? (
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
						) : (
							<h1 className="w-full text-5xl font-bold mb-4">
								{notebook.title}
							</h1>
						)}

						{/* Description */}
						{editable ? (
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
						) : (
							<p className="w-full text-lg text-secondary-foreground mb-8">
								{notebook.description}
							</p>
						)}
					</div>

					{/* BlockNote Editor */}
					<div className="mx-19 mb-32">
						<BlockNoteView
							editor={editor}
							// key={notebook.id}
							theme="light"
							slashMenu={false}
							sideMenu={false}
							editable={editable}
							// tableHandles={false}
						>
							<SuggestionMenuController
								triggerCharacter="/"
								suggestionMenuComponent={SuggestionMenu}
								getItems={async (query: string) => {
									// Simple filter matching title/aliases like defaults
									const all = getSlashMenuItems(editor, [
										{
											title: "Flows Table",
											onItemClick: () => {
												insertOrUpdateBlock(editor, {
													type: "flow",
												});
											},
											group: "Flows",
											subtext:
												"List of all flows with information about their last run",
											icon: <Table2 className="size-4.5" />,
											aliases: [],
										},
										{
											title: "Flow History",
											onItemClick: () => {
												const block = insertOrUpdateBlock(editor, {
													type: "flowHistory",
												});
												openBlockSettings(block.id);
											},
											group: "Flows",
											subtext: "List of all executions for a given flow",
											icon: <History className="size-4.5" />,
											aliases: [],
										},
										{
											title: "Flow Card",
											onItemClick: () => {
												const block = insertOrUpdateBlock(editor, {
													type: "flowStatus",
												});
												openBlockSettings(block.id);
											},
											group: "Flows",
											subtext:
												"Card showing key information about a specific flow",
											icon: <RectangleEllipsis className="size-4.5" />,
											aliases: ["run counts", "flow run count"],
										},
										{
											title: "Heatmap",
											onItemClick: () => {
												const block = insertOrUpdateBlock(editor, {
													type: "heatmap",
												});
												openBlockSettings(block.id);
											},
											group: "Flows",
											subtext: "Heatmap showing daily status for a given flow",
											icon: <LayoutGrid className="size-4.5" />,
											aliases: ["flow heatmap"],
										},
										{
											title: "Number",
											onItemClick: () => {
												const block = insertOrUpdateBlock(editor, {
													type: "metric",
												});
												openBlockSettings(block.id);
											},
											group: "Metrics",
											subtext:
												"Display a metric value aggregated across time window. For example, the total number of signups.",
											icon: <SquareDot className="size-4.5" />,
											aliases: ["metric"],
										},
										{
											title: "Chart",
											onItemClick: () => {
												const block = insertOrUpdateBlock(editor, {
													type: "metricHistory",
												});
												openBlockSettings(block.id);
											},
											group: "Metrics",
											subtext:
												"Chart showing metric history over time. For example, the number of signups over time.",
											icon: <ChartLine className="size-4.5" />,
											aliases: ["metric history"],
										},
										{
											title: "Metric Ratio",
											onItemClick: () => {
												const block = insertOrUpdateBlock(editor, {
													type: "metricRatio",
												});
												openBlockSettings(block.id);
											},
											group: "Metrics",
											subtext:
												"Display ratio between two metrics. For example, the ratio of US signups to global signups.",
											icon: <SquareDivide className="size-4.5" />,
											aliases: ["metric ratio", "percentage"],
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
			</div>
		</div>
	);
}
