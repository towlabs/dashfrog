import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, Loader, XCircle } from "lucide-react";
import type { FlowStatus as FlowStatusType } from "@/src/types/flow";

interface FlowStatusProps {
	status: FlowStatusType;
	className?: string;
}

const statusConfig = {
	success: {
		label: "Success",
		Icon: CheckCircle2,
		iconClass: "text-[#5cb660] dark:text-[#5cb660]",
	},
	failure: {
		label: "Failed",
		Icon: XCircle,
		iconClass: "text-[#e56458] dark:text-[#e56458]",
	},
	running: {
		label: "Running",
		Icon: Loader,
		iconClass: "text-[#2883df] dark:text-[#2883df]",
	},
} as const;

export function FlowStatus({ status, className }: FlowStatusProps) {
	const config = statusConfig[status];

	return (
		<Badge
			variant="outline"
			className={cn("text-muted-foreground px-1.5 gap-1.5", className)}
		>
			<config.Icon className={cn("h-4 w-4", config.iconClass)} />
			{config.label}
		</Badge>
	);
}
