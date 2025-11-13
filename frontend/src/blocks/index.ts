import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { TimelineBlock } from "./TimelineBlock";

// Create custom schema with default blocks + our custom blocks
export const customSchema = BlockNoteSchema.create({
	blockSpecs: {
		...defaultBlockSpecs,
		timeline: TimelineBlock,
	},
});

export type CustomSchema = typeof customSchema;
