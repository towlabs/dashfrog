import { ChevronLeft } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export type Aggregation =
	| "average"
	| "min"
	| "max"
	| "sum"
	| "p50"
	| "p90"
	| "p95"
	| "p99"
	| "last"
	| "share";

export type AggregationSettingsProps = {
	value: Aggregation | null;
	onChange: (value: Aggregation | "") => void;
	// conditional controls (for percent_where)
	conditionTarget?: string;
	onConditionTargetChange?: (value: string) => void;
	availableLabelTargets?: string[];
	conditionOp?: string;
	onConditionOpChange?: (value: string) => void;
	conditionValue?: string;
	onConditionValueChange?: (value: string) => void;
	conditionValue2?: string;
	onConditionValue2Change?: (value: string) => void;
};

export function getAggregationLabel(agg: Aggregation): string {
	const labels: Record<Aggregation, string> = {
		average: "Average",
		min: "Min",
		max: "Max",
		sum: "Sum",
		p50: "P50 (Median)",
		p90: "P90",
		p95: "P95",
		p99: "P99",
		last: "Last",
		share: "Share",
	};
	return labels[agg];
}

const AGG_GROUPS: Array<{
	heading: string;
	items: Array<{ key: Aggregation; label: string; description: string }>;
}> = [
	{
		heading: "Basic",
		items: [
			{
				key: "average",
				label: "Average",
				description: "Mean value over the time window",
			},
			{
				key: "sum",
				label: "Sum",
				description: "Cumulative sum over the time window",
			},
			{ key: "min", label: "Min", description: "Minimum observed value" },
			{ key: "max", label: "Max", description: "Maximum observed value" },
		],
	},
	{
		heading: "Percentiles",
		items: [
			{
				key: "p50",
				label: "P50 (Median)",
				description: "50th percentile (median) of values",
			},
			{ key: "p90", label: "P90", description: "90th percentile of values" },
			{ key: "p95", label: "P95", description: "95th percentile of values" },
			{ key: "p99", label: "P99", description: "99th percentile of values" },
		],
	},
	{
		heading: "Latest",
		items: [
			{
				key: "last",
				label: "Last",
				description: "Most recent value in the window",
			},
		],
	},
	{
		heading: "Derived",
		items: [
			{
				key: "share",
				label: "Share",
				description: "Percent of rows matching a condition",
			},
		],
	},
];

export function AggregationSettings({
	value,
	onChange,
	conditionTarget,
	onConditionTargetChange,
	availableLabelTargets = [],
	conditionOp,
	onConditionOpChange,
	conditionValue,
	onConditionValueChange,
	// biome-ignore lint/correctness/noUnusedFunctionParameters: implement later
	conditionValue2,
	// biome-ignore lint/correctness/noUnusedFunctionParameters: implement later
	onConditionValue2Change,
}: AggregationSettingsProps) {
	const [open, setOpen] = React.useState(false);
	const [step, setStep] = React.useState<"choose" | "share">("choose");

	React.useEffect(() => {
		if (open) {
			setStep(value === "share" ? "share" : "choose");
		}
	}, [open, value]);

	const handleSelect = (v: Aggregation) => {
		if (v === "share") {
			// Move to the share step; don't commit selection yet
			setStep("share");
		} else {
			onChange(v);
			setOpen(false);
			setStep("choose");
		}
	};

	const selectedLabel = value
		? getAggregationLabel(value as Aggregation)
		: "Choose aggregation...";

	return (
		<div className="space-y-2">
			<label className="text-xs text-muted-foreground font-medium">
				Aggregation
			</label>
			<div className="flex items-center gap-2">
				<Popover open={open} onOpenChange={setOpen} modal={true}>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							className="justify-between w-full"
						>
							<span className={value ? "" : "text-muted-foreground"}>
								{selectedLabel}
							</span>
							{value ? (
								<span
									className="ml-2 inline-flex items-center"
									onClick={(e) => {
										e.stopPropagation();
										onChange("");
										setStep("choose");
									}}
								></span>
							) : null}
						</Button>
					</PopoverTrigger>
					<PopoverContent
						className="w-[320px] h-72 p-0 overflow-hidden"
						align="start"
					>
						<div
							className="h-full w-[640px] flex transition-transform duration-200 ease-out"
							style={{
								transform:
									step === "choose" ? "translateX(0)" : "translateX(-320px)",
							}}
						>
							{/* Step 1: Choose aggregation (kept mounted) */}
							<div className="w-[320px] h-full">
								<Command className="h-full">
									<CommandInput placeholder="Search aggregations..." />
									<CommandList className="max-h-full overflow-auto">
										<CommandEmpty>No results found.</CommandEmpty>
										{AGG_GROUPS.map((group) => (
											<CommandGroup key={group.heading} heading={group.heading}>
												{group.items.map((item) => (
													<CommandItem
														key={item.key}
														value={item.key}
														onSelect={() => handleSelect(item.key)}
													>
														<div className="flex w-full items-start gap-2">
															<div className="flex flex-col flex-1">
																<span className="font-medium">
																	{item.label}
																</span>
																<span className="text-xs text-muted-foreground">
																	{item.description}
																</span>
															</div>
														</div>
													</CommandItem>
												))}
											</CommandGroup>
										))}
									</CommandList>
								</Command>
							</div>

							{/* Step 2: Share condition (kept mounted) */}
							<div className="w-[320px] h-full p-3 space-y-3 overflow-auto">
								<div className="text-xs text-muted-foreground">
									Share condition
								</div>
								<div className="space-y-1">
									<label className="text-xs text-muted-foreground font-medium">
										Target
									</label>
									<Select
										value={conditionTarget ?? "value"}
										onValueChange={(v) => onConditionTargetChange?.(v)}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{availableLabelTargets.map((label) => (
												<SelectItem key={label} value={label}>
													{label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-1">
									<label className="text-xs text-muted-foreground font-medium">
										Condition
									</label>
									<Select
										value={conditionOp ?? "eq"}
										onValueChange={(v) => onConditionOpChange?.(v)}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="eq">Equals</SelectItem>
											<SelectItem value="neq">Doesn’t equal</SelectItem>
											<SelectItem value="contains">Contains</SelectItem>
											<SelectItem value="not_contains">
												Doesn’t contain
											</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-1">
									<label className="text-xs text-muted-foreground font-medium">
										Value
									</label>
									<input
										className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
										value={conditionValue ?? ""}
										onChange={(e) => onConditionValueChange?.(e.target.value)}
										placeholder="Enter value..."
									/>
								</div>
								<div className="pt-1 flex items-center justify-between">
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setStep("choose")}
									>
										<ChevronLeft className="h-3.5 w-3.5" />
										Back
									</Button>
									{(() => {
										const allowed = new Set([
											"eq",
											"neq",
											"contains",
											"not_contains",
										]);
										const isValid = Boolean(
											conditionTarget &&
												conditionValue &&
												(conditionValue || "").trim() !== "" &&
												conditionOp &&
												allowed.has(String(conditionOp)),
										);
										return (
											<Button
												variant="default"
												size="sm"
												disabled={!isValid}
												onClick={() => {
													if (isValid) {
														onChange("share");
														setOpen(false);
														setStep("choose");
													}
												}}
											>
												Apply
											</Button>
										);
									})()}
								</div>
							</div>
						</div>
					</PopoverContent>
				</Popover>
			</div>
		</div>
	);
}

("use client");

import {
	type DragHandleMenuProps,
	useBlockNoteEditor,
	useComponentsContext,
} from "@blocknote/react";

export function ChartSettingsItem(props: DragHandleMenuProps) {
	const Components = useComponentsContext()!;
	const editor = useBlockNoteEditor();

	if ((props.block.type as string) !== "chart") return null;

	return (
		<Components.Generic.Menu.Item
			onClick={() =>
				editor.updateBlock(props.block, {
					props: { ...(props.block.props || {}), open: true },
				})
			}
		>
			<div className="flex items-center gap-2">
				<span>Settings</span>
			</div>
		</Components.Generic.Menu.Item>
	);
}
