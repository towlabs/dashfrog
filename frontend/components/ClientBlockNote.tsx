import "@blocknote/core/fonts/inter.css";
import { useCreateBlockNote, useEditorChange } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import {
	type Block,
	type BlockNoteEditor,
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
import { BarChart3, GitBranch, Hash, TrendingUp, Workflow } from "lucide-react";
import { useEffect, useRef } from "react";
import { createBarChartBlock } from "@/components/blocks/BarChartBlock";
import { BarChartSettingsItem } from "@/components/blocks/BarChartSettingsItem";
import { createChartBlock } from "@/components/blocks/ChartBlock";
import { ChartSettingsItem } from "@/components/blocks/ChartSettingsItem";
import { createNumberBlock } from "@/components/blocks/NumberBlock";
import { NumberSettingsItem } from "@/components/blocks/NumberSettingsItem";
import { createWorkflowBlock } from "@/components/blocks/WorkflowBlock";
import { WorkflowSettingsItem } from "@/components/blocks/WorkflowSettingsItem";
import { createWorkflowStatusMapBlock } from "@/components/blocks/WorkflowStatusMapBlock";
import { WorkflowStatusMapSettingsItem } from "@/components/blocks/WorkflowStatusMapSettingsItem";
import {
	type TimeWindow,
	TimeWindowProvider,
} from "@/components/TimeWindowContext";
import { blockNoteStorage } from "@/src/services/api/blocknote";

interface ClientBlockNoteProps {
	timeWindow: TimeWindow;
	blockNoteId: string;
	readonly?: boolean;
	onEditorReady?: (editor: BlockNoteEditor) => void;
	/**
	 * Optional callback for block changes
	 * When provided, blocks will be persisted via this callback instead of localStorage
	 * Used for notebooks with backend persistence
	 */
	onBlocksChange?: (blocks: Block[]) => void;
	/**
	 * Initial blocks to load (for notebooks from backend)
	 * If not provided, will try to load from localStorage
	 */
	initialBlocks?: Block[];
}

export default function ClientBlockNote({
	timeWindow,
	blockNoteId,
	readonly = false,
	onEditorReady,
	onBlocksChange,
	initialBlocks,
}: ClientBlockNoteProps) {
	const loadedContentRef = useRef(false);
	const useBackendPersistence = !!onBlocksChange;

	const editor = useCreateBlockNote({
		schema: withMultiColumn(
			BlockNoteSchema.create({
				blockSpecs: {
					...defaultBlockSpecs,
					chart: createChartBlock(),
					number: createNumberBlock(),
					barChart: createBarChartBlock(),
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

	// Notify parent when editor is ready
	useEffect(() => {
		if (editor && onEditorReady) {
			// @ts-expect-error - TODO: typing error in blocknote
			onEditorReady(editor);
		}
	}, [editor, onEditorReady]);

	// Load content from storage or initialBlocks after editor is created
	useEffect(() => {
		if (!editor) return;

		// Reset loaded flag when blockNoteId changes
		loadedContentRef.current = false;

		// Use setTimeout to ensure editor is fully ready
		const timer = setTimeout(() => {
			let contentToLoad: Block[] | null = null;

			// For backend persistence, use initialBlocks if provided
			if (useBackendPersistence && initialBlocks) {
				contentToLoad = initialBlocks;
				console.log(
					"Loading blocks from backend for notebook:",
					blockNoteId,
					initialBlocks,
				);
			} else {
				// For localStorage persistence (events), load from storage
				contentToLoad = blockNoteStorage.load(blockNoteId);
				if (contentToLoad) {
					console.log(
						"Loading saved content from localStorage:",
						blockNoteId,
						contentToLoad,
					);
				}
			}

			if (contentToLoad && contentToLoad.length > 0) {
				// Replace all blocks with saved content
				editor.replaceBlocks(editor.document, contentToLoad);
			} else {
				console.log("No saved content, using empty document");
				// Clear to a single empty paragraph if no saved content
				editor.replaceBlocks(editor.document, [{ type: "paragraph" }]);
			}
			loadedContentRef.current = true;
		}, 0);

		return () => {
			clearTimeout(timer);
		};
	}, [editor, blockNoteId, initialBlocks, useBackendPersistence]);

	// Save changes whenever editor content changes (but not during initial load)
	useEditorChange(() => {
		if (editor && loadedContentRef.current) {
			if (useBackendPersistence && onBlocksChange) {
				// For notebooks: use backend persistence via callback
				onBlocksChange(editor.document);
			} else {
				// For events: use localStorage persistence
				blockNoteStorage.save(blockNoteId, editor.document);
			}
		}
	}, editor);

	return (
		<TimeWindowProvider timeWindow={timeWindow}>
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
							group: "Charts",
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
							group: "Charts",
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
							group: "Charts",
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
		</TimeWindowProvider>
	);
}
