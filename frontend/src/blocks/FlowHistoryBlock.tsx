"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { Check, ChevronsUpDown, History, ListCollapse } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { FlowHistoryTable } from "@/components/FlowHistoryTable";
import type { StatusFilter } from "@/components/FlowStatusButtons";
import { TableSkeleton } from "@/components/TableSkeleton";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
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
import { Flows, toFlow } from "@/src/services/api/flows";
import { useNotebooksStore } from "@/src/stores/notebooks";
import { useTenantStore } from "@/src/stores/tenant";
import type { DetailedFlow, Flow } from "@/src/types/flow";
import { resolveTimeWindow } from "@/src/types/timewindow";
import { cn } from "@/lib/utils";

export const FlowHistoryBlock = createReactBlockSpec(
	{
		type: "flowHistory" as const,
		propSchema: {
			flowName: {
				default: "",
			},
			statusFilter: {
				default: "all" as StatusFilter,
			},
		},
		content: "none",
	},
	{
		render: (props) => {
			const { tenant } = useParams<{ tenant: string }>();
			const tenantName = tenant ? decodeURIComponent(tenant) : "";
			const timeWindow = useTenantStore((state) => state.timeWindow);
			const filters = useTenantStore((state) => state.filters);
			const settingsOpenBlockId = useNotebooksStore(
				(state) => state.settingsOpenBlockId,
			);
			const closeBlockSettings = useNotebooksStore(
				(state) => state.closeBlockSettings,
			);
			const openBlockSettings = useNotebooksStore(
				(state) => state.openBlockSettings,
			);
			const flows = useNotebooksStore((state) => state.flows);
			const flowsLoading = useNotebooksStore((state) => state.flowsLoading);

			const [detailedFlow, setDetailedFlow] = useState<DetailedFlow | null>(
				null,
			);
			const [loadingDetail, setLoadingDetail] = useState(false);
			const [comboboxOpen, setComboboxOpen] = useState(false);

			const flowName = props.block.props.flowName as string;
			const statusFilter = props.block.props.statusFilter as StatusFilter;

			// Fetch detailed flow when flowName is set
			useEffect(() => {
				const fetchDetailedFlow = async () => {
					if (!tenantName || !flowName) {
						setDetailedFlow(null);
						return;
					}

					setLoadingDetail(true);
					try {
						const { start, end } = resolveTimeWindow(timeWindow);
						const response = await Flows.getDetailedFlow(
							tenantName,
							flowName,
							start,
							end,
							filters,
						);
						setDetailedFlow(response.data);
					} catch (error) {
						console.error("Failed to fetch detailed flow:", error);
						setDetailedFlow(null);
					} finally {
						setLoadingDetail(false);
					}
				};

				void fetchDetailedFlow();
			}, [tenantName, flowName, timeWindow, filters]);

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

			const handleFlowSelect = (selectedFlowName: string) => {
				props.editor.updateBlock(props.block, {
					props: {
						...props.block.props,
						flowName: selectedFlowName,
					},
				});
			};

			// Render content based on state
			const renderContent = () => {
				if (!flowName) {
					return (
						<EmptyState
							icon={ListCollapse}
							title="No flow selected"
							description="Select a flow to view its execution history."
							onClick={() => openBlockSettings(props.block.id)}
							className="cursor-pointer"
						/>
					);
				}

				if (loadingDetail) {
					return <TableSkeleton columns={6} rows={5} />;
				}

				if (!detailedFlow) {
					return (
						<EmptyState
							icon={ListCollapse}
							title="Flow not found"
							description="The selected flow could not be loaded."
						/>
					);
				}

				return (
					<FlowHistoryTable
						detailedFlow={detailedFlow}
						statusFilter={statusFilter}
					/>
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
								<SheetTitle>Flow History Settings</SheetTitle>
							</SheetHeader>

							<div className="mt-6 space-y-6">
								<div className="space-y-3">
									<Label className="text-sm font-medium">Flow</Label>
									{flowsLoading ? (
										<div className="text-sm text-muted-foreground">
											Loading flows...
										</div>
									) : flows.length === 0 ? (
										<div className="text-sm text-muted-foreground">
											No flows available
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
													{flowName
														? flows.find((flow) => flow.name === flowName)?.name
														: "Select a flow..."}
													<ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
												</Button>
											</PopoverTrigger>
											<PopoverContent className="w-[400px] p-0">
												<Command>
													<CommandInput placeholder="Search flows..." />
													<CommandList>
														<CommandEmpty>No flow found.</CommandEmpty>
														<CommandGroup>
															{flows.map((flow) => (
																<CommandItem
																	key={flow.name}
																	value={flow.name}
																	onSelect={(currentValue) => {
																		handleFlowSelect(
																			currentValue === flowName
																				? ""
																				: currentValue,
																		);
																		setComboboxOpen(false);
																	}}
																>
																	<Check
																		className={cn(
																			"mr-2 h-4 w-4",
																			flowName === flow.name
																				? "opacity-100"
																				: "opacity-0",
																		)}
																	/>
																	{flow.name}
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
