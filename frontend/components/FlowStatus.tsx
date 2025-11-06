import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FlowStatus as FlowStatusType } from "@/src/types/flow";

interface FlowStatusProps {
	status: FlowStatusType;
	className?: string;
}

const statusConfig = {
	success: {
		label: "Success",
		dotColor: "bg-[#5cb660]",
		badgeClass: "border-0 bg-[#dbe6dd] text-green-700",
	},
	failure: {
		label: "Failed",
		dotColor: "bg-[#e56458]",
		badgeClass: "border-0 bg-[#f9dcd9] text-red-700",
	},
	running: {
		label: "Running",
		dotColor: "bg-[#2883df]",
		badgeClass: "border-0 bg-[#d2e4f8] text-blue-700",
	},
} as const;

export function FlowStatus({ status, className }: FlowStatusProps) {
	const config = statusConfig[status];

	return (
		<Badge variant="outline" className={cn(config.badgeClass, className)}>
			<span className={cn("mr-1.5 h-2 w-2 rounded-full", config.dotColor)} />
			{config.label}
		</Badge>
	);
}
