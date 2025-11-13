"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";

type TimelineBlockSettingsProps = {
	showEvent: boolean;
	showLabels: boolean;
	showTime: boolean;
	onUpdateProps: (props: {
		showEvent?: boolean;
		showLabels?: boolean;
		showTime?: boolean;
	}) => void;
	onClose: () => void;
};

export function TimelineBlockSettingsContent({
	showEvent,
	showLabels,
	showTime,
	onUpdateProps,
	onClose,
}: TimelineBlockSettingsProps) {
	const [localShowEvent, setLocalShowEvent] = useState(showEvent);
	const [localShowLabels, setLocalShowLabels] = useState(showLabels);
	const [localShowTime, setLocalShowTime] = useState(showTime);

	const handleSave = () => {
		onUpdateProps({
			showEvent: localShowEvent,
			showLabels: localShowLabels,
			showTime: localShowTime,
		});
		onClose();
	};

	return (
		<DrawerContent>
			<DrawerHeader>
				<DrawerTitle>Timeline Block Settings</DrawerTitle>
				<DrawerDescription>
					Configure which columns to display in the timeline table.
				</DrawerDescription>
			</DrawerHeader>

			<div className="px-4 py-6 space-y-6">
				{/* Columns Section */}
				<div className="space-y-4">
					<h3 className="text-sm font-medium">Visible Columns</h3>
					<div className="space-y-3">
						<div className="flex items-center space-x-2">
							<Checkbox
								id="show-event"
								checked={localShowEvent}
								onCheckedChange={(checked) =>
									setLocalShowEvent(checked as boolean)
								}
							/>
							<Label htmlFor="show-event" className="cursor-pointer">
								Event
							</Label>
						</div>
						<div className="flex items-center space-x-2">
							<Checkbox
								id="show-labels"
								checked={localShowLabels}
								onCheckedChange={(checked) =>
									setLocalShowLabels(checked as boolean)
								}
							/>
							<Label htmlFor="show-labels" className="cursor-pointer">
								Labels
							</Label>
						</div>
						<div className="flex items-center space-x-2">
							<Checkbox
								id="show-time"
								checked={localShowTime}
								onCheckedChange={(checked) =>
									setLocalShowTime(checked as boolean)
								}
							/>
							<Label htmlFor="show-time" className="cursor-pointer">
								Time
							</Label>
						</div>
					</div>
				</div>
			</div>

			<DrawerFooter>
				<Button onClick={handleSave}>Save Changes</Button>
				<DrawerClose asChild>
					<Button variant="outline">Cancel</Button>
				</DrawerClose>
			</DrawerFooter>
		</DrawerContent>
	);
}
