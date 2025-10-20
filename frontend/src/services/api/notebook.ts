import type {
	NotebookCreateInput,
	NotebookData,
	NotebookUpdateInput,
} from "../../types/notebook";

const STORAGE_KEY_PREFIX = "dashfrog_notebook_";
const NOTEBOOKS_INDEX_KEY = "dashfrog_notebooks_index";

import { v4 as uuidv4 } from "uuid";

class NotebookStorage {
	private isBrowser(): boolean {
		return typeof window !== "undefined" && typeof localStorage !== "undefined";
	}

	/**
	 * Get the list of all notebook IDs
	 */
	private getNotebookIndex(): string[] {
		if (!this.isBrowser()) return [];

		const index = localStorage.getItem(NOTEBOOKS_INDEX_KEY);
		if (!index) return [];

		try {
			return JSON.parse(index);
		} catch {
			return [];
		}
	}

	/**
	 * Update the notebook index
	 */
	private setNotebookIndex(ids: string[]): void {
		if (!this.isBrowser()) return;
		localStorage.setItem(NOTEBOOKS_INDEX_KEY, JSON.stringify(ids));
	}

	/**
	 * Serialize a notebook for storage
	 */
	private serialize(notebook: NotebookData): string {
		const serialized = {
			...notebook,
			timeWindow:
				notebook.timeWindow.type === "absolute"
					? {
							type: "absolute",
							metadata: {
								start: notebook.timeWindow.metadata.start.toISOString(),
								end: notebook.timeWindow.metadata.end.toISOString(),
							},
						}
					: notebook.timeWindow,
			createdAt: notebook.createdAt.toISOString(),
			updatedAt: notebook.updatedAt.toISOString(),
		};
		return JSON.stringify(serialized);
	}

	/**
	 * Deserialize a notebook from storage
	 */
	private deserialize(data: string): NotebookData | null {
		try {
			const parsed = JSON.parse(data);
			return {
				...parsed,
				timeWindow:
					parsed.timeWindow.type === "absolute"
						? {
								type: "absolute",
								metadata: {
									start: new Date(parsed.timeWindow.metadata.start),
									end: new Date(parsed.timeWindow.metadata.end),
								},
							}
						: parsed.timeWindow,
				createdAt: new Date(parsed.createdAt),
				updatedAt: new Date(parsed.updatedAt),
			};
		} catch (error) {
			console.error("Failed to deserialize notebook:", error);
			return null;
		}
	}

	/**
	 * Create a new notebook
	 */
	create(input: NotebookCreateInput): NotebookData {
		if (!this.isBrowser()) {
			throw new Error("Cannot create notebook: localStorage not available");
		}

		const id = uuidv4();
		const now = new Date();

		const notebook: NotebookData = {
			id,
			...input,
			createdAt: now,
			updatedAt: now,
		};

		// Save notebook
		localStorage.setItem(
			`${STORAGE_KEY_PREFIX}${id}`,
			this.serialize(notebook),
		);

		// Update index
		const index = this.getNotebookIndex();
		index.push(id);
		this.setNotebookIndex(index);

		return notebook;
	}

	/**
	 * Load a notebook by ID
	 */
	load(id: string): NotebookData | null {
		if (!this.isBrowser()) return null;

		const data = localStorage.getItem(`${STORAGE_KEY_PREFIX}${id}`);
		if (!data) return null;

		return this.deserialize(data);
	}

	/**
	 * Load a notebook for viewing (public view)
	 * For now, this just delegates to load(), but in the future
	 * this could load from a different source (e.g., shared notebooks)
	 */
	loadView(viewId: string): NotebookData | null {
		// For now, viewId is the same as notebook ID
		// In the future, this could map viewId to notebookId or load from a different source
		return this.load(viewId);
	}

	/**
	 * Update a notebook
	 */
	update(id: string, updates: NotebookUpdateInput): NotebookData | null {
		if (!this.isBrowser()) return null;

		const notebook = this.load(id);
		if (!notebook) return null;

		const updated: NotebookData = {
			...notebook,
			...updates,
			updatedAt: new Date(),
		};

		localStorage.setItem(`${STORAGE_KEY_PREFIX}${id}`, this.serialize(updated));

		return updated;
	}

	/**
	 * Delete a notebook
	 */
	delete(id: string): boolean {
		if (!this.isBrowser()) return false;

		localStorage.removeItem(`${STORAGE_KEY_PREFIX}${id}`);

		// Update index
		const index = this.getNotebookIndex();
		const newIndex = index.filter((notebookId) => notebookId !== id);
		this.setNotebookIndex(newIndex);

		return true;
	}

	/**
	 * List all notebooks
	 */
	list(): NotebookData[] {
		if (!this.isBrowser()) return [];

		const index = this.getNotebookIndex();
		const notebooks: NotebookData[] = [];

		for (const id of index) {
			const notebook = this.load(id);
			if (notebook) {
				notebooks.push(notebook);
			}
		}

		// Sort by updatedAt descending (most recent first)
		return notebooks.sort(
			(a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
		);
	}

	/**
	 * Clear all notebooks (use with caution)
	 */
	clear(): void {
		if (!this.isBrowser()) return;

		const index = this.getNotebookIndex();
		for (const id of index) {
			localStorage.removeItem(`${STORAGE_KEY_PREFIX}${id}`);
		}
		localStorage.removeItem(NOTEBOOKS_INDEX_KEY);
	}
}

export const notebookStorage = new NotebookStorage();
