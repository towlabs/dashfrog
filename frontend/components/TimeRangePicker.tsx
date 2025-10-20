import { format, subMinutes } from "date-fns";
import { Clock } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

interface TimeRange {
	from: Date;
	to: Date;
}

interface TimeRangePickerProps {
	value: TimeRange;
	onChange: (range: TimeRange) => void;
}

const quickRanges = [
	{ label: "Last 15 minutes", minutes: 15 },
	{ label: "Last 30 minutes", minutes: 30 },
	{ label: "Last 1 hour", minutes: 60 },
	{ label: "Last 6 hours", minutes: 360 },
	{ label: "Last 24 hours", minutes: 1440 },
	{ label: "Last 7 days", minutes: 10080 },
];

export function TimeRangePicker({ value, onChange }: TimeRangePickerProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [selectedRange, setSelectedRange] = useState("10080");

	const handleQuickRange = (minutes: number) => {
		const now = new Date();
		const from = subMinutes(now, minutes);
		onChange({ from, to: now });
		setSelectedRange(minutes.toString());
		setIsOpen(false);
	};

	const getDisplayText = () => {
		const quickRange = quickRanges.find(
			(r) => r.minutes.toString() === selectedRange,
		);
		if (quickRange) {
			return quickRange.label;
		}

		if (value.from && value.to) {
			return `${format(value.from, "MMM d, HH:mm")} - ${format(value.to, "MMM d, HH:mm")}`;
		}

		return "Select time range";
	};

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className="h-8 px-2 lg:px-3 justify-start text-left font-normal"
				>
					<Clock className="h-4 w-4 mr-2" />
					<span className="hidden lg:inline">{getDisplayText()}</span>
					<span className="lg:hidden">Time</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-80 p-0" align="start">
				<div className="p-3 border-b">
					<h4 className="text-sm font-medium">Time Range</h4>
				</div>

				<div className="p-3 space-y-3">
					<div>
						<label className="text-xs font-medium text-muted-foreground mb-2 block">
							Quick Ranges
						</label>
						<div className="grid grid-cols-2 gap-2">
							{quickRanges.map((range) => (
								<Button
									key={range.minutes}
									variant={
										selectedRange === range.minutes.toString()
											? "default"
											: "outline"
									}
									size="sm"
									className="text-xs h-7"
									onClick={() => handleQuickRange(range.minutes)}
								>
									{range.label}
								</Button>
							))}
						</div>
					</div>

					<div className="border-t pt-3">
						<label className="text-xs font-medium text-muted-foreground mb-2 block">
							Custom Range
						</label>
						<div className="space-y-3">
							<div className="grid grid-cols-2 gap-2">
								<div>
									<label className="text-xs text-muted-foreground">From</label>
									<input
										type="datetime-local"
										value={
											value.from ? format(value.from, "yyyy-MM-dd'T'HH:mm") : ""
										}
										onChange={(e) => {
											if (e.target.value) {
												const newFrom = new Date(e.target.value);
												onChange({ from: newFrom, to: value.to });
												setSelectedRange("");
											}
										}}
										className="w-full h-7 px-2 text-xs border rounded"
									/>
								</div>
								<div>
									<label className="text-xs text-muted-foreground">To</label>
									<input
										type="datetime-local"
										value={
											value.to ? format(value.to, "yyyy-MM-dd'T'HH:mm") : ""
										}
										onChange={(e) => {
											if (e.target.value) {
												const newTo = new Date(e.target.value);
												onChange({ from: value.from, to: newTo });
												setSelectedRange("");
											}
										}}
										className="w-full h-7 px-2 text-xs border rounded"
									/>
								</div>
							</div>
							<Button
								size="sm"
								className="w-full h-7 text-xs"
								onClick={() => setIsOpen(false)}
							>
								Apply Custom Range
							</Button>
						</div>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
