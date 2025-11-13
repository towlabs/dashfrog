"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { useParams } from "react-router-dom";
import { Timeline } from "@/components/Timeline";
import { TimelineBlockSettingsContent } from "@/components/TimelineBlockSettings";
import { Drawer } from "@/components/ui/drawer";
import { useNotebooksStore } from "@/src/stores/notebooks";
import { useTenantStore } from "@/src/stores/tenant";

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
			const timeWindow = useTenantStore((state) => state.timeWindow);
			const filters = useTenantStore((state) => state.filters);
			const settingsOpenBlockId = useNotebooksStore(
				(state) => state.settingsOpenBlockId,
			);
			const closeBlockSettings = useNotebooksStore(
				(state) => state.closeBlockSettings,
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

			return (
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

					<Drawer
						open={isSettingsOpen}
						onOpenChange={(open) => {
							if (!open) closeBlockSettings();
						}}
					>
						<TimelineBlockSettingsContent
							showEvent={props.block.props.showEvent}
							showLabels={props.block.props.showLabels}
							showTime={props.block.props.showTime}
							onUpdateProps={(newProps) => {
								props.editor.updateBlock(props.block, {
									props: newProps,
								});
							}}
							onClose={closeBlockSettings}
						/>
					</Drawer>
				</>
			);
		},
	},
)();
