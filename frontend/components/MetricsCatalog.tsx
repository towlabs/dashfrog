import {
	Calendar,
	ChevronDown,
	Clock,
	Edit3,
	Plus,
	TrendingUp,
} from "lucide-react";
import { useState } from "react";
import {
	CartesianGrid,
	Line,
	LineChart,
	ReferenceLine,
	XAxis,
	YAxis,
} from "recharts";
import { FilterBadgesEditor } from "@/components/FilterBadgesEditor";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent } from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLabels } from "@/src/contexts/labels";
import { useMetrics } from "@/src/contexts/metrics";
import type { Filter } from "@/src/types/filter";
import type { Metric } from "@/src/types/metric";

interface Rule {
	id: string;
	name: string;
	description: string;
	condition: "greater" | "less";
	threshold: number;
	duration: number;
	action: "email" | "slack" | "webhook";
	status: "active" | "disabled";
}

interface MetricWithRules extends Metric {
	thresholds?: {
		warning?: number;
		critical?: number;
	};
	rules?: Rule[];
}

interface MetricsCatalogProps {
	searchTerm: string;
	onSearchChange: (value: string) => void;
	filters: Filter[];
	onFiltersChange: (filters: Filter[]) => void;
}

// Metric chart configuration
const metricChartConfig: ChartConfig = {
	value: {
		label: "Value",
		color: "#3b82f6",
	},
};

// Metrics are now loaded from the useMetrics() context hook instead of sample data

interface MetricHistory {
	time: string;
	value: number;
	count: number;
}

// Generate sample metric history data
const generateMetricHistory = (
	metricName: string,
	_thresholds?: { warning?: number; critical?: number },
): MetricHistory[] => {
	const data = [];
	const now = new Date();
	for (let i = 23; i >= 0; i--) {
		const time = new Date(now.getTime() - i * 60 * 60 * 1000);
		let value: number;
		let count: number;

		// Generate different patterns based on metric type, considering thresholds
		if (metricName.includes("Response Time")) {
			// Values around 100-300ms to cross warning threshold of 200ms
			value = Math.floor(Math.random() * 200) + 100 + Math.sin(i / 4) * 50;
			count = Math.floor(Math.random() * 500) + 200 + Math.sin(i / 3) * 100;
		} else if (metricName.includes("CPU")) {
			// Values around 50-85% to approach warning threshold of 75%
			value = Math.random() * 35 + 50 + Math.sin(i / 3) * 15;
			count = Math.floor(Math.random() * 50) + 20 + Math.sin(i / 4) * 10;
		} else if (metricName.includes("Users")) {
			value = Math.floor(Math.random() * 8000) + 18000 + Math.sin(i / 6) * 3000;
			count = Math.floor(Math.random() * 1000) + 500 + Math.sin(i / 5) * 200;
		} else if (metricName.includes("Rate") || metricName.includes("Score")) {
			value = Math.random() * 20 + 80 + Math.sin(i / 3) * 10;
			count = Math.floor(Math.random() * 100) + 50 + Math.sin(i / 4) * 20;
		} else if (metricName.includes("Error Rate")) {
			// Values around 0.1-0.8 to approach warning threshold of 0.5
			value = Math.random() * 0.7 + 0.1 + Math.sin(i / 2) * 0.2;
			count = Math.floor(Math.random() * 20) + 5 + Math.sin(i / 3) * 5;
		} else {
			value = Math.floor(Math.random() * 100) + 50;
			count = Math.floor(Math.random() * 200) + 100 + Math.sin(i / 4) * 50;
		}

		data.push({
			time: time.toLocaleTimeString("en-US", {
				hour: "2-digit",
				minute: "2-digit",
			}),
			value: Math.max(0, value),
			count: Math.max(0, count),
		});
	}
	return data;
};

export function MetricsCatalog({
	searchTerm,
	// biome-ignore lint/correctness/noUnusedFunctionParameters: provided by parent; search UI not rendered here
	onSearchChange,
	filters,
	onFiltersChange,
}: MetricsCatalogProps) {
	const { labels: labelsStore } = useLabels();
	const { metrics: metricsStore, loading, error } = useMetrics();

	// Convert metrics store to array for display
	const metricsArray: MetricWithRules[] = Object.values(metricsStore);

	// Helper to get display name for a label key (uses displayAs if available)
	const _getLabelDisplayName = (labelKey: string): string => {
		return labelsStore[labelKey]?.displayAs || labelKey;
	};

	// Helper to get display value for a label (uses proxy if available)
	const _getDisplayValue = (labelKey: string, value: string): string => {
		return labelsStore[labelKey]?.valueMappings.get(value) || value;
	};
	const [isMetricSheetOpen, setIsMetricSheetOpen] = useState(false);
	const [selectedMetric, setSelectedMetric] = useState<Metric | null>(null);
	const [metricHistory, setMetricHistory] = useState<MetricHistory[]>([]);
	const [metricChartTab, setMetricChartTab] = useState<"count" | "value">(
		"value",
	);
	const [timeWindow, setTimeWindow] = useState("24h");
	const [customDateRange, setCustomDateRange] = useState<{
		from: Date | undefined;
		to: Date | undefined;
	}>({
		from: undefined,
		to: undefined,
	});
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
	const [editingRule, setEditingRule] = useState<Rule | null>(null);
	const [ruleForm, setRuleForm] = useState({
		name: "",
		condition: "greater" as "greater" | "less",
		threshold: 0,
		duration: 5,
		action: "email" as "email" | "slack" | "webhook",
	});

	// Filter helpers
	const applyFilters = (items: MetricWithRules[]) => {
		let result = items;
		if (searchTerm) {
			const q = searchTerm.toLowerCase();
			result = result.filter(
				(it) =>
					it.key.toLowerCase().includes(q) ||
					it.displayAs.toLowerCase().includes(q) ||
					it.description?.toLowerCase().includes(q),
			);
		}
		// Note: Real metrics don't have a "labels" field as Record<string, string>
		// They have a "labels" field as number[] (label IDs)
		// Filtering by label would require looking up label names from labelsStore
		// For now, we keep the filter logic structure but it won't match anything
		if (filters.length > 0) {
			result = result.filter((_it) => {
				return filters.every((f) => {
					// This won't work correctly without proper label mapping
					// TODO: Implement proper label filtering using label IDs
					return true;
				});
			});
		}
		return result;
	};

	const filteredMetrics: MetricWithRules[] = applyFilters(metricsArray);

	const getTimeWindowLabel = () => {
		switch (timeWindow) {
			case "15m":
				return "Last 15 Minutes";
			case "30m":
				return "Last 30 Minutes";
			case "1h":
				return "Last Hour";
			case "24h":
				return "Last 24 Hours";
			case "7d":
				return "Last 7 Days";
			case "30d":
				return "Last 30 Days";
			case "custom":
				if (customDateRange.from && customDateRange.to) {
					return `${customDateRange.from.toLocaleDateString("en-US", {
						year: "numeric",
						month: "short",
						day: "numeric",
					})} - ${customDateRange.to.toLocaleDateString("en-US", {
						year: "numeric",
						month: "short",
						day: "numeric",
					})}`;
				}
				return "Custom Range";
			default:
				return "Last 24 Hours";
		}
	};

	const handleMetricClick = (metric: MetricWithRules) => {
		setSelectedMetric(metric);
		setMetricHistory(generateMetricHistory(metric.displayAs, metric.thresholds));
		setIsMetricSheetOpen(true);
	};

	const handleAddRule = () => {
		setEditingRule(null);
		setRuleForm({
			name: "",
			condition: "greater",
			threshold: 0,
			duration: 5,
			action: "email",
		});
		setIsRuleDialogOpen(true);
	};

	const handleEditRule = (rule: Rule) => {
		setEditingRule(rule);
		setRuleForm({
			name: rule.name,
			condition: rule.condition,
			threshold: rule.threshold,
			duration: rule.duration,
			action: rule.action,
		});
		setIsRuleDialogOpen(true);
	};

	const handleSaveRule = () => {
		if (!selectedMetric) return;

		const newRule: Rule = {
			id: editingRule?.id || `rule-${Date.now()}`,
			name: ruleForm.name,
			description: `${ruleForm.condition === "greater" ? "Alert when" : "Alert when"} ${selectedMetric.displayAs.toLowerCase()} ${ruleForm.condition === "greater" ? ">" : "<"} ${ruleForm.threshold}${selectedMetric.unit} ${ruleForm.duration > 0 ? `for ${ruleForm.duration} minutes` : "immediately"}`,
			condition: ruleForm.condition,
			threshold: ruleForm.threshold,
			duration: ruleForm.duration,
			action: ruleForm.action,
			status: "active" as const,
		};

		// Update the selected metric with the new/edited rule
		// Note: This is local state only. To persist, would need to call API
		const updatedSelectedMetric = {
			...selectedMetric,
			rules: editingRule
				? ((selectedMetric as MetricWithRules).rules || []).map((r) =>
						r.id === editingRule.id ? newRule : r,
					)
				: [...((selectedMetric as MetricWithRules).rules || []), newRule],
		} as MetricWithRules;

		setSelectedMetric(updatedSelectedMetric);
		setIsRuleDialogOpen(false);
	};

	return (
		<>
			{/* Filters */}
			<FilterBadgesEditor
				availableLabels={Object.keys(labelsStore).sort()}
				filters={filters}
				onFiltersChange={onFiltersChange}
			/>

			{/* Metrics Table */}
			<div>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-[30%]">Name</TableHead>
							<TableHead className="w-[40%]">Description</TableHead>
							<TableHead className="w-[15%]">Type</TableHead>
							<TableHead className="w-[15%]">Unit</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{loading ? (
							<TableRow>
								<TableCell colSpan={4} className="text-center py-8">
									<div className="flex items-center justify-center gap-2 text-muted-foreground">
										<span>Loading metrics...</span>
									</div>
								</TableCell>
							</TableRow>
						) : error ? (
							<TableRow>
								<TableCell colSpan={4} className="text-center text-red-500">
									{error}
								</TableCell>
							</TableRow>
						) : filteredMetrics.length === 0 ? (
							<TableRow>
								<TableCell colSpan={4} className="text-center text-gray-500">
									No metrics found
								</TableCell>
							</TableRow>
						) : (
							filteredMetrics.map((metric) => (
								<TableRow
									key={`metric-${metric.id}`}
									className="hover:bg-muted/50 cursor-pointer"
									onClick={() => handleMetricClick(metric)}
								>
									<TableCell className="font-medium">
										<div className="flex items-center gap-2">
											<TrendingUp className="h-4 w-4 text-gray-500" />
											{metric.displayAs}
										</div>
									</TableCell>
									<TableCell className="text-sm text-gray-600">
										{metric.description || "No description"}
									</TableCell>
									<TableCell className="text-sm text-gray-600 capitalize">
										{metric.kind}
									</TableCell>
									<TableCell className="text-sm text-gray-600">
										{metric.unit}
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			{/* Metric Details Drawer */}
			<Sheet open={isMetricSheetOpen} onOpenChange={setIsMetricSheetOpen}>
				<SheetContent className="w-[1000px] sm:max-w-none overflow-auto">
					{selectedMetric && (
						<>
							{/* Header with title and action buttons - Fixed at top */}
							<div className="flex items-start justify-between gap-4 p-6 pb-4 border-b flex-shrink-0">
								<SheetHeader className="p-0 flex-1">
									<SheetTitle className="flex items-center gap-2">
										<TrendingUp className="h-5 w-5" />
										{selectedMetric.displayAs}
									</SheetTitle>
									<div className="flex gap-1 flex-wrap mb-2">
										<span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
											Type: {selectedMetric.kind}
										</span>
										<span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
											Scope: {selectedMetric.scope}
										</span>
										<span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
											Unit: {selectedMetric.unit}
										</span>
									</div>
									<SheetDescription>
										{selectedMetric.description || "No description available"}
									</SheetDescription>
								</SheetHeader>

								{/* Action buttons */}
								<div className="flex items-center gap-2 flex-shrink-0">
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="outline"
												size="default"
												className="flex items-center gap-2"
											>
												<Calendar className="h-4 w-4" />
												{getTimeWindowLabel()}
												<ChevronDown className="h-3 w-3 ml-1" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end" className="w-56">
											<DropdownMenuItem onClick={() => setTimeWindow("15m")}>
												Last 15 Minutes
											</DropdownMenuItem>
											<DropdownMenuItem onClick={() => setTimeWindow("30m")}>
												Last 30 Minutes
											</DropdownMenuItem>
											<DropdownMenuItem onClick={() => setTimeWindow("1h")}>
												Last Hour
											</DropdownMenuItem>
											<DropdownMenuItem onClick={() => setTimeWindow("24h")}>
												Last 24 Hours
											</DropdownMenuItem>
											<DropdownMenuItem onClick={() => setTimeWindow("7d")}>
												Last 7 Days
											</DropdownMenuItem>
											<DropdownMenuItem onClick={() => setTimeWindow("30d")}>
												Last 30 Days
											</DropdownMenuItem>
											<DropdownMenuSeparator />
											<DropdownMenuItem
												onClick={(e) => {
													e.preventDefault();
													setTimeWindow("custom");
													setShowDatePicker(true);
												}}
											>
												<Clock className="h-4 w-4 mr-2" />
												Custom Range...
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							</div>

							{/* Scrollable content area */}
							<div className="flex-1 overflow-y-auto p-6">
								<div className="space-y-6">
									{/* Metric Chart with Tabs */}
									<div>
										<div className="flex items-center justify-between mb-3">
											<h4 className="text-sm font-medium">
												Metric Over Time (Last 24 Hours)
											</h4>
											<Tabs
												value={metricChartTab}
												onValueChange={(value) =>
													setMetricChartTab(value as "count" | "value")
												}
												className=""
											>
												<TabsList className="h-7">
													<TabsTrigger value="value" className="text-xs h-6">
														Value
													</TabsTrigger>
													<TabsTrigger value="count" className="text-xs h-6">
														Count
													</TabsTrigger>
												</TabsList>
											</Tabs>
										</div>
										<ChartContainer
											config={metricChartConfig}
											className="h-[200px] w-full"
										>
											<LineChart
												data={metricHistory}
												margin={{ top: 5, right: 5, bottom: 5, left: 0 }}
											>
												<CartesianGrid strokeDasharray="3 3" />
												<XAxis
													dataKey="time"
													tickLine={false}
													axisLine={false}
													tickMargin={8}
													tickFormatter={(value) => value}
												/>
												<YAxis
													tickLine={false}
													axisLine={false}
													tickMargin={8}
													width={60}
													domain={["dataMin - 10", "dataMax + 10"]}
												/>
												<ChartTooltip content={<ChartTooltipContent />} />
												{/* Warning threshold line - only show for value tab */}
												{metricChartTab === "value" &&
													selectedMetric.thresholds?.warning && (
														<ReferenceLine
															y={selectedMetric.thresholds.warning}
															stroke="rgb(234 179 8)"
															strokeDasharray="8 4"
															strokeWidth={2}
														/>
													)}
												{/* Critical threshold line - only show for value tab */}
												{metricChartTab === "value" &&
													selectedMetric.thresholds?.critical && (
														<ReferenceLine
															y={selectedMetric.thresholds.critical}
															stroke="rgb(239 68 68)"
															strokeDasharray="8 4"
															strokeWidth={2}
														/>
													)}
												<Line
													type="monotone"
													dataKey={metricChartTab}
													stroke="#3b82f6"
													strokeWidth={2}
													dot={false}
												/>
											</LineChart>
										</ChartContainer>
									</div>

									{/* Rules */}
									<div>
										<div className="flex items-center justify-between mb-3">
											<h4 className="text-sm font-medium">
												Notification Rules
											</h4>
											<Button
												variant="outline"
												size="default"
												onClick={handleAddRule}
											>
												<Plus className="h-3 w-3" />
												Add Rule
											</Button>
										</div>
										<div className="space-y-3">
											{selectedMetric?.rules?.map((rule) => (
												<div
													key={rule.id}
													onClick={() => handleEditRule(rule)}
													className="p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors group"
												>
													<div className="flex items-center justify-between">
														<div className="flex items-center gap-2">
															<div
																className={`w-2 h-2 rounded-full ${
																	rule.status === "active"
																		? rule.action === "email"
																			? "bg-green-500"
																			: rule.action === "slack"
																				? "bg-blue-500"
																				: "bg-orange-500"
																		: "bg-gray-400"
																}`}
															></div>
															<span className="text-sm font-medium">
																{rule.name}
															</span>
															<Edit3 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
														</div>
														<span className="text-xs text-muted-foreground capitalize">
															{rule.status}
														</span>
													</div>
													<p className="text-xs text-muted-foreground mt-1">
														{rule.description}
													</p>
												</div>
											)) || (
												<div className="text-center py-6 text-sm text-muted-foreground">
													No rules configured. Click "Add Rule" to create one.
												</div>
											)}
										</div>
									</div>
								</div>

								{/* Custom Date Range Picker */}
								<Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
									<PopoverContent className="w-auto p-4" align="end">
										<div className="space-y-4">
											<div className="text-sm font-medium">
												Select Date Range
											</div>
											<div className="flex gap-2">
												<div className="space-y-2">
													<Label className="text-xs">From</Label>
													<CalendarComponent
														mode="single"
														selected={customDateRange.from}
														onSelect={(date) =>
															setCustomDateRange({
																...customDateRange,
																from: date,
															})
														}
														className="rounded-md border"
													/>
												</div>
												<div className="space-y-2">
													<Label className="text-xs">To</Label>
													<CalendarComponent
														mode="single"
														selected={customDateRange.to}
														onSelect={(date) =>
															setCustomDateRange({
																...customDateRange,
																to: date,
															})
														}
														className="rounded-md border"
													/>
												</div>
											</div>
											<div className="flex justify-end gap-2">
												<Button
													size="default"
													variant="outline"
													onClick={() => {
														setShowDatePicker(false);
														setTimeWindow("24h");
													}}
												>
													Cancel
												</Button>
												<Button
													size="default"
													onClick={() => {
														setShowDatePicker(false);
														if (customDateRange.from && customDateRange.to) {
															setTimeWindow("custom");
														}
													}}
												>
													Apply
												</Button>
											</div>
										</div>
									</PopoverContent>
								</Popover>
							</div>
						</>
					)}
				</SheetContent>
			</Sheet>

			{/* Rule Edit Dialog */}
			<Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>{editingRule ? "Edit Rule" : "Add Rule"}</DialogTitle>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="name">Rule Name</Label>
							<Input
								id="name"
								value={ruleForm.name}
								onChange={(e) =>
									setRuleForm({ ...ruleForm, name: e.target.value })
								}
								placeholder="Enter rule name"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="condition">Condition</Label>
							<Select
								value={ruleForm.condition}
								onValueChange={(value: "greater" | "less") =>
									setRuleForm({ ...ruleForm, condition: value })
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="greater">Greater than</SelectItem>
									<SelectItem value="less">Less than</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="threshold">Threshold</Label>
							<div className="flex items-center gap-2">
								<Input
									type="number"
									value={ruleForm.threshold}
									onChange={(e) =>
										setRuleForm({
											...ruleForm,
											threshold: Number(e.target.value),
										})
									}
									placeholder="Enter threshold value"
								/>
								<span className="text-sm text-muted-foreground">
									{selectedMetric?.unit}
								</span>
							</div>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="duration">Duration (minutes)</Label>
							<Input
								type="number"
								value={ruleForm.duration}
								onChange={(e) =>
									setRuleForm({ ...ruleForm, duration: Number(e.target.value) })
								}
								placeholder="Duration before alert (0 = immediate)"
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="action">Action</Label>
							<Select
								value={ruleForm.action}
								onValueChange={(value: "email" | "slack" | "webhook") =>
									setRuleForm({ ...ruleForm, action: value })
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="email">Send Email</SelectItem>
									<SelectItem value="slack">Send Slack Message</SelectItem>
									<SelectItem value="webhook">Call Webhook</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className="flex justify-end gap-2">
						<Button
							variant="outline"
							onClick={() => setIsRuleDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button
							onClick={handleSaveRule}
							disabled={!ruleForm.name || ruleForm.threshold === 0}
						>
							{editingRule ? "Update Rule" : "Create Rule"}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
