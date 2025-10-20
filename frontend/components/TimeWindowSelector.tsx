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
import type { RelativeTimeValue, TimeWindowConfig } from "@/lib/notebook-types";
import { cn } from "@/lib/utils";

export type TimeWindow = {
	start: Date;
	end: Date;
	label?: string;
};

interface TimeWindowSelectorProps {
	value?: TimeWindow;
	config?: TimeWindowConfig;
	onChange?: (timeWindow: TimeWindow, config: TimeWindowConfig) => void;
	className?: string;
}

const QUICK_RANGES: Array<{
	label: string;
	value: RelativeTimeValue;
	getValue: () => { start: Date; end: Date };
}> = [
	{
		label: "Last 15 minutes",
		value: "15m",
		getValue: () => ({ start: subMinutes(new Date(), 15), end: new Date() }),
	},
	{
		label: "Last hour",
		value: "1h",
		getValue: () => ({ start: subHours(new Date(), 1), end: new Date() }),
	},
	{
		label: "Last 6 hours",
		value: "6h",
		getValue: () => ({ start: subHours(new Date(), 6), end: new Date() }),
	},
	{
		label: "Last 12 hours",
		value: "12h",
		getValue: () => ({ start: subHours(new Date(), 12), end: new Date() }),
	},
	{
		label: "Last 24 hours",
		value: "24h",
		getValue: () => ({ start: subHours(new Date(), 24), end: new Date() }),
	},
	{
		label: "Last 7 days",
		value: "7d",
		getValue: () => ({ start: subDays(new Date(), 7), end: new Date() }),
	},
	{
		label: "Last 30 days",
		value: "30d",
		getValue: () => ({ start: subDays(new Date(), 30), end: new Date() }),
	},
	{
		label: "This week",
		value: "w",
		getValue: () => ({
			start: startOfWeek(new Date(), { weekStartsOn: 0 }),
			end: endOfWeek(new Date(), { weekStartsOn: 0 }),
		}),
	},
];

export function TimeWindowSelector({
	value,
	config,
	onChange,
	className,
}: TimeWindowSelectorProps) {
	const [open, setOpen] = React.useState(false);
	const [customStart, setCustomStart] = React.useState<Date | undefined>(
		value?.start,
	);
	const [customEnd, setCustomEnd] = React.useState<Date | undefined>(
		value?.end,
	);
	const [customStartTime, setCustomStartTime] = React.useState(
		value?.start ? format(value.start, "HH:mm") : "00:00",
	);
	const [customEndTime, setCustomEndTime] = React.useState(
		value?.end ? format(value.end, "HH:mm") : "23:59",
	);
	const [showCustom, setShowCustom] = React.useState(false);

	const currentWindow = value || {
		start: subHours(new Date(), 24),
		end: new Date(),
	};

	const getDisplayLabel = () => {
		if (value?.label) return value.label;

		// If we have config, use it to determine the label
		if (config?.type === "relative") {
			const range = QUICK_RANGES.find((r) => r.value === config.metadata.value);
			if (range) return range.label;
		}

		// Check if matches a quick range (for backwards compatibility)
		for (const range of QUICK_RANGES) {
			const rangeValue = range.getValue();
			const diff = Math.abs(
				rangeValue.start.getTime() - currentWindow.start.getTime(),
			);
			if (diff < 60000) {
				// Within 1 minute
				return range.label;
			}
		}

		// Custom range
		return `${format(currentWindow.start, "MMM d, HH:mm")} - ${format(currentWindow.end, "MMM d, HH:mm")}`;
	};

	const handleQuickRange = (range: (typeof QUICK_RANGES)[0]) => {
		const { start, end } = range.getValue();
		// Prepopulate custom inputs so switching to custom shows coherent defaults
		setCustomStart(start);
		setCustomEnd(end);
		setCustomStartTime(format(start, "HH:mm"));
		setCustomEndTime(format(end, "HH:mm"));

		const timeWindowConfig: TimeWindowConfig = {
			type: "relative",
			metadata: { value: range.value },
		};
		onChange?.({ start, end, label: range.label }, timeWindowConfig);
		setOpen(false);
	};

	const handleCustomApply = () => {
		if (!customStart || !customEnd) return;

		const [startHours, startMinutes] = customStartTime.split(":").map(Number);
		const [endHours, endMinutes] = customEndTime.split(":").map(Number);

		const start = new Date(customStart);
		start.setHours(startHours, startMinutes, 0, 0);

		const end = new Date(customEnd);
		end.setHours(endHours, endMinutes, 59, 999);

		// validation: end must be after start
		if (!(end.getTime() > start.getTime())) {
			return;
		}

		const timeWindowConfig: TimeWindowConfig = {
			type: "absolute",
			metadata: { start, end },
		};
		onChange?.({ start, end }, timeWindowConfig);
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
									onClick={() => handleQuickRange(range)}
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
								const win = value || currentWindow;
								setCustomStart(win.start);
								setCustomEnd(win.end);
								setCustomStartTime(format(win.start, "HH:mm"));
								setCustomEndTime(format(win.end, "HH:mm"));
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
									if (!customStart || !customEnd) return true;
									const [sh, sm] = customStartTime.split(":").map(Number);
									const [eh, em] = customEndTime.split(":").map(Number);
									const s = new Date(customStart);
									s.setHours(sh, sm, 0, 0);
									const e = new Date(customEnd);
									e.setHours(eh, em, 59, 999);
									return !(e.getTime() > s.getTime());
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
