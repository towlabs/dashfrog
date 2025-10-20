import {
	type DragHandleMenuProps,
	useBlockNoteEditor,
	useComponentsContext,
} from "@blocknote/react";

export function WorkflowSettingsItem(props: DragHandleMenuProps) {
	const Components = useComponentsContext()!;
	const editor = useBlockNoteEditor();

	if ((props.block.type as string) !== "workflow") return null;

	return (
		<Components.Generic.Menu.Item
			onClick={() =>
				editor.updateBlock(props.block, {
					props: { ...(props.block.props || {}), open: true },
				})
			}
		>
			<div className="flex items-center gap-2">
				<span>Settings</span>
			</div>
		</Components.Generic.Menu.Item>
	);
}
