import type { Block } from "@blocknote/core";
import { NewRestAPI } from "@/src/services/api/_helper";
import type {
	NotebookData,
	NotebookDataWithContent,
	RelativeTimeValue,
	TimeWindowConfig,
} from "@/src/types/notebook";

const NotebooksAPI = NewRestAPI("api");

/**
 * Transform BlockNote block to backend API format
 *
 * ## BlockNote Block Structure
 *
 * BlockNote blocks have the following structure:
 * - **id**: string - Unique identifier for the block
 * - **type**: string - Block type (e.g., "paragraph", "heading", "chart", "bulletListItem")
 * - **props**: object - Block-specific properties
 * - **content**: inline content - For text blocks, array of styled text runs
 * - **children**: array - Nested blocks for hierarchical structures
 *
 * ### Props Field
 * The `props` field contains block-specific configuration:
 * - **Common props** (available on most blocks):
 *   - `textColor`: string - Text color
 *   - `backgroundColor`: string - Background color
 *   - `textAlignment`: "left" | "center" | "right" | "justify"
 *
 * - **Custom block props** (e.g., for chart blocks):
 *   - `selectedMetric`: string - Selected metric ID
 *   - `filters`: string - JSON-encoded filter configuration
 *   - `operation`: string - Aggregation operation
 *   - `title`: string - Block title
 *   - `showTitle`: boolean - Whether to show the title
 *   - Plus any other block-specific configuration
 *
 * ### Content Field
 * The `content` field contains inline text content:
 * - For text blocks (paragraph, heading, etc.): array of styled text runs
 *   ```typescript
 *   content: [
 *     { type: "text", text: "Hello ", styles: {} },
 *     { type: "text", text: "world", styles: { bold: true } }
 *   ]
 *   ```
 * - For non-text blocks (image, chart, etc.): typically empty or undefined
 *
 * ### Children Field
 * The `children` field contains nested blocks for hierarchical structures:
 * - **List items**: Nested bullet/numbered list items
 * - **Multi-column layouts**: Blocks within columns
 * - **Nested structures**: Any parent-child block relationships
 *
 * Example:
 * ```typescript
 * {
 *   id: "block-1",
 *   type: "bulletListItem",
 *   props: { textColor: "default" },
 *   content: [{ type: "text", text: "Parent item", styles: {} }],
 *   children: [
 *     {
 *       id: "block-2",
 *       type: "bulletListItem",
 *       props: { textColor: "default" },
 *       content: [{ type: "text", text: "Child item", styles: {} }],
 *       children: []
 *     }
 *   ]
 * }
 * ```
 *
 * ## Backend Format
 *
 * The backend expects a flattened structure:
 * - **id**: string
 * - **type**: string
 * - **content**: dict - Contains ALL block data (props, content, children)
 * - **position**: number - Position in the document
 *
 * This transformation packs the BlockNote structure into the backend's `content` dict:
 * ```python
 * {
 *   "id": "block-1",
 *   "type": "paragraph",
 *   "content": {
 *     "props": { "textColor": "default", "backgroundColor": "default" },
 *     "content": [{ "type": "text", "text": "Hello", "styles": {} }],
 *     "children": []
 *   },
 *   "position": 0
 * }
 * ```
 */

/**
 * Raw notebook response from backend API (snake_case)
 * Backend stays close to BlockNote typing
 */
interface NotebookApiResponse {
	uuid: string;
	title: string;
	description: string | null;
	locked: boolean;
	blocknote_uuid: string;
	timeWindow:
		| { type: "relative"; metadata: { value: RelativeTimeValue } }
		| { type: "absolute"; metadata: { start: string; end: string } };
}

type NotebooksApiResponse = NotebookApiResponse[];

/**
 * Raw notebook create payload for backend API (snake_case)
 */
interface NotebookCreateApiPayload {
	title: string;
	description: string | null;
	locked: boolean;
	time_window: TimeWindowConfig;
	blocks?: Block[]; // Optional initial blocks
}

/**
 * Raw notebook update payload for backend API (snake_case)
 * Now includes blocks to push entire notebook state
 */
interface NotebookUpdateApiPayload {
	title?: string;
	description?: string | null;
	locked?: boolean;
	time_window?: TimeWindowConfig;
	blocks?: Block[]; // Include blocks for complete notebook updates
}

/**
 * Convert backend API response to frontend Notebook type
 * Transforms snake_case to camelCase
 */
function toNotebook(apiNotebook: NotebookApiResponse): NotebookData {
	return {
		...apiNotebook,
		uuid: apiNotebook.uuid,
		title: apiNotebook.title,
		description: apiNotebook.description,
		locked: apiNotebook.locked,
		// Use provided time_window or default to 24h relative time
		timeWindow:
			apiNotebook.timeWindow.type === "relative"
				? apiNotebook.timeWindow
				: {
						type: apiNotebook.timeWindow.type,
						metadata: {
							start: new Date(apiNotebook.timeWindow.metadata.start),
							end: new Date(apiNotebook.timeWindow.metadata.end),
						},
					},
	};
}

const Notebooks = {
	/**
	 * Get all notebooks
	 */
	getAll: () => {
		return NotebooksAPI.get<NotebooksApiResponse>("notebooks/", {
			meta: { action: "fetch", resource: "notebooks" },
		});
	},

	async get(uiid: string) {
		const response = await NotebooksAPI.get<NotebookApiResponse>(
			`notebooks/${uiid}`,
			{
				meta: { action: "get", resource: "notebook" },
			},
		);
		return toNotebook(response.data) as NotebookDataWithContent;
	},

	/**
	 * Create a new notebook
	 * Optionally include initial blocks
	 */
	create: (notebook: NotebookData) => {
		return NotebooksAPI.post<NotebookApiResponse>("notebooks/", {
			data: notebook,
		});
	},

	/**
	 * Update an existing notebook
	 * Accepts full notebook data including blocks
	 */
	update: (uuid: string, data: Partial<NotebookDataWithContent>) => {
		return NotebooksAPI.put<NotebookApiResponse>(`notebooks/${uuid}`, {
			data,
			meta: { action: "update", resource: "notebook" },
		});
	},

	/**
	 * Delete a notebook
	 */
	delete: (uuid: string) => {
		return NotebooksAPI.delete<void>(`notebooks/${uuid}`, {
			meta: { action: "delete", resource: "notebook" },
		});
	},

	/**
	 * Lock a notebook (prevent edits)
	 */
	lock: (uuid: string) => {
		return NotebooksAPI.post<NotebookApiResponse>(`notebooks/${uuid}/lock`, {
			meta: { action: "lock", resource: "notebook" },
		});
	},

	/**
	 * Unlock a notebook (allow edits)
	 */
	unlock: (uuid: string) => {
		return NotebooksAPI.post<NotebookApiResponse>(`notebooks/${uuid}/unlock`, {
			meta: { action: "unlock", resource: "notebook" },
		});
	},
};

export { NotebooksAPI, Notebooks, toNotebook };
export type {
	NotebookApiResponse,
	NotebookCreateApiPayload,
	NotebookUpdateApiPayload,
};
