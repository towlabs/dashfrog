"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { Check, ChevronsUpDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useNotebooksStore } from "@/src/stores/notebooks";
import type { Metric } from "@/src/types/metric";

export const MetricBlock = createReactBlockSpec(
	{
		type: "metric" as const,
		propSchema: {
			metricName: {
				default: "",
			},
			title: {
				default: "",
			},
		},
		content: "none",
	},
	{
		render: (props) => {
			const { tenant } = useParams<{ tenant: string }>();
			const tenantName = tenant ? decodeURIComponent(tenant) : "";
			const settingsOpenBlockId = useNotebooksStore(
				(state) => state.settingsOpenBlockId,
			);
			const closeBlockSettings = useNotebooksStore(
				(state) => state.closeBlockSettings,
			);
			const metrics = useNotebooksStore((state) => state.metrics);
			const metricsLoading = useNotebooksStore((state) => state.metricsLoading);

			const [selectedMetric, setSelectedMetric] = useState<Metric | null>(null);
			const [comboboxOpen, setComboboxOpen] = useState(false);

			const metricName = props.block.props.metricName as string;
			const title = props.block.props.title as string;

			// Update selected metric when metricName or available metrics change
			useEffect(() => {
				if (!metricName || metrics.length === 0) {
					setSelectedMetric(null);
					return;
				}

				const metric = metrics.find((m) => m.name === metricName);
				setSelectedMetric(metric || null);
			}, [metricName, metrics]);

			if (!tenantName) {
				return (
					<div className="p-4 border rounded-lg">
						<div className="text-sm text-muted-foreground">
							No tenant selected
						</div>
					</div>
				);
			}

			const isSettingsOpen = settingsOpenBlockId === props.block.id;

			const handleMetricSelect = (selectedMetricName: string) => {
				props.editor.updateBlock(props.block, {
					props: {
						...props.block.props,
						metricName: selectedMetricName,
					},
				});
			};

			const formatValue = (value: number, unit: string | null): string => {
				if (unit === "percent") {
					return `${(value * 100).toFixed(1)}%`;
				}
				if (unit === "ms" || unit === "milliseconds") {
					return `${value.toFixed(1)}ms`;
				}
				if (unit === "bytes") {
					if (value >= 1024 * 1024 * 1024) {
						return `${(value / (1024 * 1024 * 1024)).toFixed(2)}GB`;
					}
					if (value >= 1024 * 1024) {
						return `${(value / (1024 * 1024)).toFixed(2)}MB`;
					}
					if (value >= 1024) {
						return `${(value / 1024).toFixed(2)}KB`;
					}
					return `${value.toFixed(0)}B`;
				}
				// Default: show number with appropriate precision
				if (value >= 1000) {
					return value.toFixed(0);
				}
				return value.toFixed(2);
			};

			// Render content based on state
			const renderContent = () => {
				if (!metricName) {
					return (
						<EmptyState
							icon={TrendingUp}
							title="No metric selected"
							description="Select a metric in the settings to view its value."
						/>
					);
				}

				if (metricsLoading) {
					return (
						<Card className="@container/card">
							<CardHeader>
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-8 w-24" />
							</CardHeader>
							<CardFooter className="flex-col items-start gap-1.5">
								<Skeleton className="h-3 w-48" />
							</CardFooter>
						</Card>
					);
				}

				if (!selectedMetric) {
					return (
						<EmptyState
							icon={TrendingUp}
							title="Metric not found"
							description="The selected metric could not be loaded."
						/>
					);
				}

				// Get the first value (for multi-label metrics, we show the first one)
				const metricValue =
					selectedMetric.values.length > 0 ? selectedMetric.values[0] : null;

				return (
					<Card className="@container/card">
						<CardHeader>
							<CardDescription>{title || selectedMetric.name}</CardDescription>
							<CardTitle className="text-2xl font-semibold @[250px]/card:text-3xl">
								{metricValue
									? formatValue(metricValue.value, selectedMetric.unit)
									: "N/A"}
							</CardTitle>
						</CardHeader>
						<CardFooter className="flex-col items-start gap-1.5 text-sm">
							<div className="text-muted-foreground">
								{selectedMetric.unit || "value"}
							</div>
						</CardFooter>
					</Card>
				);
			};

			return (
				<>
					<div className="outline-none min-w-0 flex-1">{renderContent()}</div>

					<Sheet
						open={isSettingsOpen}
						onOpenChange={(open) => {
							if (!open) closeBlockSettings();
						}}
					>
						<SheetContent>
							<SheetHeader>
								<SheetTitle>Metric Settings</SheetTitle>
							</SheetHeader>

							<div className="mt-6 space-y-6">
								<div className="space-y-3">
									<Label className="text-sm font-medium">Title</Label>
									<Input
										placeholder="Optional title..."
										value={title}
										onChange={(e) => {
											props.editor.updateBlock(props.block, {
												props: {
													...props.block.props,
													title: e.target.value,
												},
											});
										}}
									/>
								</div>

								<div className="space-y-3">
									<Label className="text-sm font-medium">Metric</Label>
									{metricsLoading ? (
										<div className="text-sm text-muted-foreground">
											Loading metrics...
										</div>
									) : metrics.length === 0 ? (
										<div className="text-sm text-muted-foreground">
											No metrics available
										</div>
									) : (
										<Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
											<PopoverTrigger asChild>
												<Button
													variant="outline"
													role="combobox"
													aria-expanded={comboboxOpen}
													className="w-full justify-between"
												>
													{metricName
														? metrics.find((m) => m.name === metricName)?.name
														: "Select a metric..."}
													<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
												</Button>
											</PopoverTrigger>
											<PopoverContent className="w-[400px] p-0">
												<Command>
													<CommandInput placeholder="Search metrics..." />
													<CommandList>
														<CommandEmpty>No metric found.</CommandEmpty>
														<CommandGroup>
															{metrics.map((metric) => (
																<CommandItem
																	key={metric.name}
																	value={metric.name}
																	onSelect={(currentValue) => {
																		handleMetricSelect(
																			currentValue === metricName
																				? ""
																				: currentValue,
																		);
																		setComboboxOpen(false);
																	}}
																>
																	<Check
																		className={cn(
																			"mr-2 h-4 w-4",
																			metricName === metric.name
																				? "opacity-100"
																				: "opacity-0",
																		)}
																	/>
																	{metric.name}
																</CommandItem>
															))}
														</CommandGroup>
													</CommandList>
												</Command>
											</PopoverContent>
										</Popover>
									)}
								</div>
							</div>
						</SheetContent>
					</Sheet>
				</>
			);
		},
	},
)();
