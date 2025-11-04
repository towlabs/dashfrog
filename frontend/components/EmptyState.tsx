import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
	icon: LucideIcon;
	title: string;
	description: string;
	action?: ReactNode;
};

export function EmptyState({
	icon: Icon,
	title,
	description,
	action,
}: EmptyStateProps) {
	return (
		<div className="flex flex-col items-center justify-center py-12 px-4">
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
