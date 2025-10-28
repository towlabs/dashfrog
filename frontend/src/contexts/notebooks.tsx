import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { Notebooks, toNotebook } from "@/src/services/api/notebooks";
import type {
	NotebookData,
	NotebookDataWithContent,
} from "@/src/types/notebook";

interface NotebooksContextValue {
	notebooks: NotebookData[];
	isLoading: boolean;
	error: string | null;
	refresh: () => Promise<void>;
	createNotebook: () => Promise<NotebookData>;
	updateNotebook: (
		uuid: string,
		updates: Partial<NotebookDataWithContent>,
	) => void;
	deleteNotebook: (id: string) => Promise<void>;
}

const NotebooksContext = createContext<NotebooksContextValue | undefined>(
	undefined,
);

export function NotebooksProvider({ children }: { children: ReactNode }) {
	const [notebooks, setNotebooks] = useState<NotebookData[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Debounce timer for notebook updates
	const updateTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
	// Store accumulated pending updates per notebook to send complete state
	const pendingUpdatesRef = useRef<
		Map<string, Partial<NotebookDataWithContent>>
	>(new Map());

	// Cleanup timers on unmount
	useEffect(() => {
		return () => {
			for (const timer of updateTimersRef.current.values()) {
				clearTimeout(timer);
			}
			updateTimersRef.current.clear();
			pendingUpdatesRef.current.clear();
		};
	}, []);

	const refresh = useCallback(async () => {
		setIsLoading(true);
		setError(null);
		try {
			const response = await Notebooks.getAll();
			const notebooksData = response.data.map(toNotebook);
			setNotebooks(notebooksData);
		} catch (err) {
			console.error("Failed to fetch notebooks:", err);
			setError("Failed to load notebooks");
			setNotebooks([]);
		} finally {
			setIsLoading(false);
		}
	}, []);

	// Load notebooks on mount
	useEffect(() => {
		void refresh();
	}, [refresh]);

	/**
	 * Create a new notebook and update local state
	 */
	const createNotebook = async () => {
		try {
			const notebook: NotebookData = {
				uuid: uuidv4(),
				title: "Untitled",
				description: null,
				locked: false,
				timeWindow: {
					type: "relative",
					metadata: { value: "24h" },
				},
			};
			setNotebooks((prev) => [notebook, ...prev]);
			await Notebooks.create(notebook);
			return notebook;
		} catch (err) {
			console.error("Failed to create notebook:", err);
			setError("Failed to create notebook");
			throw err;
		}
	};

	/**
	 * Update an existing notebook
	 * - Updates local state immediately for instant UI feedback
	 * - Accumulates all changes in a pending state
	 * - Debounces backend sync (500ms) and sends complete accumulated state
	 * - Pushes the entire notebook data to backend
	 */
	const updateNotebook = useCallback(
		(uuid: string, updates: Partial<NotebookDataWithContent>) => {
			// Accumulate updates - merge with existing pending updates for this notebook
			const existingPending = pendingUpdatesRef.current.get(uuid) || {};
			const mergedUpdates = { ...existingPending, ...updates };
			pendingUpdatesRef.current.set(uuid, mergedUpdates);

			// Update local state immediately for instant UI feedback
			setNotebooks((prev) =>
				prev.map((nb) => {
					if (nb.uuid === uuid) {
						// Extract non-NotebookData fields like blocknote (it's sent to backend but not stored in list)
						// biome-ignore lint/correctness/noUnusedVariables: blocknote is intentionally excluded from local state
						const { blocknote, ...notebookFields } = updates;
						return { ...nb, ...notebookFields };
					}
					return nb;
				}),
			);

			// Clear any existing timer for this notebook
			const existingTimer = updateTimersRef.current.get(uuid);
			if (existingTimer) {
				clearTimeout(existingTimer);
			}

			// Debounce backend sync (500ms)
			const timer = setTimeout(async () => {
				try {
					setError(null);
					// Get all accumulated updates for this notebook
					const accumulatedUpdates = pendingUpdatesRef.current.get(uuid);
					if (accumulatedUpdates) {
						// Push entire accumulated state to backend
						await Notebooks.update(uuid, accumulatedUpdates);
						// Clear pending updates after successful sync
						pendingUpdatesRef.current.delete(uuid);
					}
					updateTimersRef.current.delete(uuid);
				} catch (err) {
					console.error("Failed to update notebook:", err);
					setError("Failed to update notebook");
					// Keep pending updates on error so they can be retried
				}
			}, 500);

			updateTimersRef.current.set(uuid, timer);
		},
		[],
	);

	/**
	 * Delete a notebook and update local state
	 */
	const deleteNotebook = async (uuid: string): Promise<void> => {
		try {
			setError(null);
			await Notebooks.delete(uuid);

			// Update local state immediately
			setNotebooks((prev) => prev.filter((nb) => nb.uuid !== uuid));
		} catch (err) {
			console.error("Failed to delete notebook:", err);
			setError("Failed to delete notebook");
			throw err;
		}
	};

	return (
		<NotebooksContext.Provider
			value={{
				notebooks,
				isLoading,
				error,
				refresh,
				createNotebook,
				updateNotebook,
				deleteNotebook,
			}}
		>
			{children}
		</NotebooksContext.Provider>
	);
}

export function useNotebooks() {
	const context = useContext(NotebooksContext);
	if (context === undefined) {
		throw new Error("useNotebooks must be used within a NotebooksProvider");
	}
	return context;
}
