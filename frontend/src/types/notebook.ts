import type { Block } from "@blocknote/core";
import {
	endOfWeek,
	startOfWeek,
	subDays,
	subHours,
	subMinutes,
} from "date-fns";

export interface NotebookData {
	uuid: string;
	title: string;
	description: string | null;
	locked: boolean;
	timeWindow: TimeWindowConfig;
}

export interface NotebookDataWithContent extends NotebookData {
	blocknote: {
		uuid: string;
		content: Block[];
	};
}

export type NotebookUpdateInput = Partial<
	Omit<NotebookData, "uuid" | "id" | "blocknote_uuid" | "blockNoteId">
>;
