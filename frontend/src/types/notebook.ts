import type { Block } from "@blocknote/core";

export interface Notebook {
	id: string;
	title: string;
	description: string;
	blocks: Block[] | null; // JSON content for BlockNote
}
