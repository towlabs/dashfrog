/** biome-ignore-all lint/suspicious/noExplicitAny: code from blocknote */
import {
	BlockNoteEditor,
	type BlockNoteEditorOptions,
	type BlockSchema,
	type CustomBlockNoteSchema,
	combineByGroup,
	type DefaultBlockSchema,
	type DefaultInlineContentSchema,
	type DefaultStyleSchema,
	getDefaultSlashMenuItems,
	type InlineContentSchema,
	insertOrUpdateBlock,
	type SideMenuProsemirrorPlugin,
	SideMenuView,
	type StyleSchema,
	sideMenuPluginKey,
} from "@blocknote/core";
import type { DefaultReactSuggestionItem } from "@blocknote/react";
import {
	checkMultiColumnBlocksInSchema,
	getMultiColumnDictionary,
} from "@blocknote/xl-multi-column";
import {
	AudioLines,
	Code,
	Columns2,
	Columns3,
	File,
	Heading1,
	Heading2,
	Heading3,
	Heading4,
	Heading5,
	Heading6,
	Image,
	List,
	ListChecks,
	ListCollapse,
	ListOrdered,
	Minus,
	Pilcrow,
	Quote,
	Smile,
	SquarePlay,
	Table,
} from "lucide-react";
import { Plugin } from "prosemirror-state";
import { useMemo } from "react";

export const customEditor = <
	Options extends Partial<BlockNoteEditorOptions<any, any, any>> | undefined,
>(
	options: Options = {} as Options,
): Options extends {
	schema: CustomBlockNoteSchema<infer BSchema, infer ISchema, infer SSchema>;
}
	? BlockNoteEditor<BSchema, ISchema, SSchema>
	: BlockNoteEditor<
			DefaultBlockSchema,
			DefaultInlineContentSchema,
			DefaultStyleSchema
		> => {
	// biome-ignore lint/correctness/useExhaustiveDependencies: do not recreate
	return useMemo(() => {
		const editor = BlockNoteEditor.create(options) as any;
		if (window) {
			// for testing / dev purposes
			(window as any).ProseMirror = editor._tiptapEditor;
		}

		const plugin = editor.extensions.sideMenu as SideMenuProsemirrorPlugin<
			any,
			any,
			any
		>;
		plugin.plugins[0] = new Plugin({
			key: sideMenuPluginKey,
			view: (editorView) => {
				plugin.view = new SideMenuView(editor, editorView, (state) => {
					plugin.emit("update", state);
				});

				const findClosestEditorElement = (coords: {
					clientX: number;
					clientY: number;
				}) => {
					// if a dialog is open, we need to find the closest editor to the dialog
					let editors = plugin.view!.pmView.root.querySelectorAll(
						"div[role=dialog] .bn-editor",
					);
					if (editors.length === 0) {
						// Get all editor elements in the document
						editors = Array.from(
							plugin.view!.pmView.root.querySelectorAll(".bn-editor"),
						);
					}

					if (editors.length === 0) {
						return null;
					}

					// Find the editor with the smallest distance to the coordinates
					let closestEditor = editors[0];
					let minDistance = Number.MAX_VALUE;

					editors.forEach((editor) => {
						const rect = editor
							.querySelector(".bn-block-group")!
							.getBoundingClientRect();

						const distanceX =
							coords.clientX < rect.left
								? rect.left - coords.clientX
								: coords.clientX > rect.right
									? coords.clientX - rect.right
									: 0;

						const distanceY =
							coords.clientY < rect.top
								? rect.top - coords.clientY
								: coords.clientY > rect.bottom
									? coords.clientY - rect.bottom
									: 0;

						const distance = Math.sqrt(distanceX ** 2 + distanceY ** 2);

						if (distance < minDistance) {
							minDistance = distance;
							closestEditor = editor;
						}
					});

					return {
						element: closestEditor,
						distance: minDistance,
					};
				};

				plugin.view.findClosestEditorElement = findClosestEditorElement;

				return plugin.view;
			},
		});
		return editor;
	}, []);
};

const icons = {
	heading: Heading1,
	heading_2: Heading2,
	heading_3: Heading3,
	heading_4: Heading4,
	heading_5: Heading5,
	heading_6: Heading6,
	toggle_heading: Heading1,
	toggle_heading_2: Heading2,
	toggle_heading_3: Heading3,
	quote: Quote,
	toggle_list: ListCollapse,
	numbered_list: ListOrdered,
	bullet_list: List,
	check_list: ListChecks,
	paragraph: Pilcrow,
	table: Table,
	image: Image,
	video: SquarePlay,
	audio: AudioLines,
	file: File,
	emoji: Smile,
	code_block: Code,
	divider: Minus,
	columns_2: Columns2,
	columns_3: Columns3,
};

export function getMultiColumnSlashMenuItems<
	BSchema extends BlockSchema,
	I extends InlineContentSchema,
	S extends StyleSchema,
>(editor: BlockNoteEditor<BSchema, I, S>) {
	const items: Omit<DefaultReactSuggestionItem, "key">[] = [];

	if (checkMultiColumnBlocksInSchema(editor)) {
		items.push(
			{
				...getMultiColumnDictionary(editor).slash_menu.two_columns,
				icon: <Columns2 className="size-4.5" />,
				onItemClick: () => {
					insertOrUpdateBlock(editor, {
						type: "columnList",
						children: [
							{
								type: "column",
								children: [
									{
										type: "paragraph" as any,
									},
								],
							},
							{
								type: "column",
								children: [
									{
										type: "paragraph" as any,
									},
								],
							},
						],
					});
				},
			},
			{
				...getMultiColumnDictionary(editor).slash_menu.three_columns,
				icon: <Columns3 className="size-4.5" />,
				onItemClick: () => {
					insertOrUpdateBlock(editor, {
						type: "columnList",
						children: [
							{
								type: "column",
								children: [
									{
										type: "paragraph" as any,
									},
								],
							},
							{
								type: "column",
								children: [
									{
										type: "paragraph" as any,
									},
								],
							},
							{
								type: "column",
								children: [
									{
										type: "paragraph" as any,
									},
								],
							},
						],
					});
				},
			},
		);
	}

	return items;
}

export function getSlashMenuItems<
	BSchema extends BlockSchema,
	I extends InlineContentSchema,
	S extends StyleSchema,
>(
	editor: BlockNoteEditor<BSchema, I, S>,
	additionalItems: DefaultReactSuggestionItem[] = [],
): DefaultReactSuggestionItem[] {
	const defaultItems = getDefaultSlashMenuItems(editor).map((item) => {
		const Icon = icons[item.key];
		return {
			...item,
			icon: <Icon className="size-4.5" />,
		};
	});
	const multiColumnItems = getMultiColumnSlashMenuItems(editor);
	return [
		...combineByGroup(defaultItems, multiColumnItems),
		...additionalItems,
	];
}
