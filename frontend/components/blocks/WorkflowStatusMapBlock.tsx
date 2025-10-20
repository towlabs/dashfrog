import { createReactBlockSpec } from "@blocknote/react";
import { Plus, X } from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// Available workflows
const AVAILABLE_WORKFLOWS = [
	{
		name: "deployment_pipeline",
		label: "Deployment Pipeline",
		labels: ["environment", "branch", "service"],
	},
	{
		name: "data_processing",
		label: "Data Processing",
		labels: ["dataset", "region", "priority"],
	},
	{
		name: "ml_training",
		label: "ML Training",
		labels: ["model", "experiment", "stage"],
	},
	{
		name: "etl_job",
		label: "ETL Job",
		labels: ["source", "destination", "schedule"],
	},
];

type FilterOperator = "=" | "!=" | "contains" | "regex";

type Filter = {
	label: string;
	operator: FilterOperator;
	value: string;
};

// Demo data - each workflow has runs over time
const generateDemoData = (workflows: string[]) => {
	const statuses = ["success", "failed", "running", "pending"];
	const now = Date.now();
	const hourInMs = 60 * 60 * 1000;

	return workflows.map((workflow) => ({
		workflow,
		runs: Array.from({ length: 24 }, (_, i) => ({
			timestamp: now - (23 - i) * hourInMs,
			status: statuses[Math.floor(Math.random() * statuses.length)],
		})),
	}));
};

export const createWorkflowStatusMapBlock = createReactBlockSpec(
	{
		type: "workflowStatusMap",
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		propSchema: {
			// JSON array of workflow objects: [{ workflow: string, filters: Filter[] }]
			workflows: { default: "" },
			// Transient UI state - managed by local state, stripped from updates
			open: { default: false },
		},
		content: "none",
	},
	{
		render: ({ block, editor }) => {
			// Use local state for UI-only state
			const [open, setOpen] = React.useState(false);

			// Sync block.props.open to local state when it changes
			React.useEffect(() => {
				const propsOpen = Boolean(block.props.open);
				if (propsOpen) {
					setOpen(true);
				}
			}, [block.props]);

			const parseWorkflows = (): Array<{
				workflow: string;
				filters: Filter[];
			}> => {
				try {
					const w = block.props.workflows;
					if (w && typeof w === "string") {
						const arr = JSON.parse(w);
						if (Array.isArray(arr)) return arr;
					}
				} catch {}
				return [];
			};

			const workflows = parseWorkflows();
			const [editingWorkflowIndex, setEditingWorkflowIndex] = React.useState<
				number | null
			>(null);
			const [filterOpen, setFilterOpen] = React.useState(false);
			const [editingFilterIndex, setEditingFilterIndex] = React.useState<
				number | null
			>(null);
			const [fadingFilters, setFadingFilters] = React.useState<Set<number>>(
				new Set(),
			);

			// Memoize updateWorkflows to prevent creating new function on every render
			const updateWorkflows = React.useCallback(
				(next: Array<{ workflow: string; filters: Filter[] }>) => {
					// Only send what changed - BlockNote merges partial updates
					editor.updateBlock(block, {
						props: { workflows: JSON.stringify(next) },
					});
				},
				[editor, block],
			);

			const addWorkflow = (workflowName: string) => {
				updateWorkflows([
					...workflows,
					{ workflow: workflowName, filters: [] },
				]);
			};

			const removeWorkflow = (index: number) => {
				updateWorkflows(workflows.filter((_, i) => i !== index));
			};

			const updateWorkflowFilters = React.useCallback(
				(workflowIndex: number, filters: Filter[]) => {
					const next = [...workflows];
					next[workflowIndex] = { ...next[workflowIndex], filters };
					updateWorkflows(next);
				},
				[workflows, updateWorkflows],
			);

			const addFilter = (workflowIndex: number, label: string) => {
				const workflow = workflows[workflowIndex];
				const newFilters = [
					...workflow.filters,
					{ label, operator: "=" as FilterOperator, value: "" },
				];
				updateWorkflowFilters(workflowIndex, newFilters);
				setFilterOpen(false);
				setEditingFilterIndex(workflow.filters.length);
			};

			const updateFilter = (
				workflowIndex: number,
				filterIndex: number,
				updates: Partial<Filter>,
			) => {
				const workflow = workflows[workflowIndex];
				const newFilters = [...workflow.filters];
				newFilters[filterIndex] = { ...newFilters[filterIndex], ...updates };
				updateWorkflowFilters(workflowIndex, newFilters);
			};

			const removeFilter = (workflowIndex: number, filterIndex: number) => {
				const workflow = workflows[workflowIndex];
				updateWorkflowFilters(
					workflowIndex,
					workflow.filters.filter((_, i) => i !== filterIndex),
				);
				if (editingFilterIndex === filterIndex) {
					setEditingFilterIndex(null);
				}
			};

			// Auto-remove empty filters
			React.useEffect(() => {
				if (editingWorkflowIndex === null) return;

				const workflow = workflows[editingWorkflowIndex];
				if (!workflow) return;

				const timer = setTimeout(() => {
					const filtersToRemove = workflow.filters
						.map((f, i) => ({ filter: f, index: i }))
						.filter(
							({ filter, index }) =>
								filter.value.trim() === "" && editingFilterIndex !== index,
						);

					if (filtersToRemove.length > 0) {
						setFadingFilters(new Set(filtersToRemove.map((f) => f.index)));
						setTimeout(() => {
							updateWorkflowFilters(
								editingWorkflowIndex,
								workflow.filters.filter((f) => f.value.trim() !== ""),
							);
							setFadingFilters(new Set());
						}, 200);
					}
				}, 2000);

				return () => clearTimeout(timer);
			}, [
				workflows,
				editingWorkflowIndex,
				editingFilterIndex,
				updateWorkflowFilters,
			]);

			const getStatusColor = (status: string) => {
				switch (status) {
					case "success":
						return "bg-[#addf7d]"; // operational green from EventsPage
					case "failed":
						return "bg-[#e56458]"; // incident red from EventsPage
					case "running":
						return "bg-[#2783de]"; // maintenance blue from EventsPage
					case "pending":
						return "bg-gray-200"; // future gray from EventsPage
					default:
						return "bg-gray-300";
				}
			};

			// Generate demo data for selected workflows
			const demoData = generateDemoData(workflows.map((w) => w.workflow));

			return (
				<div className="w-full max-w-full relative">
					<div className="rounded-md border overflow-auto">
						<div className="min-w-[800px]">
							{/* Legend */}
							<div className="flex items-center justify-between text-sm text-muted-foreground p-3 border-b bg-muted/50">
								<div className="flex items-center space-x-4">
									<div className="flex items-center space-x-1">
										<div className="w-3 h-3 rounded-sm bg-[#addf7d]"></div>
										<span>Success</span>
									</div>
									<div className="flex items-center space-x-1">
										<div className="w-3 h-3 rounded-sm bg-[#e56458]"></div>
										<span>Failed</span>
									</div>
									<div className="flex items-center space-x-1">
										<div className="w-3 h-3 rounded-sm bg-[#2783de]"></div>
										<span>Running</span>
									</div>
									<div className="flex items-center space-x-1">
										<div className="w-3 h-3 rounded-sm bg-gray-200"></div>
										<span>Pending</span>
									</div>
								</div>
							</div>

							{/* Header with time labels */}
							<div className="flex border-b bg-muted/50">
								<div className="w-48 p-3 font-medium text-sm border-r">
									Workflow
								</div>
								<div className="flex-1 grid grid-cols-24 gap-0">
									{Array.from({ length: 24 }, (_, i) => (
										<div
											key={i}
											className="text-center text-xs p-1 text-muted-foreground"
										>
											{i % 4 === 0 ? `${i}h` : ""}
										</div>
									))}
								</div>
							</div>

							{/* Workflow rows */}
							{workflows.length === 0 ? (
								<div className="p-8 text-center text-muted-foreground text-sm">
									No workflows selected. Click the settings to add workflows.
								</div>
							) : (
								demoData.map((data, idx) => {
									const workflowInfo = AVAILABLE_WORKFLOWS.find(
										(w) => w.name === data.workflow,
									);
									return (
										<div
											key={idx}
											className="flex items-center border-b last:border-b-0"
										>
											<div className="w-48 p-3 font-medium text-sm border-r truncate">
												{workflowInfo?.label || data.workflow}
											</div>
											<div className="flex gap-0.5 w-full p-2">
												{data.runs.map((run, runIdx) => (
													<div
														key={runIdx}
														className={cn(
															"h-8 flex-1 rounded-sm cursor-pointer transition-opacity hover:opacity-80",
															getStatusColor(run.status),
														)}
														title={`${new Date(run.timestamp).toLocaleTimeString()}: ${run.status}`}
														style={{ minWidth: "2px" }}
													/>
												))}
											</div>
										</div>
									);
								})
							)}
						</div>
					</div>

					{/* Settings Drawer */}
					<Sheet
						open={open}
						onOpenChange={(v) => {
							setOpen(v);
							editor.updateBlock(block, { props: { open: v } });
						}}
					>
						<SheetContent className="w-[360px] sm:max-w-none p-0 flex h-full flex-col">
							<div className="border-b p-6">
								<SheetHeader>
									<SheetTitle>Settings</SheetTitle>
								</SheetHeader>
							</div>
							<div className="flex-1 overflow-y-auto p-6 space-y-3">
								{/* Workflows Selection */}
								<div className="space-y-3">
									<h3 className="text-sm font-medium text-muted-foreground">
										Workflows
									</h3>

									{workflows.map((workflowItem, workflowIdx) => {
										const workflowInfo = AVAILABLE_WORKFLOWS.find(
											(w) => w.name === workflowItem.workflow,
										);
										const isEditing = editingWorkflowIndex === workflowIdx;

										return (
											<div
												key={workflowIdx}
												className="border rounded-md p-3 space-y-3"
											>
												<div className="flex items-center justify-between">
													<span className="font-medium text-sm">
														{workflowInfo?.label || workflowItem.workflow}
													</span>
													<Button
														variant="ghost"
														size="sm"
														className="h-6"
														onClick={() => removeWorkflow(workflowIdx)}
													>
														<X className="h-3 w-3" />
													</Button>
												</div>

												{/* Filters */}
												{workflowInfo && (
													<div className="space-y-1">
														<label className="text-xs text-muted-foreground font-medium">
															Filters
														</label>
														<div className="flex flex-wrap gap-2">
															{workflowItem.filters.map((filter, filterIdx) => {
																if (
																	filter.value.trim() === "" &&
																	(!isEditing ||
																		editingFilterIndex !== filterIdx) &&
																	!fadingFilters.has(filterIdx)
																) {
																	return null;
																}

																const isFading = fadingFilters.has(filterIdx);

																return (
																	<Popover
																		key={filterIdx}
																		open={
																			isEditing &&
																			editingFilterIndex === filterIdx
																		}
																		onOpenChange={(open) => {
																			if (open) {
																				setEditingWorkflowIndex(workflowIdx);
																				setEditingFilterIndex(filterIdx);
																			} else {
																				if (filter.value.trim() === "") {
																					removeFilter(workflowIdx, filterIdx);
																				}
																				setEditingFilterIndex(null);
																			}
																		}}
																	>
																		<PopoverTrigger asChild>
																			<Badge
																				variant="secondary"
																				className={cn(
																					"gap-1 cursor-pointer hover:bg-secondary/80 transition-all duration-200",
																					isFading && "opacity-0 scale-95",
																				)}
																			>
																				{filter.label} {filter.operator}{" "}
																				{filter.value || '""'}
																				<X
																					className="h-3 w-3 cursor-pointer hover:text-destructive"
																					onClick={(e) => {
																						e.stopPropagation();
																						removeFilter(
																							workflowIdx,
																							filterIdx,
																						);
																					}}
																				/>
																			</Badge>
																		</PopoverTrigger>
																		<PopoverContent
																			className="w-[300px] p-4"
																			align="start"
																		>
																			<div className="space-y-4">
																				<div className="space-y-2">
																					<Label className="text-xs">
																						Operator
																					</Label>
																					<Select
																						value={filter.operator}
																						onValueChange={(value) =>
																							updateFilter(
																								workflowIdx,
																								filterIdx,
																								{
																									operator:
																										value as FilterOperator,
																								},
																							)
																						}
																					>
																						<SelectTrigger className="h-8">
																							<SelectValue />
																						</SelectTrigger>
																						<SelectContent>
																							<SelectItem value="=">
																								=
																							</SelectItem>
																							<SelectItem value="!=">
																								!=
																							</SelectItem>
																							<SelectItem value="contains">
																								contains
																							</SelectItem>
																							<SelectItem value="regex">
																								regex
																							</SelectItem>
																						</SelectContent>
																					</Select>
																				</div>
																				<div className="space-y-2">
																					<Label className="text-xs">
																						Value
																					</Label>
																					<Input
																						value={filter.value}
																						onChange={(e) =>
																							updateFilter(
																								workflowIdx,
																								filterIdx,
																								{ value: e.target.value },
																							)
																						}
																						placeholder="Enter value..."
																						className="h-8"
																						autoFocus
																					/>
																				</div>
																			</div>
																		</PopoverContent>
																	</Popover>
																);
															})}
															<Popover
																open={
																	filterOpen &&
																	editingWorkflowIndex === workflowIdx
																}
																onOpenChange={(open) => {
																	setFilterOpen(open);
																	if (open)
																		setEditingWorkflowIndex(workflowIdx);
																}}
															>
																<PopoverTrigger asChild>
																	<Button
																		variant="outline"
																		size="sm"
																		className="h-6"
																		onClick={() => {
																			setEditingWorkflowIndex(workflowIdx);
																			setFilterOpen(true);
																		}}
																	>
																		<Plus className="h-3 w-3 mr-1" />
																		Add filter
																	</Button>
																</PopoverTrigger>
																<PopoverContent
																	className="w-[300px] p-0"
																	align="start"
																>
																	<Command>
																		<CommandInput placeholder="Search labels..." />
																		<CommandList>
																			<CommandEmpty>
																				No labels found.
																			</CommandEmpty>
																			<CommandGroup heading="Available Labels">
																				{workflowInfo.labels?.map((label) => (
																					<CommandItem
																						key={label}
																						value={label}
																						onSelect={() =>
																							addFilter(workflowIdx, label)
																						}
																					>
																						{label}
																					</CommandItem>
																				))}
																			</CommandGroup>
																		</CommandList>
																	</Command>
																</PopoverContent>
															</Popover>
														</div>
													</div>
												)}
											</div>
										);
									})}

									{/* Add Workflow Button */}
									<Popover>
										<PopoverTrigger asChild>
											<Button variant="outline" size="sm" className="w-full">
												<Plus className="h-4 w-4 mr-2" />
												Add Workflow
											</Button>
										</PopoverTrigger>
										<PopoverContent className="w-[300px] p-0" align="start">
											<Command>
												<CommandInput placeholder="Search workflows..." />
												<CommandList>
													<CommandEmpty>No workflows found.</CommandEmpty>
													<CommandGroup heading="Available Workflows">
														{AVAILABLE_WORKFLOWS.map((w) => (
															<CommandItem
																key={w.name}
																value={w.name}
																onSelect={() => addWorkflow(w.name)}
																disabled={workflows.some(
																	(wf) => wf.workflow === w.name,
																)}
															>
																{w.label}
															</CommandItem>
														))}
													</CommandGroup>
												</CommandList>
											</Command>
										</PopoverContent>
									</Popover>
								</div>
							</div>
						</SheetContent>
					</Sheet>
				</div>
			);
		},
	},
);
