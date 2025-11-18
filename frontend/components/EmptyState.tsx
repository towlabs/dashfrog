import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
	icon: LucideIcon;
	title: string;
	description: string;
	action?: ReactNode;
	onClick?: () => void;
	className?: string;
};

export function EmptyState({
	icon: Icon,
	title,
	description,
	action,
	onClick,
	className,
}: EmptyStateProps) {
	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center py-12 px-4",
				className,
			)}
			onClick={onClick}
		>
			<div className="rounded-full bg-muted p-4 mb-4">
				<Icon className="h-8 w-8 text-muted-foreground" />
			</div>
			<div className="text-center space-y-2 max-w-md">
				<h3 className="font-semibold text-lg">{title}</h3>
				<p className="text-sm text-muted-foreground">{description}</p>
				{action && <div className="pt-4">{action}</div>}
			</div>
		</div>
	);
}
