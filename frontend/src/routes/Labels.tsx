import {
	BarChart3,
	Check,
	ChevronDown,
	ChevronRight,
	Download,
	Edit2,
	Eye,
	EyeOff,
	Globe,
	RefreshCcw,
	Search,
	Settings,
	Tags,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useLabels } from "@/src/contexts/labels";
import { useMetrics } from "@/src/contexts/metrics";
import { Labels } from "@/src/services/api";
import type { Label } from "@/src/types/label";

interface LabelWithType extends Label {
	type: "all" | "workflows" | "metrics";
}

interface RenamedValue {
	label: string;
	value: string;
	displayValue: string;
}

export default function LabelsPage() {
	const { labels: labelsStore, loading, error, refreshLabels } = useLabels();
	const { getMetricDisplayName } = useMetrics();
	const [searchTerm, setSearchTerm] = useState("");
	const [filterType, setFilterType] = useState<"all" | "workflows" | "metrics">(
		"all",
	);
	const [renamedSearch, setRenamedSearch] = useState("");
	const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
	const [showRenamedPanel, setShowRenamedPanel] = useState(false);

	// Edit states
	const [editingDescription, setEditingDescription] = useState<number | null>(
		null,
	);
	const [editingDisplayAs, setEditingDisplayAs] = useState<number | null>(null);
	const [editingValue, setEditingValue] = useState<{
		labelId: number;
		value: string;
	} | null>(null);
	const [descriptionDraft, setDescriptionDraft] = useState("");
	const [displayAsDraft, setDisplayAsDraft] = useState("");
	const [valueDraft, setValueDraft] = useState("");
	const [saving, setSaving] = useState(false);
	const [showHidden, setShowHidden] = useState(false);

	/**
	 * Helper to get display name for a label
	 * Returns displayAs if set, otherwise returns name
	 */
	const getLabelDisplayName = useCallback((label: Label): string => {
		return label.displayAs || label.name;
	}, []);

	/**
	 * Helper to get display value for used_in field
	 * Replaces metric IDs with their display_as names when applicable
	 */
	const getUsedInDisplayValue = useCallback(
		(usedIn: string, kind: string): string => {
			// Check if this is a metric-related usage
			if (kind === "metric" || kind === "metrics") {
				// Try to get the metric display name
				const displayName = getMetricDisplayName(usedIn);
				// Return display name if found, otherwise return original value
				return displayName || usedIn;
			}
			// For non-metric kinds, return as-is
			return usedIn;
		},
		[getMetricDisplayName],
	);

	// Transform labels from store to UI format
	const labelsWithType = useMemo(() => {
		return Object.values(labelsStore).map((label): LabelWithType => {
			// Determine type based on usage - collect unique kind categories
			const uniqueKinds = new Set<string>();

			label.usedIn.forEach((u) => {
				// Normalize kinds into categories
				if (u.kind === "flow" || u.kind === "workflow") {
					uniqueKinds.add("workflow");
				} else if (u.kind === "metric" || u.kind === "metrics") {
					uniqueKinds.add("metric");
				} else {
					uniqueKinds.add(u.kind); // Keep other kinds as-is
				}
			});

			// Determine type based on unique kind categories
			let type: "all" | "workflows" | "metrics";

			if (uniqueKinds.size === 0) {
				type = "all"; // No usage, default to all
			} else if (uniqueKinds.size > 1) {
				type = "all"; // Various kinds -> all
			} else {
				// Only one kind category
				const singleKind = Array.from(uniqueKinds)[0];
				if (singleKind === "workflow") {
					type = "workflows"; // Only workflow kind
				} else if (singleKind === "metric") {
					type = "metrics"; // Only metric kind
				} else {
					type = "all"; // Unknown single kind, default to all
				}
			}

			return {
				...label,
				type,
			};
		});
	}, [labelsStore]);

	// Extract renamed values from value mappings
	const renamedValues = useMemo((): RenamedValue[] => {
		const renamed: RenamedValue[] = [];
		Object.values(labelsStore).forEach((label) => {
			label.valueMappings.forEach((mappedTo, value) => {
				renamed.push({
					label: label.name,
					value,
					displayValue: mappedTo,
				});
			});
		});
		return renamed;
	}, [labelsStore]);

	const filteredLabels = useMemo(() => {
		return labelsWithType.filter((label) => {
			const displayName = getLabelDisplayName(label);
			const matchesSearch =
				label.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
				displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
				label.usedIn.some((usage) => {
					const displayValue = getUsedInDisplayValue(usage.usedIn, usage.kind);
					return displayValue.toLowerCase().includes(searchTerm.toLowerCase());
				});
			const matchesType =
				filterType === "all" ||
				label.type === filterType ||
				label.type === "all";
			return matchesSearch && matchesType;
		});
	}, [labelsWithType, searchTerm, filterType, getUsedInDisplayValue, getLabelDisplayName]);

	const filteredRenamedValues = useMemo(() => {
		return renamedValues.filter(
			(item) =>
				item.label.toLowerCase().includes(renamedSearch.toLowerCase()) ||
				item.value.toLowerCase().includes(renamedSearch.toLowerCase()) ||
				item.displayValue.toLowerCase().includes(renamedSearch.toLowerCase()),
		);
	}, [renamedValues, renamedSearch]);

	const getTypeIcon = (type: string) => {
		switch (type) {
			case "workflows":
				return <Settings className="h-4 w-4" />;
			case "metrics":
				return <BarChart3 className="h-4 w-4" />;
			case "all":
				return <Globe className="h-4 w-4" />;
			default:
				return <Tags className="h-4 w-4" />;
		}
	};

	const getTypeColor = (type: string) => {
		switch (type) {
			case "workflows":
				return "text-orange-600"; // Precise/specific operations
			case "metrics":
				return "text-blue-600"; // Precise/specific data
			case "all":
				return "text-green-600"; // Global/universal scope
			default:
				return "text-gray-600";
		}
	};

	const handleRefresh = async () => {
		await refreshLabels(showHidden);
	};

	const handleExport = () => {
		// Export labels data as JSON
		const dataStr = JSON.stringify(labelsStore, null, 2);
		const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
		const exportFileDefaultName = `labels-export-${new Date().toISOString()}.json`;

		const linkElement = document.createElement("a");
		linkElement.setAttribute("href", dataUri);
		linkElement.setAttribute("download", exportFileDefaultName);
		linkElement.click();
	};

	const toggleRowExpansion = (labelName: string, event: React.MouseEvent) => {
		event.stopPropagation();
		const newExpandedRows = new Set(expandedRows);
		if (expandedRows.has(labelName)) {
			newExpandedRows.delete(labelName);
		} else {
			newExpandedRows.add(labelName);
		}
		setExpandedRows(newExpandedRows);
	};

	// Description editing handlers
	const startEditDescription = (
		labelId: number,
		currentDescription: string | null,
	) => {
		setEditingDescription(labelId);
		setDescriptionDraft(currentDescription || "");
	};

	const cancelEditDescription = () => {
		setEditingDescription(null);
		setDescriptionDraft("");
	};

	const saveDescription = async (labelId: number) => {
		if (saving) return;

		try {
			setSaving(true);
			await Labels.updateDescription(labelId, descriptionDraft);
			await refreshLabels(showHidden); // Reload with current visibility setting
			setEditingDescription(null);
			setDescriptionDraft("");
		} catch (err) {
			console.error("Failed to update description:", err);
			alert("Failed to update description. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	// Display name editing handlers
	const startEditDisplayAs = (
		labelId: number,
		currentDisplayAs: string | null,
	) => {
		setEditingDisplayAs(labelId);
		setDisplayAsDraft(currentDisplayAs || "");
	};

	const cancelEditDisplayAs = () => {
		setEditingDisplayAs(null);
		setDisplayAsDraft("");
	};

	const saveDisplayAs = async (labelId: number) => {
		if (saving) return;

		try {
			setSaving(true);
			await Labels.updateDisplayAs(labelId, displayAsDraft);
			await refreshLabels(showHidden); // Reload with current visibility setting
			setEditingDisplayAs(null);
			setDisplayAsDraft("");
		} catch (err) {
			console.error("Failed to update display name:", err);
			alert("Failed to update display name. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	// Hide/show toggle handler
	const toggleHide = async (labelId: number, currentHide: boolean) => {
		if (saving) return;

		try {
			setSaving(true);
			await Labels.updateHide(labelId, !currentHide);
			await refreshLabels(showHidden); // Reload with current visibility setting
		} catch (err) {
			console.error("Failed to toggle hide:", err);
			alert("Failed to toggle label visibility. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	// Value proxy editing handlers
	const startEditValue = (
		labelId: number,
		value: string,
		currentProxy: string | undefined,
	) => {
		setEditingValue({ labelId, value });
		setValueDraft(currentProxy || "");
	};

	const cancelEditValue = () => {
		setEditingValue(null);
		setValueDraft("");
	};

	const saveValueProxy = async (labelId: number, value: string) => {
		if (saving) return;

		try {
			setSaving(true);
			const proxyValue = valueDraft.trim() === "" ? null : valueDraft.trim();
			await Labels.updateValueProxy(labelId, value, proxyValue);
			await refreshLabels(showHidden); // Reload with current visibility setting
			setEditingValue(null);
			setValueDraft("");
		} catch (err) {
			console.error("Failed to update value proxy:", err);
			alert("Failed to update value proxy. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div className="flex-1 space-y-6 p-8 pt-6">
				<div className="flex items-center justify-center h-96">
					<div className="text-center">
						<RefreshCcw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
						<p className="text-muted-foreground">Loading labels...</p>
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex-1 space-y-6 p-8 pt-6">
				<div className="flex items-center justify-center h-96">
					<div className="text-center">
						<p className="text-red-500 mb-4">{error}</p>
						<Button onClick={handleRefresh}>Try Again</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex-1 space-y-6 p-8 pt-6">
			{/* Header */}
			<div className="flex items-center justify-between space-y-2">
				<div>
					<h2 className="text-3xl font-bold tracking-tight">
						Label Management
					</h2>
					<p className="text-gray-500">
						Manage labels, their values, renamed displays, and usage across
						workflows and metrics
					</p>
				</div>
				<div className="flex items-center space-x-2">
					<Button
						variant={showRenamedPanel ? "default" : "outline"}
						size="default"
						onClick={() => setShowRenamedPanel(!showRenamedPanel)}
					>
						<Eye className="h-4 w-4" />
						<span className="ml-2 hidden lg:inline">
							{showRenamedPanel ? "Hide" : "Show"} Renamed Values
						</span>
					</Button>
					<Button variant="outline" size="default" onClick={handleRefresh}>
						<RefreshCcw className="h-4 w-4" />
						<span className="ml-2 hidden lg:inline">Refresh</span>
					</Button>
					<Button variant="outline" size="default" onClick={handleExport}>
						<Download className="h-4 w-4" />
						<span className="ml-2 hidden lg:inline">Export</span>
					</Button>
				</div>
			</div>

			{/* Labels Table */}
			<div>
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Tags className="h-5 w-5" />
							Labels Overview
						</CardTitle>
						<CardDescription>
							View all labels and their associated values
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex items-center space-x-4 mb-4">
							<div className="flex items-center space-x-2">
								<Search className="h-4 w-4" />
								<Input
									placeholder="Search labels and usage..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="w-64"
								/>
							</div>
							<Select
								value={filterType}
								onValueChange={(value: "all" | "workflows" | "metrics") =>
									setFilterType(value)
								}
							>
								<SelectTrigger className="w-48">
									<SelectValue placeholder="Filter by type" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Labels</SelectItem>
									<SelectItem value="workflows">Workflows Only</SelectItem>
									<SelectItem value="metrics">Metrics Only</SelectItem>
								</SelectContent>
							</Select>
							<Button
								variant={showHidden ? "default" : "outline"}
								size="default"
								onClick={async () => {
									const newShowHidden = !showHidden;
									setShowHidden(newShowHidden);
									await refreshLabels(newShowHidden);
								}}
								className="flex items-center gap-2"
							>
								{showHidden ? (
									<Eye className="h-4 w-4" />
								) : (
									<EyeOff className="h-4 w-4" />
								)}
								{showHidden ? "Hide Hidden" : "Show Hidden"}
							</Button>
						</div>

						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-12"></TableHead>
									<TableHead>Label</TableHead>
									<TableHead>Description</TableHead>
									<TableHead>Values</TableHead>
									<TableHead>Used In</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredLabels.map((label) => {
									const isExpanded = expandedRows.has(label.name);
									return (
										<>
											{/* Main Row */}
											<TableRow
												key={label.name}
												className={`hover:bg-muted/50 ${label.hide ? 'opacity-50 bg-muted/30' : ''}`}
											>
												<TableCell>
													<button
														type="button"
														onClick={(e) => toggleRowExpansion(label.name, e)}
														className="p-1 hover:bg-muted rounded"
													>
														{isExpanded ? (
															<ChevronDown className="h-4 w-4" />
														) : (
															<ChevronRight className="h-4 w-4" />
														)}
													</button>
												</TableCell>
												<TableCell className="font-medium">
													{editingDisplayAs === label.id ? (
														<div className="flex items-center gap-2">
															<Input
																value={displayAsDraft}
																onChange={(e) => setDisplayAsDraft(e.target.value)}
																className="h-8 text-sm"
																placeholder={label.name}
																autoFocus
															/>
															<Button
																size="sm"
																variant="ghost"
																onClick={() => saveDisplayAs(label.id)}
																disabled={saving}
																className="h-8 w-8 p-0"
															>
																<Check className="h-4 w-4 text-green-600" />
															</Button>
															<Button
																size="sm"
																variant="ghost"
																onClick={cancelEditDisplayAs}
																disabled={saving}
																className="h-8 w-8 p-0"
															>
																<X className="h-4 w-4 text-red-600" />
															</Button>
														</div>
													) : (
														<div className="flex items-center gap-2">
															<span className={getTypeColor(label.type)}>
																{getTypeIcon(label.type)}
															</span>
															<span className="truncate">{getLabelDisplayName(label)}</span>
															<Button
																size="sm"
																variant="ghost"
																onClick={() =>
																	startEditDisplayAs(label.id, label.displayAs)
																}
																className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
															>
																<Edit2 className="h-3 w-3" />
															</Button>
															<Button
																size="sm"
																variant="ghost"
																onClick={() => toggleHide(label.id, label.hide)}
																disabled={saving}
																className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
																title={
																	label.hide ? "Show this label" : "Hide this label"
																}
															>
																{label.hide ? (
																	<EyeOff className="h-3 w-3" />
																) : (
																	<Eye className="h-3 w-3" />
																)}
															</Button>
														</div>
													)}
												</TableCell>
												<TableCell className="text-sm text-muted-foreground max-w-xs">
													{editingDescription === label.id ? (
														<div className="flex items-center gap-2">
															<Input
																value={descriptionDraft}
																onChange={(e) =>
																	setDescriptionDraft(e.target.value)
																}
																className="h-8 text-sm"
																placeholder="Enter description..."
																autoFocus
															/>
															<Button
																size="sm"
																variant="ghost"
																onClick={() => saveDescription(label.id)}
																disabled={saving}
																className="h-8 w-8 p-0"
															>
																<Check className="h-4 w-4 text-green-600" />
															</Button>
															<Button
																size="sm"
																variant="ghost"
																onClick={cancelEditDescription}
																disabled={saving}
																className="h-8 w-8 p-0"
															>
																<X className="h-4 w-4 text-red-600" />
															</Button>
														</div>
													) : (
														<div className="flex items-center gap-2">
															<span className="truncate">
																{label.description || "No description"}
															</span>
															<Button
																size="sm"
																variant="ghost"
																onClick={() =>
																	startEditDescription(
																		label.id,
																		label.description,
																	)
																}
																className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
															>
																<Edit2 className="h-3 w-3" />
															</Button>
														</div>
													)}
												</TableCell>
												<TableCell>
													<div className="flex flex-wrap gap-1">
														{label.values.slice(0, 3).map((value) => (
															<Badge
																key={value}
																variant="secondary"
																className="text-xs"
															>
																{value}
															</Badge>
														))}
														{label.values.length > 3 && (
															<Badge variant="outline" className="text-xs">
																+{label.values.length - 3} more
															</Badge>
														)}
													</div>
												</TableCell>
												<TableCell>
													<div className="flex flex-wrap gap-1">
														{label.usedIn.slice(0, 3).map((usage, idx) => (
															<Badge
																key={`${usage.usedIn}-${idx}`}
																variant={
																	usage.kind === "flow" ||
																	usage.kind === "workflow"
																		? "secondary"
																		: "outline"
																}
																className="text-xs"
															>
																{getUsedInDisplayValue(
																	usage.usedIn,
																	usage.kind,
																)}
															</Badge>
														))}
														{label.usedIn.length > 3 && (
															<Badge variant="outline" className="text-xs">
																+{label.usedIn.length - 3} more
															</Badge>
														)}
													</div>
												</TableCell>
											</TableRow>

											{/* Expanded Row */}
											{isExpanded && (
												<TableRow key={`${label.name}-expanded`}>
													<TableCell colSpan={5} className="p-0 bg-muted/20">
														<Card className="m-4 shadow-sm">
															<CardContent className="p-6">
																{/* Label Info Header */}
																<div className="mb-6 pb-4 border-b">
																	<div className="flex items-center gap-3">
																		<span className={getTypeColor(label.type)}>
																			{getTypeIcon(label.type)}
																		</span>
																		<div>
																			<h3 className="text-lg font-semibold">
																				{getLabelDisplayName(label)}
																			</h3>
																			{label.displayAs && (
																				<p className="text-sm text-muted-foreground">
																					Internal name: <code className="px-1 py-0.5 bg-muted rounded text-xs">{label.name}</code>
																				</p>
																			)}
																		</div>
																	</div>
																</div>

																<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
																	{/* Left Panel - Value Mappings */}
																	<div>
																		<h4 className="font-semibold mb-3 flex items-center gap-2">
																			<Tags className="h-4 w-4" />
																			Value Mappings
																		</h4>
																		<div className="space-y-2">
																			{label.values.map((value) => {
																				const mappedTo =
																					label.valueMappings.get(value);
																				const isEditing =
																					editingValue?.labelId === label.id &&
																					editingValue?.value === value;

																				return (
																					<div
																						key={value}
																						className="flex items-center gap-2 p-3 border rounded bg-muted/20"
																					>
																						<Badge
																							variant="outline"
																							className="font-mono text-xs min-w-fit"
																						>
																							{value}
																						</Badge>
																						<span className="text-sm text-muted-foreground">
																							→
																						</span>

																						{isEditing ? (
																							<>
																								<Input
																									value={valueDraft}
																									onChange={(e) =>
																										setValueDraft(
																											e.target.value,
																										)
																									}
																									className="h-8 text-sm flex-1"
																									placeholder={value}
																									autoFocus
																								/>
																								<Button
																									size="sm"
																									variant="ghost"
																									onClick={() =>
																										saveValueProxy(
																											label.id,
																											value,
																										)
																									}
																									disabled={saving}
																									className="h-8 w-8 p-0"
																								>
																									<Check className="h-4 w-4 text-green-600" />
																								</Button>
																								<Button
																									size="sm"
																									variant="ghost"
																									onClick={cancelEditValue}
																									disabled={saving}
																									className="h-8 w-8 p-0"
																								>
																									<X className="h-4 w-4 text-red-600" />
																								</Button>
																							</>
																						) : (
																							<>
																								<div className="flex-1 flex items-center gap-2">
																									{mappedTo ? (
																										<Badge
																											variant="secondary"
																											className="text-xs"
																										>
																											{mappedTo}
																										</Badge>
																									) : (
																										<span className="text-sm text-muted-foreground italic">
																											{value} (no proxy)
																										</span>
																									)}
																								</div>
																								<Button
																									size="sm"
																									variant="ghost"
																									onClick={() =>
																										startEditValue(
																											label.id,
																											value,
																											mappedTo,
																										)
																									}
																									className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
																								>
																									<Edit2 className="h-3 w-3" />
																								</Button>
																							</>
																						)}
																					</div>
																				);
																			})}
																		</div>
																	</div>

																	{/* Right Panel - Usage */}
																	<div>
																		<h4 className="font-semibold mb-3 flex items-center gap-2">
																			<Eye className="h-4 w-4" />
																			Used In ({label.usedIn.length})
																		</h4>
																		<div className="space-y-2">
																			{label.usedIn.map((usage, idx) => (
																				<div
																					key={`${usage.usedIn}-${idx}`}
																					className="flex items-center gap-2 p-3 border rounded"
																				>
																					<div className="flex items-center gap-2">
																						<span
																							className={
																								usage.kind === "flow" ||
																								usage.kind === "workflow"
																									? "text-orange-600"
																									: "text-blue-600"
																							}
																						>
																							{usage.kind === "flow" ||
																							usage.kind === "workflow" ? (
																								<Settings className="h-4 w-4" />
																							) : (
																								<BarChart3 className="h-4 w-4" />
																							)}
																						</span>
																						<Badge
																							variant={
																								usage.kind === "flow" ||
																								usage.kind === "workflow"
																									? "secondary"
																									: "outline"
																							}
																							className="text-xs"
																						>
																							{getUsedInDisplayValue(
																								usage.usedIn,
																								usage.kind,
																							)}
																						</Badge>
																						<Badge
																							variant="outline"
																							className="text-xs capitalize"
																						>
																							{usage.kind}
																						</Badge>
																					</div>
																				</div>
																			))}
																		</div>
																	</div>
																</div>
															</CardContent>
														</Card>
													</TableCell>
												</TableRow>
											)}
										</>
									);
								})}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			</div>

			{/* Sliding Renamed Values Panel - Right side */}
			<div
				className={`fixed top-0 right-0 h-full w-96 bg-background border-l shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${
					showRenamedPanel ? "translate-x-0" : "translate-x-full"
				}`}
			>
				<Card className="h-full rounded-none border-0 flex flex-col">
					<CardHeader className="flex-shrink-0 border-b">
						<div className="flex items-center justify-between">
							<CardTitle className="flex items-center gap-2">
								<Eye className="h-5 w-5" />
								Renamed Values
							</CardTitle>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowRenamedPanel(false)}
								className="h-8 w-8 p-0"
							>
								<X className="h-4 w-4" />
							</Button>
						</div>
						<CardDescription>
							Custom display names for label values
						</CardDescription>
					</CardHeader>
					<CardContent className="flex-1 overflow-y-auto pt-4">
						<div className="mb-4">
							<div className="flex items-center space-x-2">
								<Search className="h-4 w-4" />
								<Input
									placeholder="Search renamed values..."
									value={renamedSearch}
									onChange={(e) => setRenamedSearch(e.target.value)}
									className="w-full"
								/>
							</div>
						</div>
						<div className="space-y-3">
							{filteredRenamedValues.length === 0 ? (
								<div className="text-center py-8 text-muted-foreground">
									<p>No renamed values found</p>
								</div>
							) : (
								Object.entries(
									filteredRenamedValues.reduce(
										(acc, item) => {
											if (!acc[item.label]) acc[item.label] = [];
											acc[item.label].push(item);
											return acc;
										},
										{} as Record<string, typeof filteredRenamedValues>,
									),
								).map(([label, items]) => (
									<div key={label} className="space-y-2">
										<h4 className="font-medium text-sm text-gray-600">
											{label}
										</h4>
										{items.map((item) => (
											<div
												key={`${item.label}-${item.value}`}
												className="flex items-center space-x-2 ml-4 p-2 rounded border-l-2 border-blue-200 bg-gray-50"
											>
												<Badge variant="outline" className="font-mono text-xs">
													{item.value}
												</Badge>
												<span className="text-sm">→</span>
												<span className="text-sm font-medium">
													{item.displayValue}
												</span>
											</div>
										))}
									</div>
								))
							)}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Overlay when panel is open */}
			{showRenamedPanel && (
				<div
					className="fixed inset-0 bg-black/20 z-40"
					onClick={() => setShowRenamedPanel(false)}
				/>
			)}
		</div>
	);
}
