import { createReactBlockSpec } from "@blocknote/react";
import { CheckCircle2, Clock, Plus, X, XCircle } from "lucide-react";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxGroup,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	ComboboxTrigger,
} from "@/src/components/ui/shadcn-io/combobox";

// Demo data for the workflow steps
const demoSteps = [
	{ name: "Initialize", status: "success", duration: "1.2s" },
	{ name: "Fetch Data", status: "success", duration: "3.5s" },
	{ name: "Process", status: "success", duration: "2.1s" },
	{ name: "Validate", status: "failed", duration: "0.8s" },
	{ name: "Deploy", status: "pending", duration: "-" },
];

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

export const createWorkflowBlock = createReactBlockSpec(
	{
		type: "workflow",
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		propSchema: {
			workflow: { default: "" },
			// JSON string containing filters array
			filters: { default: "" },
			// Transient UI state - managed by local state, stripped from updates
			open: { default: false },
		},
		content: "none",
	},
	{
		render: ({ block, editor }) => {
			const workflow = block.props.workflow || "";

			// Use local state for UI-only state
			const [open, setOpen] = React.useState(false);

			// Sync block.props.open to local state when it changes
			React.useEffect(() => {
				const propsOpen = Boolean(block.props.open);
				if (propsOpen) {
					setOpen(true);
				}
			}, [block.props]);

			const parseFilters = (): Filter[] => {
				try {
					const f = block.props.filters;
					if (f && typeof f === "string") {
						const arr = JSON.parse(f);
						if (Array.isArray(arr)) return arr as Filter[];
					}
				} catch {}
				return [];
			};

			const filters = parseFilters();

			const [filterOpen, setFilterOpen] = React.useState(false);
			const [editingFilterIndex, setEditingFilterIndex] = React.useState<
				number | null
			>(null);
			const [fadingFilters, setFadingFilters] = React.useState<Set<number>>(
				new Set(),
			);

			// Memoize updateProps to prevent creating new function on every render
			const updateProps = React.useCallback(
				(next: Partial<{ workflow: string; filters: string }>) => {
					// Only send what changed - BlockNote merges partial updates
					editor.updateBlock(block, { props: next });
				},
				[editor, block],
			);

			const updateFilters = React.useCallback(
				(nextFilters: Filter[]) => {
					updateProps({ filters: JSON.stringify(nextFilters) });
				},
				[updateProps],
			);

			// Get selected workflow details
			const selectedWorkflow = AVAILABLE_WORKFLOWS.find(
				(w) => w.name === workflow,
			);

			// Remove filters with empty values after a delay with fade animation
			React.useEffect(() => {
				const timer = setTimeout(() => {
					const filtersToRemove = filters
						.map((f, i) => ({ filter: f, index: i }))
						.filter(
							({ filter, index }) =>
								filter.value.trim() === "" && editingFilterIndex !== index,
						);

					if (filtersToRemove.length > 0) {
						// First add them to fading set
						setFadingFilters(new Set(filtersToRemove.map((f) => f.index)));

						// Then remove after animation completes
						setTimeout(() => {
							updateFilters(filters.filter((f) => f.value.trim() !== ""));
							setFadingFilters(new Set());
						}, 200); // Match CSS transition duration
					}
				}, 2000); // Wait 2 seconds before removing empty filters

				return () => clearTimeout(timer);
			}, [filters, editingFilterIndex, updateFilters]);

			const addFilter = (label: string) => {
				updateFilters([...filters, { label, operator: "=", value: "" }]);
				setFilterOpen(false);
				setEditingFilterIndex(filters.length);
			};

			const updateFilter = (index: number, updates: Partial<Filter>) => {
				const newFilters = [...filters];
				newFilters[index] = { ...newFilters[index], ...updates };
				updateFilters(newFilters);
			};

			const removeFilter = (index: number) => {
				updateFilters(filters.filter((_, i) => i !== index));
				if (editingFilterIndex === index) {
					setEditingFilterIndex(null);
				}
			};

			const getStatusIcon = (status: string) => {
				switch (status) {
					case "success":
						return <CheckCircle2 className="h-4 w-4 text-green-500" />;
					case "failed":
						return <XCircle className="h-4 w-4 text-red-500" />;
					case "pending":
						return <Clock className="h-4 w-4 text-yellow-500" />;
					default:
						return null;
				}
			};

			const getStatusText = (status: string) => {
				switch (status) {
					case "success":
						return <span className="text-green-600 font-medium">Success</span>;
					case "failed":
						return <span className="text-red-600 font-medium">Failed</span>;
					case "pending":
						return <span className="text-yellow-600 font-medium">Pending</span>;
					default:
						return status;
				}
			};

			return (
				<div className="w-full max-w-full relative">
					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow className="h-10">
									<TableHead className="align-middle">Step</TableHead>
									<TableHead className="align-middle">Status</TableHead>
									<TableHead className="text-right align-middle">
										Duration
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{demoSteps.map((step, idx) => (
									<TableRow key={idx}>
										<TableCell className="font-medium">{step.name}</TableCell>
										<TableCell>
											<div className="flex items-center gap-2">
												{getStatusIcon(step.status)}
												{getStatusText(step.status)}
											</div>
										</TableCell>
										<TableCell className="text-right">
											{step.duration}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
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
								{/* Workflow Selection */}
								<div className="space-y-3">
									<h3 className="text-sm font-medium text-muted-foreground">
										Data
									</h3>
									<div className="space-y-1">
										<label className="text-xs text-muted-foreground font-medium">
											Workflow
										</label>
										<Combobox
											data={AVAILABLE_WORKFLOWS.map((w) => ({
												value: w.name,
												label: w.label,
											}))}
											type="workflow"
											value={workflow}
											onValueChange={(value) => {
												updateProps({ workflow: value, filters: "" });
											}}
										>
											<ComboboxTrigger className="w-full" />
											<ComboboxContent>
												<ComboboxInput />
												<ComboboxList>
													<ComboboxEmpty />
													<ComboboxGroup heading="Available Workflows">
														{AVAILABLE_WORKFLOWS.map((w) => (
															<ComboboxItem key={w.name} value={w.name}>
																<div className="flex flex-col">
																	<span className="font-medium">{w.label}</span>
																</div>
															</ComboboxItem>
														))}
													</ComboboxGroup>
												</ComboboxList>
											</ComboboxContent>
										</Combobox>
									</div>

									{/* Filters */}
									{selectedWorkflow && (
										<div className="space-y-1">
											<label className="text-xs text-muted-foreground font-medium">
												Filters
											</label>
											<div className="flex flex-wrap gap-2">
												{filters.map((filter, index) => {
													// Don't show filter badge if value is empty and not being edited
													if (
														filter.value.trim() === "" &&
														editingFilterIndex !== index &&
														!fadingFilters.has(index)
													) {
														return null;
													}

													const isFading = fadingFilters.has(index);

													return (
														<Popover
															key={index}
															open={editingFilterIndex === index}
															onOpenChange={(open) => {
																if (!open && filter.value.trim() === "") {
																	// Remove filter if closed with empty value
																	removeFilter(index);
																} else {
																	setEditingFilterIndex(open ? index : null);
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
																			removeFilter(index);
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
																		<Label className="text-xs">Operator</Label>
																		<Select
																			value={filter.operator}
																			onValueChange={(value) =>
																				updateFilter(index, {
																					operator: value as FilterOperator,
																				})
																			}
																		>
																			<SelectTrigger className="h-8">
																				<SelectValue />
																			</SelectTrigger>
																			<SelectContent>
																				<SelectItem value="=">=</SelectItem>
																				<SelectItem value="!=">!=</SelectItem>
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
																		<Label className="text-xs">Value</Label>
																		<Input
																			value={filter.value}
																			onChange={(e) =>
																				updateFilter(index, {
																					value: e.target.value,
																				})
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
												<Popover open={filterOpen} onOpenChange={setFilterOpen}>
													<PopoverTrigger asChild>
														<Button variant="outline" size="sm" className="h-6">
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
																<CommandEmpty>No labels found.</CommandEmpty>
																<CommandGroup heading="Available Labels">
																	{selectedWorkflow.labels?.map((label) => (
																		<CommandItem
																			key={label}
																			value={label}
																			onSelect={() => addFilter(label)}
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
							</div>
						</SheetContent>
					</Sheet>
				</div>
			);
		},
	},
);
