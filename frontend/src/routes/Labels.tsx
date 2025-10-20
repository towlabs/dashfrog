import {
	BarChart3,
	Check,
	ChevronDown,
	ChevronRight,
	Download,
	Edit2,
	Eye,
	Globe,
	RefreshCcw,
	Search,
	Settings,
	Tags,
	X,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
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
import { useLabels } from "@/src/contexts/labels-context";
import { Labels } from "@/src/services/api";
import type { ProcessedLabel } from "@/src/services/api/labels";

interface LabelWithType extends ProcessedLabel {
	type: "all" | "workflows" | "metrics";
}

interface RenamedValue {
	label: string;
	value: string;
	displayValue: string;
}

export default function LabelsPage() {
	const { labels: labelsStore, loading, error, refreshLabels } = useLabels();
	const [searchTerm, setSearchTerm] = useState("");
	const [filterType, setFilterType] = useState<"all" | "workflows" | "metrics">(
		"all",
	);
	const [renamedSearch, setRenamedSearch] = useState("");
	const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

	// Edit states
	const [editingDescription, setEditingDescription] = useState<number | null>(
		null,
	);
	const [editingValue, setEditingValue] = useState<{
		labelId: number;
		value: string;
	} | null>(null);
	const [descriptionDraft, setDescriptionDraft] = useState("");
	const [valueDraft, setValueDraft] = useState("");
	const [saving, setSaving] = useState(false);

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
			const matchesSearch =
				label.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
				label.usedIn.some((usage) =>
					usage.used_in.toLowerCase().includes(searchTerm.toLowerCase()),
				);
			const matchesType =
				filterType === "all" ||
				label.type === filterType ||
				label.type === "all";
			return matchesSearch && matchesType;
		});
	}, [labelsWithType, searchTerm, filterType]);

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
		await refreshLabels();
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
			await refreshLabels(); // Reload all labels to get updated data
			setEditingDescription(null);
			setDescriptionDraft("");
		} catch (err) {
			console.error("Failed to update description:", err);
			alert("Failed to update description. Please try again.");
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
			await refreshLabels(); // Reload all labels to get updated data
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

			{/* Section 1 & 2: Labels Table and Renamed Values side by side */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Labels Table - 2/3 width */}
				<div className="lg:col-span-2">
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
													className="hover:bg-muted/50"
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
														<div className="flex items-center gap-2">
															<span className={getTypeColor(label.type)}>
																{getTypeIcon(label.type)}
															</span>
															{label.name}
														</div>
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
																	key={`${usage.used_in}-${idx}`}
																	variant={
																		usage.kind === "flow" ||
																		usage.kind === "workflow"
																			? "secondary"
																			: "outline"
																	}
																	className="text-xs"
																>
																	{usage.used_in}
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
																						editingValue?.labelId ===
																							label.id &&
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
																						key={`${usage.used_in}-${idx}`}
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
																								{usage.used_in}
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

				{/* Renamed Values Card - 1/3 width */}
				<div className="lg:col-span-1">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Eye className="h-5 w-5" />
								Renamed Values
							</CardTitle>
							<CardDescription>
								Custom display names for label values
							</CardDescription>
						</CardHeader>
						<CardContent>
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
								{Object.entries(
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
								))}
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
