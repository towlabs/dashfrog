/** biome-ignore-all lint/suspicious/noExplicitAny: code from blocknote */
import type {
	BlockSchema,
	DefaultBlockSchema,
	DefaultInlineContentSchema,
	DefaultStyleSchema,
	InlineContentSchema,
	StyleSchema,
} from "@blocknote/core";
import {
	BlockColorsItem,
	type SideMenuProps,
	useBlockNoteEditor,
	useDictionary,
} from "@blocknote/react";
import { GripVertical, Paintbrush, Settings, Trash } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./dropdown-menu";

export const DragHandleButton = <
	BSchema extends BlockSchema = DefaultBlockSchema,
	I extends InlineContentSchema = DefaultInlineContentSchema,
	S extends StyleSchema = DefaultStyleSchema,
>(
	props: Omit<SideMenuProps<BSchema, I, S>, "addBlock"> & {
		openBlockSettings?: (blockId: string) => void;
		/**
		 * The menu items to render.
		 */
		children?: React.ReactNode;
	},
) => {
	const dict = useDictionary();
	const blockType = props.block.type as string;
	const openBlockSettings = props.openBlockSettings ?? (() => {});
	const editor = useBlockNoteEditor<BSchema, I, S>();

	return (
		<DropdownMenu
			modal={false}
			onOpenChange={(open: boolean) => {
				if (open) {
					props.freezeMenu();
				} else {
					props.unfreezeMenu();
				}
			}}
		>
			<DropdownMenuTrigger asChild>
				<Button
					aria-label={dict.side_menu.drag_handle_label}
					draggable={true}
					onDragStart={(e) => props.blockDragStart(e, props.block)}
					onDragEnd={props.blockDragEnd}
					className={
						"bn-button cursor-grab bn-menu-dropdown bn-drag-handle-menu"
					}
					variant="ghost"
					onPointerDown={(e) => {
						if (!(e.nativeEvent as any).fakeEvent) {
							// setting ctrlKey will block the menu from opening
							// as it will block this line: https://github.com/radix-ui/primitives/blob/b32a93318cdfce383c2eec095710d35ffbd33a1c/packages/react/dropdown-menu/src/DropdownMenu.tsx#L120
							e.ctrlKey = true;
						}
					}}
					onPointerUp={(event) => {
						// dispatch a pointerdown event so the Radix pointer down handler gets called that opens the menu
						const e = new PointerEvent("pointerdown", event.nativeEvent);
						(e as any).fakeEvent = true;
						event.target.dispatchEvent(e);
					}}
				>
					<GripVertical
						className="size-5 text-secondary-foreground"
						data-test="dragHandle"
					/>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className={"bn-menu-dropdown bn-drag-handle-menu min-w-64"}
			>
				<DropdownMenuLabel className="text-secondary-foreground text-xs">
					Actions
				</DropdownMenuLabel>
				{openBlockSettings &&
					(blockType === "timeline" ||
						blockType === "flow" ||
						blockType === "flowHistory" ||
						blockType === "flowStatus" ||
						blockType === "heatmap" ||
						blockType === "metric" ||
						blockType === "metricHistory") && (
						<DropdownMenuItem
							className={"bn-menu-item py-1"}
							onClick={() => {
								openBlockSettings(props.block.id);
							}}
						>
							<div
								className={cn(
									"focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*=text-])]:text-muted-foreground outline-hidden relative flex cursor-default select-none items-center gap-2 rounded-sm text-sm data-[disabled]:pointer-events-none data-[inset]:pl-8 data-[disabled]:opacity-50 [&_svg:not([class*=size-])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
									"aria-selected:bg-accent aria-selected:text-accent-foreground data-[variant=destructive]:aria-selected:bg-destructive/10 dark:data-[variant=destructive]:aria-selected:bg-destructive/20 data-[variant=destructive]:aria-selected:text-destructive",
									"cursor-pointer",
								)}
							>
								<div className={"p-1"} data-position="left">
									<Settings className="size-4.5" />
								</div>
								<div className="flex-1">
									<div className={"font-medium text-sm"}>Settings</div>
								</div>
							</div>
						</DropdownMenuItem>
					)}
				<BlockColorsItem {...props}>
					<div
						className={cn(
							"focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*=text-])]:text-muted-foreground outline-hidden relative flex cursor-default select-none items-center gap-2 rounded-sm text-sm data-[disabled]:pointer-events-none data-[inset]:pl-8 data-[disabled]:opacity-50 [&_svg:not([class*=size-])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
							"aria-selected:bg-accent aria-selected:text-accent-foreground data-[variant=destructive]:aria-selected:bg-destructive/10 dark:data-[variant=destructive]:aria-selected:bg-destructive/20 data-[variant=destructive]:aria-selected:text-destructive",
							"cursor-pointer",
						)}
					>
						<div className={"p-1"} data-position="left">
							<Paintbrush className="size-4.5" />
						</div>
						<div className="flex-1">
							<div className={"font-medium text-sm"}>Color</div>
						</div>
					</div>
				</BlockColorsItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					className={"bn-menu-item destructive group"}
					onClick={() => editor.removeBlocks([props.block])}
				>
					<div
						className={cn(
							"focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*=text-])]:text-muted-foreground outline-hidden relative flex cursor-default select-none items-center gap-2 rounded-sm text-sm data-[disabled]:pointer-events-none data-[inset]:pl-8 data-[disabled]:opacity-50 [&_svg:not([class*=size-])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
							"hover:bg-accent",
							"aria-selected:bg-accent aria-selected:text-accent-foreground data-[variant=destructive]:aria-selected:bg-destructive/10 dark:data-[variant=destructive]:aria-selected:bg-destructive/20 data-[variant=destructive]:aria-selected:text-destructive",
							"cursor-pointer",
						)}
					>
						<div
							className={
								"p-1 group-hover:text-red-600 dark:group-hover:text-red-400"
							}
							data-position="left"
						>
							<Trash className="size-4.5 group-hover:text-red-600 dark:group-hover:text-red-400" />
						</div>
						<div className="flex-1">
							<div
								className={
									"font-medium text-sm group-hover:text-red-600 dark:group-hover:text-red-400"
								}
							>
								Delete
							</div>
						</div>
					</div>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
