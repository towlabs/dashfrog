import type { Block } from "@blocknote/core";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { Notebooks, toNotebook } from "@/src/services/api/notebooks";
import type {
	NotebookCreateInput,
	NotebookData,
	NotebookUpdateInput,
} from "@/src/types/notebook";

interface NotebooksContextValue {
	notebooks: NotebookData[];
	isLoading: boolean;
	error: string | null;
	refreshNotebooks: () => Promise<void>;
	getNotebook: (id: string) => NotebookData | null;
	createNotebook: (
		input: NotebookCreateInput,
		blocks?: Block[],
	) => Promise<NotebookData>;
	updateNotebook: (
		id: string,
		input: NotebookUpdateInput,
	) => Promise<NotebookData>;
	deleteNotebook: (id: string) => Promise<void>;
	currentNotebookId: string | undefined;
	setCurrentNotebookId: (id: string | undefined) => void;
}

const NotebooksContext = createContext<NotebooksContextValue | undefined>(
	undefined,
);

export function NotebooksProvider({ children }: { children: ReactNode }) {
	const [notebooks, setNotebooks] = useState<NotebookData[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [currentNotebookId, setCurrentNotebookId] = useState<
		string | undefined
	>(undefined);

	const refreshNotebooks = useCallback(async () => {
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
		void refreshNotebooks();
	}, [refreshNotebooks]);

	const getNotebook = useCallback(
		(id: string) => {
			return notebooks.find((nb) => nb.id === id) || null;
		},
		[notebooks],
	);

	/**
	 * Create a new notebook and update local state
	 */
	const createNotebook = async (
		input: NotebookCreateInput,
		blocks?: Block[],
	): Promise<NotebookData> => {
		try {
			setError(null);
			const response = await Notebooks.create(input, blocks);
			const newNotebook = toNotebook(response.data);

			// Update local state immediately
			setNotebooks((prev) => [newNotebook, ...prev]);

			return newNotebook;
		} catch (err) {
			console.error("Failed to create notebook:", err);
			setError("Failed to create notebook");
			throw err;
		}
	};

	/**
	 * Update an existing notebook and update local state
	 */
	const updateNotebook = async (
		id: string,
		input: NotebookUpdateInput,
	): Promise<NotebookData> => {
		try {
			setError(null);
			const response = await Notebooks.update(id, input);
			const updatedNotebook = toNotebook(response.data);

			// Update local state immediately
			setNotebooks((prev) =>
				prev.map((nb) => (nb.id === id ? updatedNotebook : nb)),
			);

			return updatedNotebook;
		} catch (err) {
			console.error("Failed to update notebook:", err);
			setError("Failed to update notebook");
			throw err;
		}
	};

	/**
	 * Delete a notebook and update local state
	 */
	const deleteNotebook = async (id: string): Promise<void> => {
		try {
			setError(null);
			await Notebooks.delete(id);

			// Update local state immediately
			setNotebooks((prev) => prev.filter((nb) => nb.id !== id));

			// Clear current notebook if it was deleted
			if (currentNotebookId === id) {
				setCurrentNotebookId(undefined);
			}
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
				refreshNotebooks,
				getNotebook,
				createNotebook,
				updateNotebook,
				deleteNotebook,
				currentNotebookId,
				setCurrentNotebookId,
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
