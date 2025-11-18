"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { Calendar, CaseUpper, Eye, EyeOff, Tags } from "lucide-react";
import { useParams } from "react-router-dom";
import { Timeline } from "@/components/Timeline";
import { Separator } from "@/components/ui/separator";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { useNotebooksStore } from "@/src/stores/notebooks";

export const TimelineBlock = createReactBlockSpec(
	{
		type: "timeline" as const,
		propSchema: {
			showEvent: {
				default: true,
			},
			showLabels: {
				default: true,
			},
			showTime: {
				default: true,
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
			const timeWindow = useNotebooksStore(
				(state) => state.currentNotebook?.timeWindow,
			);
			const filters = useNotebooksStore(
				(state) => state.currentNotebook?.filters,
			);

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

			const handleColumnToggle = (
				column: "showEvent" | "showLabels" | "showTime",
				value: boolean,
			) => {
				props.editor.updateBlock(props.block, {
					props: {
						...props.block.props,
						[column]: value,
					},
				});
			};

			return (
				timeWindow !== undefined &&
				filters !== undefined && (
					<>
						<div className="outline-none min-w-0 flex-1">
							<Timeline
								tenant={tenantName}
								timeWindow={timeWindow}
								filters={filters}
								visibleColumns={{
									event: props.block.props.showEvent,
									labels: props.block.props.showLabels,
									time: props.block.props.showTime,
								}}
							/>
						</div>

						<Sheet
							open={isSettingsOpen}
							onOpenChange={(open) => {
								if (!open) closeBlockSettings();
							}}
						>
							<SheetContent>
								<SheetHeader>
									<SheetTitle>Timeline Settings</SheetTitle>
								</SheetHeader>

								<Separator className="my-4" />

								<div className="mt-6">
									<div className="space-y-1">
										<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
											Columns
										</h3>
										<div className="space-y-1">
											<div
												className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent cursor-pointer"
												onClick={() =>
													handleColumnToggle(
														"showEvent",
														!props.block.props.showEvent,
													)
												}
											>
												<div className="flex items-center gap-2">
													<CaseUpper className="size-4" strokeWidth={2.5} />
													<span className="text-sm">Event</span>
												</div>
												{props.block.props.showEvent ? (
													<Eye className="size-4" strokeWidth={2.5} />
												) : (
													<EyeOff className="size-4" strokeWidth={2.5} />
												)}
											</div>
											<div
												className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent cursor-pointer"
												onClick={() =>
													handleColumnToggle(
														"showLabels",
														!props.block.props.showLabels,
													)
												}
											>
												<div className="flex items-center gap-2">
													<Tags className="size-4" strokeWidth={2.5} />
													<span className="text-sm">Labels</span>
												</div>
												{props.block.props.showLabels ? (
													<Eye className="size-4" strokeWidth={2.5} />
												) : (
													<EyeOff className="size-4" strokeWidth={2.5} />
												)}
											</div>
											<div
												className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent cursor-pointer"
												onClick={() =>
													handleColumnToggle(
														"showTime",
														!props.block.props.showTime,
													)
												}
											>
												<div className="flex items-center gap-2">
													<Calendar className="size-4" strokeWidth={2.5} />
													<span className="text-sm">Time</span>
												</div>
												{props.block.props.showTime ? (
													<Eye className="size-4" strokeWidth={2.5} />
												) : (
													<EyeOff className="size-4" strokeWidth={2.5} />
												)}
											</div>
										</div>
									</div>
								</div>
							</SheetContent>
						</Sheet>
					</>
				)
			);
		},
	},
)();
