import type {
	BlockSchema,
	DefaultBlockSchema,
	DefaultInlineContentSchema,
	DefaultStyleSchema,
	InlineContentSchema,
	StyleSchema,
} from "@blocknote/core";
import {
	type SideMenuProps,
	useBlockNoteEditor,
	useComponentsContext,
	useDictionary,
} from "@blocknote/react";
import { Plus } from "lucide-react";

import { useCallback } from "react";

export const AddBlockButton = <
	BSchema extends BlockSchema = DefaultBlockSchema,
	I extends InlineContentSchema = DefaultInlineContentSchema,
	S extends StyleSchema = DefaultStyleSchema,
>(
	props: Pick<SideMenuProps<BSchema, I, S>, "block">,
) => {
	const Components = useComponentsContext()!;
	const dict = useDictionary();

	const editor = useBlockNoteEditor<BSchema, I, S>();

	const onClick = useCallback(() => {
		const blockContent = props.block.content;
		const isBlockEmpty =
			blockContent !== undefined &&
			Array.isArray(blockContent) &&
			blockContent.length === 0;

		if (isBlockEmpty) {
			editor.setTextCursorPosition(props.block);
			editor.openSuggestionMenu("/");
		} else {
			const insertedBlock = editor.insertBlocks(
				[{ type: "paragraph" }],
				props.block,
				"after",
			)[0];
			editor.setTextCursorPosition(insertedBlock);
			editor.openSuggestionMenu("/");
		}
	}, [editor, props.block]);

	return (
		<Components.SideMenu.Button
			className={"bn-button cursor-pointer"}
			label={dict.side_menu.add_block_label}
			icon={
				<Plus
					className="size-5 text-secondary-foreground"
					onClick={onClick}
					data-test="dragHandleAdd"
				/>
			}
		/>
	);
};
