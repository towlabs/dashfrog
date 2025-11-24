import { Block } from "@blocknote/core";

export interface TimelineEvent {
	id: number;
	name: string;
	emoji: string;
	markdown: string;
	eventDt: Date;
	labels: Record<string, string>;
	blocks: Block[] | null;
}
