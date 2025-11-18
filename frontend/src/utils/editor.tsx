import {
	BlockNoteEditor,
	type BlockNoteEditorOptions,
	type CustomBlockNoteSchema,
	type DefaultBlockSchema,
	type DefaultInlineContentSchema,
	type DefaultStyleSchema,
	type SideMenuProsemirrorPlugin,
	SideMenuView,
	sideMenuPluginKey,
} from "@blocknote/core";
import {
	DragHandleMenu,
	type DragHandleMenuProps,
	RemoveBlockItem,
	SideMenu,
	type SideMenuProps,
} from "@blocknote/react";
import { Plugin } from "prosemirror-state";
import { useMemo } from "react";
import { AddBlockButton } from "@/components/ui/add-block";
import { DragHandleButton } from "@/components/ui/drag-block";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useNotebooksStore } from "../stores/notebooks";

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
