import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote, useEditorChange } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import {
	type Block,
	BlockNoteSchema,
	combineByGroup,
	defaultBlockSpecs,
} from "@blocknote/core";
// @ts-expect-error - TODO: typing error in blocknote
import * as locales from "@blocknote/core/locales";
import {
	BlockColorsItem,
	type DefaultReactSuggestionItem,
	DragHandleMenu,
	type DragHandleMenuProps,
	getDefaultReactSlashMenuItems,
	RemoveBlockItem,
	SideMenu,
	SideMenuController,
	SuggestionMenuController,
} from "@blocknote/react";
import {
	getMultiColumnSlashMenuItems,
	multiColumnDropCursor,
	locales as multiColumnLocales,
	withMultiColumn,
} from "@blocknote/xl-multi-column";
import {
	BarChart3,
	GitBranch,
	Hash,
	Table2,
	TrendingUp,
	Workflow,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { createBarChartBlock } from "@/components/blocks/BarChartBlock";
import { BarChartSettingsItem } from "@/components/blocks/BarChartSettingsItem";
import { createChartBlock } from "@/components/blocks/ChartBlock";
import { ChartSettingsItem } from "@/components/blocks/ChartSettingsItem";
import { createMetricTableBlock } from "@/components/blocks/MetricTableBlock";
import { MetricTableSettingsItem } from "@/components/blocks/MetricTableSettingsItem";
import { createNumberBlock } from "@/components/blocks/NumberBlock";
import { NumberSettingsItem } from "@/components/blocks/NumberSettingsItem";
import { createWorkflowBlock } from "@/components/blocks/WorkflowBlock";
import { WorkflowSettingsItem } from "@/components/blocks/WorkflowSettingsItem";
import { createWorkflowStatusMapBlock } from "@/components/blocks/WorkflowStatusMapBlock";
import { WorkflowStatusMapSettingsItem } from "@/components/blocks/WorkflowStatusMapSettingsItem";
interface ClientBlockNoteProps {
	readonly: boolean;
	onBlocksChange: (blocks: Block[]) => void;
	initialBlocks: Block[];
}

export default function ClientBlockNote({
	readonly,
	onBlocksChange,
	initialBlocks,
}: ClientBlockNoteProps) {
	const editor = useCreateBlockNote({
		schema: withMultiColumn(
			BlockNoteSchema.create({
				blockSpecs: {
					...defaultBlockSpecs,
					chart: createChartBlock(),
					number: createNumberBlock(),
					barChart: createBarChartBlock(),
					metricTable: createMetricTableBlock(),
					workflow: createWorkflowBlock(),
					workflowStatusMap: createWorkflowStatusMapBlock(),
				},
			}),
		),
		dropCursor: multiColumnDropCursor,
		dictionary: {
			...locales.en,
			multi_column: multiColumnLocales.en,
		},
		// Don't set initialContent here - we'll load it after editor is ready
	});

	// Load content from initialBlocks once after editor is created
	const didInitRef = useRef(false);
	useEffect(() => {
		if (!editor || didInitRef.current) return;
		didInitRef.current = true;
		setTimeout(() => {
			editor.replaceBlocks(editor.document, initialBlocks);
		}, 0);
	}, [editor, initialBlocks]);

	// Save changes to API (for events page) or call parent callback (for notebooks)
	useEditorChange((editor, { getChanges }) => {
		if (readonly || getChanges().length === 0) return;
		const blocks = editor.document as Block[];
		onBlocksChange(blocks);
	}, editor);

	return (
		<BlockNoteView
			editor={editor}
			theme="light"
			slashMenu={false}
			sideMenu={readonly}
			editable={!readonly}
		>
				{/* Custom Side Menu with Drag Handle Menu item */}
				<SideMenuController
					sideMenu={(props) => (
						<SideMenu
							{...props}
							dragHandleMenu={(menuProps: DragHandleMenuProps) => {
								const blockType = menuProps.block.type as string;
								if (blockType === "chart") {
									return (
										<DragHandleMenu {...menuProps}>
											<RemoveBlockItem {...menuProps}>Delete</RemoveBlockItem>
											<BlockColorsItem {...menuProps}>Colors</BlockColorsItem>
											<ChartSettingsItem {...menuProps} />
										</DragHandleMenu>
									);
								} else if (blockType === "number") {
									return (
										<DragHandleMenu {...menuProps}>
											<RemoveBlockItem {...menuProps}>Delete</RemoveBlockItem>
											<BlockColorsItem {...menuProps}>Colors</BlockColorsItem>
											<NumberSettingsItem {...menuProps} />
										</DragHandleMenu>
									);
								} else if (blockType === "barChart") {
									return (
										<DragHandleMenu {...menuProps}>
											<RemoveBlockItem {...menuProps}>Delete</RemoveBlockItem>
											<BlockColorsItem {...menuProps}>Colors</BlockColorsItem>
											<BarChartSettingsItem {...menuProps} />
										</DragHandleMenu>
									);
								} else if (blockType === "metricTable") {
									return (
										<DragHandleMenu {...menuProps}>
											<RemoveBlockItem {...menuProps}>Delete</RemoveBlockItem>
											<BlockColorsItem {...menuProps}>Colors</BlockColorsItem>
											<MetricTableSettingsItem {...menuProps} />
										</DragHandleMenu>
									);
								} else if (blockType === "workflow") {
									return (
										<DragHandleMenu {...menuProps}>
											<RemoveBlockItem {...menuProps}>Delete</RemoveBlockItem>
											<BlockColorsItem {...menuProps}>Colors</BlockColorsItem>
											<WorkflowSettingsItem {...menuProps} />
										</DragHandleMenu>
									);
								} else if (blockType === "workflowStatusMap") {
									return (
										<DragHandleMenu {...menuProps}>
											<RemoveBlockItem {...menuProps}>Delete</RemoveBlockItem>
											<BlockColorsItem {...menuProps}>Colors</BlockColorsItem>
											<WorkflowStatusMapSettingsItem {...menuProps} />
										</DragHandleMenu>
									);
								} else {
									return <DragHandleMenu {...menuProps} />;
								}
							}}
						/>
					)}
				/>
				<SuggestionMenuController
					triggerCharacter="/"
					getItems={async (query: string) => {
						const chartItem: DefaultReactSuggestionItem = {
							title: "Line Chart",
							subtext: "Insert a line chart",
							group: "Metrics",
							icon: <TrendingUp className="h-4 w-4" />,
							onItemClick: () => {
								const selection = editor.getSelection();
								const target = selection?.blocks?.[0];
								if (target) {
									editor.replaceBlocks(
										[target],
										[{ type: "chart", props: { open: true } }],
									);
									return;
								}
								// Fallback: use the block at the cursor position (covers empty blocks)
								const cursor = editor.getTextCursorPosition?.() || null;
								const cursorBlock = cursor?.block;
								if (cursorBlock) {
									editor.replaceBlocks(
										[cursorBlock],
										[{ type: "chart", props: { open: true } }],
									);
									return;
								}
								// Last fallback: append after last block
								const last = editor.document[editor.document.length - 1];
								const ref = last ?? editor.document[0];
								if (ref) {
									editor.insertBlocks(
										[{ type: "chart", props: { open: true } }],
										ref,
										"after",
									);
								}
							},
						};

						const numberItem: DefaultReactSuggestionItem = {
							title: "Number",
							subtext: "Insert a metric number display",
							group: "Metrics",
							icon: <Hash className="h-4 w-4" />,
							onItemClick: () => {
								const selection = editor.getSelection();
								const target = selection?.blocks?.[0];
								if (target) {
									editor.replaceBlocks(
										[target],
										[{ type: "number", props: { open: true } }],
									);
									return;
								}
								const cursor = editor.getTextCursorPosition?.() || null;
								const cursorBlock = cursor?.block;
								if (cursorBlock) {
									editor.replaceBlocks(
										[cursorBlock],
										[{ type: "number", props: { open: true } }],
									);
									return;
								}
								const last = editor.document[editor.document.length - 1];
								const ref = last ?? editor.document[0];
								if (ref) {
									editor.insertBlocks(
										[{ type: "number", props: { open: true } }],
										ref,
										"after",
									);
								}
							},
						};

						const barChartItem: DefaultReactSuggestionItem = {
							title: "Bar Chart",
							subtext: "Insert a bar chart",
							group: "Metrics",
							icon: <BarChart3 className="h-4 w-4" />,
							onItemClick: () => {
								const selection = editor.getSelection();
								const target = selection?.blocks?.[0];
								if (target) {
									editor.replaceBlocks(
										[target],
										[{ type: "barChart", props: { open: true } }],
									);
									return;
								}
								const cursor = editor.getTextCursorPosition?.() || null;
								const cursorBlock = cursor?.block;
								if (cursorBlock) {
									editor.replaceBlocks(
										[cursorBlock],
										[{ type: "barChart", props: { open: true } }],
									);
									return;
								}
								const last = editor.document[editor.document.length - 1];
								const ref = last ?? editor.document[0];
								if (ref) {
									editor.insertBlocks(
										[{ type: "barChart", props: { open: true } }],
										ref,
										"after",
									);
								}
							},
						};

						const metricTableItem: DefaultReactSuggestionItem = {
							title: "Metric Table",
							subtext: "Insert a metric table",
							group: "Metrics",
							icon: <Table2 className="h-4 w-4" />,
							onItemClick: () => {
								const selection = editor.getSelection();
								const target = selection?.blocks?.[0];
								if (target) {
									editor.replaceBlocks(
										[target],
										[{ type: "metricTable", props: { open: true } }],
									);
									return;
								}
								const cursor = editor.getTextCursorPosition?.() || null;
								const cursorBlock = cursor?.block;
								if (cursorBlock) {
									editor.replaceBlocks(
										[cursorBlock],
										[{ type: "metricTable", props: { open: true } }],
									);
									return;
								}
								const last = editor.document[editor.document.length - 1];
								const ref = last ?? editor.document[0];
								if (ref) {
									editor.insertBlocks(
										[{ type: "metricTable", props: { open: true } }],
										ref,
										"after",
									);
								}
							},
						};

						const workflowItem: DefaultReactSuggestionItem = {
							title: "Workflow",
							subtext: "Insert a workflow steps table",
							group: "Workflows",
							icon: <Workflow className="h-4 w-4" />,
							onItemClick: () => {
								const selection = editor.getSelection();
								const target = selection?.blocks?.[0];
								if (target) {
									editor.replaceBlocks(
										[target],
										[{ type: "workflow", props: { open: true } }],
									);
									return;
								}
								const cursor = editor.getTextCursorPosition?.() || null;
								const cursorBlock = cursor?.block;
								if (cursorBlock) {
									editor.replaceBlocks(
										[cursorBlock],
										[{ type: "workflow", props: { open: true } }],
									);
									return;
								}
								const last = editor.document[editor.document.length - 1];
								const ref = last ?? editor.document[0];
								if (ref) {
									editor.insertBlocks(
										[{ type: "workflow", props: { open: true } }],
										ref,
										"after",
									);
								}
							},
						};

						const workflowStatusMapItem: DefaultReactSuggestionItem = {
							title: "Workflow Status Map",
							subtext: "Insert a workflow status map",
							group: "Workflows",
							icon: <GitBranch className="h-4 w-4" />,
							onItemClick: () => {
								const selection = editor.getSelection();
								const target = selection?.blocks?.[0];
								if (target) {
									editor.replaceBlocks(
										[target],
										[
											{
												type: "workflowStatusMap",
												props: { open: true },
											},
										],
									);
									return;
								}
								const cursor = editor.getTextCursorPosition?.() || null;
								const cursorBlock = cursor?.block;
								if (cursorBlock) {
									editor.replaceBlocks(
										[cursorBlock],
										[
											{
												type: "workflowStatusMap",
												props: { open: true },
											},
										],
									);
									return;
								}
								const last = editor.document[editor.document.length - 1];
								const ref = last ?? editor.document[0];
								if (ref) {
									editor.insertBlocks(
										[
											{
												type: "workflowStatusMap",
												props: { open: true },
											},
										],
										ref,
										"after",
									);
								}
							},
						};

						// Simple filter matching title/aliases like defaults
						const all = [
							chartItem,
							numberItem,
							barChartItem,
							metricTableItem,
							workflowItem,
							workflowStatusMapItem,
							...combineByGroup(
								getDefaultReactSlashMenuItems(editor),
								getMultiColumnSlashMenuItems(editor),
							),
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
			</BlockNoteView>
	);
}
