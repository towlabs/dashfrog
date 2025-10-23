import type { Block } from "@blocknote/core";
import { NewRestAPI } from "@/src/services/api/_helper";
import type {
	NotebookData,
	NotebookCreateInput,
	NotebookUpdateInput,
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
function blockToApiPayload(block: Block, position: number) {
	return {
		id: block.id,
		type: block.type,
		content: {
			props: block.props || {},
			content: block.content || [],
			children: block.children || [],
		},
		position,
	};
}

/**
 * Transform backend API block to BlockNote block format
 */
function apiPayloadToBlock(apiBlock: BlockApiResponse): Block {
	return {
		id: apiBlock.id,
		type: apiBlock.type,
		props: apiBlock.content.props || {},
		content: apiBlock.content.content || [],
		children: apiBlock.content.children || [],
	} as Block;
}

/**
 * Raw notebook response from backend API (snake_case)
 * Backend stays close to BlockNote typing
 */
interface NotebookApiResponse {
	id: number;
	title: string;
	description: string;
	locked: boolean;
	time_window?: TimeWindowConfig; // Optional, may not be in response yet
	blocks?: Block[]; // BlockNote blocks, backend preserves structure
	created_at: string;
	updated_at: string;
}

type NotebooksApiResponse = NotebookApiResponse[];

/**
 * Raw notebook create payload for backend API (snake_case)
 */
interface NotebookCreateApiPayload {
	title: string;
	description: string;
	locked: boolean;
	time_window: TimeWindowConfig;
	blocks?: Block[]; // Optional initial blocks
}

/**
 * Raw notebook update payload for backend API (snake_case)
 */
interface NotebookUpdateApiPayload {
	title?: string;
	description?: string;
	locked?: boolean;
	time_window?: TimeWindowConfig;
}

/**
 * Raw block response from backend API
 * Backend returns flat structure with content dict
 */
interface BlockApiResponse {
	id: string;
	type: string;
	content: {
		props?: Record<string, any>;
		content?: any[];
		children?: Block[];
	};
	position: number;
}

type BlocksApiResponse = BlockApiResponse[];

/**
 * Convert backend API response to frontend Notebook type
 * Transforms snake_case to camelCase and number ID to string
 */
function toNotebook(apiNotebook: NotebookApiResponse): NotebookData {
	return {
		id: apiNotebook.id.toString(),
		title: apiNotebook.title,
		description: apiNotebook.description,
		locked: apiNotebook.locked,
		// Use provided time_window or default to 24h relative time
		timeWindow: apiNotebook.time_window || {
			type: "relative",
			metadata: { value: "24h" },
		},
		// BlockNote ID for local storage - use notebook ID
		blockNoteId: `notebook-${apiNotebook.id}`,
		createdAt: new Date(apiNotebook.created_at),
		updatedAt: new Date(apiNotebook.updated_at),
	};
}

/**
 * Convert frontend NotebookCreateInput to backend API payload
 * Transforms camelCase to snake_case
 */
function toNotebookCreatePayload(
	input: NotebookCreateInput,
	blocks?: Block[],
): NotebookCreateApiPayload {
	return {
		title: input.title,
		description: input.description,
		locked: input.locked,
		time_window: input.timeWindow,
		blocks: blocks,
	};
}

/**
 * Convert frontend NotebookUpdateInput to backend API payload
 * Transforms camelCase to snake_case
 */
function toNotebookUpdatePayload(
	input: NotebookUpdateInput,
): NotebookUpdateApiPayload {
	const payload: NotebookUpdateApiPayload = {};

	if (input.title !== undefined) payload.title = input.title;
	if (input.description !== undefined) payload.description = input.description;
	if (input.locked !== undefined) payload.locked = input.locked;
	if (input.timeWindow !== undefined) payload.time_window = input.timeWindow;

	return payload;
}

const Notebooks = {
	/**
	 * Get all notebooks
	 */
	getAll: () => {
		return NotebooksAPI.get<NotebooksApiResponse>("notes/", {
			meta: { action: "fetch", resource: "notebooks" },
		});
	},

	/**
	 * Get a single notebook by ID
	 */
	getById: (id: string) => {
		return NotebooksAPI.get<NotebookApiResponse>(`notes/${id}/`, {
			meta: { action: "fetch", resource: "notebook" },
		});
	},

	/**
	 * Create a new notebook
	 * Optionally include initial blocks
	 */
	create: (input: NotebookCreateInput, blocks?: Block[]) => {
		const payload = toNotebookCreatePayload(input, blocks);
		return NotebooksAPI.post<NotebookApiResponse>("notes/", {
			data: payload,
			meta: { action: "create", resource: "notebook" },
		});
	},

	/**
	 * Update an existing notebook
	 */
	update: (id: string, input: NotebookUpdateInput) => {
		const payload = toNotebookUpdatePayload(input);
		return NotebooksAPI.put<NotebookApiResponse>(`notes/${id}/`, {
			data: payload,
			meta: { action: "update", resource: "notebook" },
		});
	},

	/**
	 * Delete a notebook
	 */
	delete: (id: string) => {
		return NotebooksAPI.delete<void>(`notes/${id}/`, {
			meta: { action: "delete", resource: "notebook" },
		});
	},

	/**
	 * Lock a notebook (prevent edits)
	 */
	lock: (id: string) => {
		return NotebooksAPI.post<NotebookApiResponse>(`notes/${id}/lock/`, {
			meta: { action: "lock", resource: "notebook" },
		});
	},

	/**
	 * Unlock a notebook (allow edits)
	 */
	unlock: (id: string) => {
		return NotebooksAPI.post<NotebookApiResponse>(`notes/${id}/unlock/`, {
			meta: { action: "unlock", resource: "notebook" },
		});
	},
};

const Blocks = {
	/**
	 * Get all blocks for a notebook
	 * Returns blocks in BlockNote format
	 */
	getAll: async (notebookId: string) => {
		const response = await NotebooksAPI.get<BlocksApiResponse>(`notes/${notebookId}/blocks/`, {
			meta: { action: "fetch", resource: "blocks" },
		});

		// Transform backend blocks to BlockNote format
		return {
			...response,
			data: response.data.map(apiPayloadToBlock),
		};
	},

	/**
	 * Create a new block
	 * Accepts BlockNote block and transforms it for the backend
	 */
	create: async (notebookId: string, block: Block, position: number) => {
		const payload = blockToApiPayload(block, position);

		const response = await NotebooksAPI.post<BlockApiResponse>(`notes/${notebookId}/blocks/`, {
			data: payload,
			meta: { action: "create", resource: "block" },
		});

		// Transform response back to BlockNote format
		return {
			...response,
			data: apiPayloadToBlock(response.data),
		};
	},

	/**
	 * Update an existing block
	 * Accepts BlockNote block and transforms it for the backend
	 */
	update: async (notebookId: string, blockId: string, block: Block, position: number) => {
		const payload = blockToApiPayload(block, position);

		const response = await NotebooksAPI.put<BlockApiResponse>(
			`notes/${notebookId}/blocks/${blockId}/`,
			{
				data: {
					type: payload.type,
					content: payload.content,
					position: payload.position,
				},
				meta: { action: "update", resource: "block" },
			},
		);

		// Transform response back to BlockNote format
		return {
			...response,
			data: apiPayloadToBlock(response.data),
		};
	},

	/**
	 * Delete a block
	 */
	delete: (notebookId: string, blockId: string) => {
		return NotebooksAPI.delete<void>(`notes/${notebookId}/blocks/${blockId}/`, {
			meta: { action: "delete", resource: "block" },
		});
	},

	/**
	 * Update multiple blocks at once (batch update)
	 * Useful for drag-and-drop reordering or bulk updates
	 * Accepts BlockNote blocks and transforms them for the backend
	 */
	updateBatch: async (
		notebookId: string,
		blocks: Array<Block & { position: number }>,
	) => {
		// Transform BlockNote blocks to backend format
		const payload = blocks.map((block) => blockToApiPayload(block, block.position));

		const response = await NotebooksAPI.put<BlocksApiResponse>(
			`notes/${notebookId}/blocks/batch/`,
			{
				data: { blocks: payload },
				meta: { action: "update", resource: "blocks" },
			},
		);

		// Transform response back to BlockNote format
		return {
			...response,
			data: response.data.map(apiPayloadToBlock),
		};
	},
};

export { NotebooksAPI, Notebooks, Blocks, toNotebook };
export type {
	NotebookApiResponse,
	NotebookCreateApiPayload,
	NotebookUpdateApiPayload,
	BlockApiResponse,
};
