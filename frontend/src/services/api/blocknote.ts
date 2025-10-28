/** biome-ignore-all lint/suspicious/noExplicitAny: wip */
import type { Block } from "@blocknote/core";
import { NewRestAPI } from "@/src/services/api/_helper";
import { toNotebook } from "./notebooks";

const BlockNoteAPI = NewRestAPI("api");

// API response types (snake_case from backend)
interface BlockNoteContentApiResponse {
	data: Block<any>[];
}

export const BlockNote = {
	save: async (id: string, content: Block<any>[]): Promise<void> => {
		try {
			// TODO: Replace with actual backend endpoint when available
			await BlockNoteAPI.post<void>(`blocknote/${id}`, {
				data: { content },
				meta: { action: "save", resource: "blocknote" },
			});
		} catch (error) {
			console.error("Failed to save notebook content:", error);
			throw error;
		}
	},

	load: async (id: string): Promise<BlockNoteContentApiResponse> => {
		try {
			// TODO: Replace with actual backend endpoint when available
			const response = await BlockNoteAPI.get<BlockNoteContentApiResponse>(
				`blocknote/${id}`,
				{
					meta: { action: "load", resource: "blocknote" },
				},
			);
			return toNotebook(response.data);
		} catch (error) {
			console.error("Failed to load notebook content:", error);
			// Return empty data on error
			return { data: [] };
		}
	},

	clear: async (id: string): Promise<void> => {
		try {
			// TODO: Replace with actual backend endpoint when available
			await BlockNoteAPI.delete<void>(`blocknote/${id}`, {
				meta: { action: "clear", resource: "blocknote" },
			});
		} catch (error) {
			console.error("Failed to clear notebook content:", error);
			throw error;
		}
	},
};
