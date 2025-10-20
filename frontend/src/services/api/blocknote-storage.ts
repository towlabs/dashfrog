/** biome-ignore-all lint/suspicious/noExplicitAny: wip */
import type { Block } from "@blocknote/core";

const STORAGE_PREFIX = "dashfrog_notebook_";
const OLD_STORAGE_KEY = "dashfrog_notebook_content"; // Legacy key without ID

// Clean up old storage format on import
if (typeof window !== "undefined") {
	try {
		const oldData = localStorage.getItem(OLD_STORAGE_KEY);
		if (oldData) {
			console.log("Migrating old notebook storage format...");
			localStorage.removeItem(OLD_STORAGE_KEY);
		}
	} catch (_e) {
		// Ignore cleanup errors
	}
}

export const blockNoteStorage = {
	save: (id: string, content: Block<any>[]): void => {
		try {
			localStorage.setItem(`${STORAGE_PREFIX}${id}`, JSON.stringify(content));
		} catch (error) {
			console.error("Failed to save notebook content:", error);
		}
	},

	load: (id: string): Block<any>[] | null => {
		try {
			const stored = localStorage.getItem(`${STORAGE_PREFIX}${id}`);
			if (stored) {
				const content = JSON.parse(stored) as Block<any>[];
				return content;
			}
		} catch (error) {
			console.error(
				"Failed to load notebook content, clearing corrupted data:",
				error,
			);
			// Clear corrupted data
			try {
				localStorage.removeItem(`${STORAGE_PREFIX}${id}`);
			} catch (_e) {
				// Ignore cleanup errors
			}
		}
		return null;
	},

	clear: (id: string): void => {
		try {
			localStorage.removeItem(`${STORAGE_PREFIX}${id}`);
		} catch (error) {
			console.error("Failed to clear notebook content:", error);
		}
	},

	list: (): string[] => {
		try {
			const keys: string[] = [];
			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i);
				if (key?.startsWith(STORAGE_PREFIX)) {
					keys.push(key.replace(STORAGE_PREFIX, ""));
				}
			}
			return keys;
		} catch (error) {
			console.error("Failed to list notebooks:", error);
			return [];
		}
	},
};
