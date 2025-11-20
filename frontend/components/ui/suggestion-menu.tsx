import { assertEmpty } from "@blocknote/core";
import {
	type DefaultReactSuggestionItem,
	elementOverflow,
	mergeRefs,
	type SuggestionMenuProps,
	useComponentsContext,
	useDictionary,
} from "@blocknote/react";
import {
	type ComponentProps,
	forwardRef,
	type JSX,
	useEffect,
	useMemo,
	useRef,
} from "react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const SuggestionMenuItem = forwardRef<
	HTMLDivElement,
	ComponentProps["SuggestionMenu"]["Item"]
>((props, ref) => {
	const { className, item, isSelected, onClick, id, ...rest } = props;

	assertEmpty(rest);

	const itemRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!itemRef.current || !isSelected) {
			return;
		}

		const overflow = elementOverflow(
			itemRef.current,
			document.querySelector(".bn-suggestion-menu, #ai-suggestion-menu")!, // TODO
		);
		if (overflow === "top") {
			itemRef.current.scrollIntoView(true);
		} else if (overflow === "bottom") {
			itemRef.current.scrollIntoView(false);
		}
	}, [isSelected]);

	const content = (
		// biome-ignore lint/a11y/useFocusableInteractive: ignore
		<div
			// Styles from ShadCN DropdownMenuItem component
			className={cn(
				"focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*=text-])]:text-muted-foreground outline-hidden relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm data-[disabled]:pointer-events-none data-[inset]:pl-8 data-[disabled]:opacity-50 [&_svg:not([class*=size-])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				"hover:bg-accent hover:text-accent-foreground data-[variant=destructive]:hover:bg-destructive/10 dark:data-[variant=destructive]:hover:bg-destructive/20 data-[variant=destructive]:hover:text-destructive",
				"aria-selected:bg-accent aria-selected:text-accent-foreground data-[variant=destructive]:aria-selected:bg-destructive/10 dark:data-[variant=destructive]:aria-selected:bg-destructive/20 data-[variant=destructive]:aria-selected:text-destructive",
				"cursor-pointer",
				props.item.size === "small" ? "gap-3 py-1" : "",
				className,
			)}
			data-highlighted
			ref={mergeRefs([ref, itemRef])}
			id={id}
			onMouseDown={(event) => event.preventDefault()}
			onClick={onClick}
			role="option"
			aria-selected={isSelected || undefined}
		>
			{item.icon && (
				<div className={cn("p-1", className)} data-position="left">
					{item.icon}
				</div>
			)}
			<div className="flex-1">
				<div className={cn("font-medium text-sm", className)}>{item.title}</div>
			</div>
			{item.badge && (
				<div
					data-position="right"
					className="text-xs text-secondary-foreground"
				>
					{item.badge}
				</div>
			)}
		</div>
	);

	if (item.subtext) {
		return (
			<TooltipProvider delayDuration={300}>
				<Tooltip>
					<TooltipTrigger asChild>{content}</TooltipTrigger>
					<TooltipContent side="right" sideOffset={8}>
						<p>{item.subtext}</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		);
	}

	return content;
});

export function SuggestionMenu<T extends DefaultReactSuggestionItem>(
	props: SuggestionMenuProps<T>,
) {
	const Components = useComponentsContext()!;
	const dict = useDictionary();

	const { items, loadingState, selectedIndex, onItemClick } = props;

	const loader =
		loadingState === "loading-initial" || loadingState === "loading" ? (
			<Components.SuggestionMenu.Loader
				className={"bn-suggestion-menu-loader"}
			/>
		) : null;

	const renderedItems = useMemo<JSX.Element[]>(() => {
		let currentGroup: string | undefined;
		const renderedItems = [];

		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			if (item.group !== currentGroup) {
				currentGroup = item.group;
				renderedItems.push(
					<Components.SuggestionMenu.Label
						className={
							"bn-suggestion-menu-label text-secondary-foreground text-xs"
						}
						key={currentGroup}
					>
						{currentGroup}
					</Components.SuggestionMenu.Label>,
				);
			}

			renderedItems.push(
				<SuggestionMenuItem
					className={cn(
						"bn-suggestion-menu-item",
						item.size === "small" ? "bn-suggestion-menu-item-small" : "",
					)}
					item={item}
					id={`bn-suggestion-menu-item-${i}`}
					isSelected={i === selectedIndex}
					key={item.title}
					onClick={() => onItemClick?.(item)}
				/>,
			);
		}

		return renderedItems;
	}, [Components, items, onItemClick, selectedIndex]);

	return (
		<Components.SuggestionMenu.Root
			id="bn-suggestion-menu"
			className="bn-suggestion-menu max-h-96 overflow-y-auto"
		>
			{renderedItems}
			{renderedItems.length === 0 &&
				(props.loadingState === "loading" ||
					props.loadingState === "loaded") && (
					<Components.SuggestionMenu.EmptyItem
						className={"bn-suggestion-menu-item"}
					>
						{dict.suggestion_menu.no_items_title}
					</Components.SuggestionMenu.EmptyItem>
				)}
			{loader}
		</Components.SuggestionMenu.Root>
	);
}
