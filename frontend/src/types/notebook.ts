import type { Block } from "@blocknote/core";
import type { Filter } from "./filter";
import type { TimeWindow } from "./timewindow";

export interface Notebook {
	id: string;
	title: string;
	description: string;
	blocks: Block[] | null; // JSON content for BlockNote
	timeWindow: TimeWindow;
	filters: Filter[];
}
