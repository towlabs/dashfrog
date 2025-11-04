import {
	endOfWeek,
	format,
	startOfWeek,
	subDays,
	subHours,
	subMinutes,
} from "date-fns";
import { CalendarIcon, ChevronLeft } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
	RelativeTimeValue,
	resolveTimeWindow,
	TimeWindow,
} from "@/src/types/timewindow";

interface TimeWindowSelectorProps {
	value: TimeWindow;
	onChange: (timeWindow: TimeWindow) => void;
	className?: string;
}

const QUICK_RANGES: Array<{
	label: string;
	value: RelativeTimeValue;
}> = [
	{
		label: "Last 15 minutes",
		value: "15m",
	},
	{
		label: "Last hour",
		value: "1h",
	},
	{
		label: "Last 6 hours",
		value: "6h",
	},
	{
		label: "Last 12 hours",
		value: "12h",
	},
	{
		label: "Last 24 hours",
		value: "24h",
	},
	{
		label: "Last 7 days",
		value: "7d",
	},
	{
		label: "Last 30 days",
		value: "30d",
	},
	{
		label: "This week",
		value: "w",
	},
];

export function TimeWindowSelector({
	value,
	onChange,
	className,
}: TimeWindowSelectorProps) {
	const [open, setOpen] = React.useState(false);
	const [showCustom, setShowCustom] = React.useState(false);
	const [customStart, setCustomStart] = React.useState<Date | undefined>(
		undefined,
	);
	const [customEnd, setCustomEnd] = React.useState<Date | undefined>(undefined);

	const { start, end } = React.useMemo(() => resolveTimeWindow(value), [value]);
	React.useEffect(() => {
		setCustomStart(start);
		setCustomEnd(end);
	}, [start, end]);

	const getDisplayLabel = () => {
		if (value.type === "relative") {
			const range = QUICK_RANGES.find((r) => r.value === value.metadata.value);
			if (range) return range.label;
		}
		return `${format(start, "MMM d, HH:mm")} - ${format(end, "MMM d, HH:mm")}`;
	};

	const handleQuickRange = (value: RelativeTimeValue) => {
		const timeWindow: TimeWindow = {
			type: "relative",
			metadata: { value },
		};
		onChange(timeWindow);
		setOpen(false);
	};

	const handleCustomApply = () => {
		if (!customStart || !customEnd) return;
		const timeWindow: TimeWindow = {
			type: "absolute",
			metadata: { start: customStart, end: customEnd },
		};
		onChange(timeWindow);
		setOpen(false);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className={cn(
						"justify-between text-sm text-muted-foreground",
						className,
					)}
				>
					<CalendarIcon className="mr-2 h-4 w-4" />
					{getDisplayLabel()}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[280px] p-0" align="end">
				{!showCustom ? (
					<div className="p-2">
						<div className="space-y-1">
							{QUICK_RANGES.map((range) => (
								<Button
									key={range.label}
									variant="ghost"
									size="sm"
									className="w-full justify-start"
									onClick={() => handleQuickRange(range.value)}
								>
									{range.label}
								</Button>
							))}
						</div>
						<Separator className="my-2" />
						<Button
							variant="ghost"
							size="sm"
							className="w-full justify-start"
							onClick={() => {
								// Ensure custom fields reflect the currently selected window
								setShowCustom(true);
							}}
						>
							Custom range...
						</Button>
					</div>
				) : (
					<div className="p-3 space-y-4">
						<div className="space-y-3">
							<div className="space-y-2">
								<Label className="text-xs">Start Date & Time</Label>
								<DateTimePicker
									date={customStart}
									setDate={setCustomStart}
									buttonClassName="w-full"
									defaultTime={{ hours: 0, minutes: 0, seconds: 0 }}
								/>
							</div>
							<div className="space-y-2">
								<Label className="text-xs">End Date & Time</Label>
								<DateTimePicker
									date={customEnd}
									setDate={setCustomEnd}
									buttonClassName="w-full"
									defaultTime={{ hours: 23, minutes: 59, seconds: 59 }}
								/>
							</div>
						</div>

						<Separator className="my-2" />
						<div className="flex items-center justify-between">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowCustom(false)}
							>
								<ChevronLeft className="h-3.5 w-3.5" />
								Back
							</Button>
							<Button
								variant="default"
								size="sm"
								onClick={handleCustomApply}
								disabled={(() => {
									return !(end.getTime() > start.getTime());
								})()}
							>
								Apply
							</Button>
						</div>
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
}
