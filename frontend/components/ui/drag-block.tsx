import type {
	BlockSchema,
	DefaultBlockSchema,
	DefaultInlineContentSchema,
	DefaultStyleSchema,
	InlineContentSchema,
	StyleSchema,
} from "@blocknote/core";
import {
	DragHandleMenu,
	type SideMenuProps,
	useComponentsContext,
	useDictionary,
} from "@blocknote/react";
import { GripVertical } from "lucide-react";

export const DragHandleButton = <
	BSchema extends BlockSchema = DefaultBlockSchema,
	I extends InlineContentSchema = DefaultInlineContentSchema,
	S extends StyleSchema = DefaultStyleSchema,
>(
	props: Omit<SideMenuProps<BSchema, I, S>, "addBlock"> & {
		/**
		 * The menu items to render.
		 */
		children?: React.ReactNode;
	},
) => {
	const Components = useComponentsContext()!;
	const dict = useDictionary();

	const Component = props.dragHandleMenu || DragHandleMenu;

	return (
		<Components.Generic.Menu.Root
			onOpenChange={(open: boolean) => {
				if (open) {
					props.freezeMenu();
				} else {
					props.unfreezeMenu();
				}
			}}
			position={"left"}
		>
			<Components.Generic.Menu.Trigger>
				<Components.SideMenu.Button
					label={dict.side_menu.drag_handle_label}
					draggable={true}
					onDragStart={(e) => props.blockDragStart(e, props.block)}
					onDragEnd={props.blockDragEnd}
					className={"bn-button cursor-grab"}
					icon={
						<GripVertical
							className="size-5 text-secondary-foreground"
							data-test="dragHandle"
						/>
					}
				/>
			</Components.Generic.Menu.Trigger>
			<Component block={props.block}>{props.children}</Component>
		</Components.Generic.Menu.Root>
	);
};
