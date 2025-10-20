"use client";

import {
	type DragHandleMenuProps,
	useBlockNoteEditor,
	useComponentsContext,
} from "@blocknote/react";

export function WorkflowSettingsItem(props: DragHandleMenuProps) {
	const Components = useComponentsContext()!;
	const editor = useBlockNoteEditor();

	if ((props.block as any).type !== "workflow") return null;

	return (
		<Components.Generic.Menu.Item
			onClick={() =>
				editor.updateBlock(
					props.block as any,
					{
						props: { ...((props.block as any).props || {}), open: true },
					} as any,
				)
			}
		>
			<div className="flex items-center gap-2">
				<span>Settings</span>
			</div>
		</Components.Generic.Menu.Item>
	);
}
