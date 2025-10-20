import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { notebookStorage } from "@/lib/notebook-storage";
import type { NotebookData } from "@/lib/notebook-types";

interface NotebooksContextValue {
	notebooks: NotebookData[];
	isLoading: boolean;
	refreshNotebooks: () => Promise<void>;
	getNotebook: (id: string) => NotebookData | null;
	currentNotebookId: string | undefined;
	setCurrentNotebookId: (id: string | undefined) => void;
}

const NotebooksContext = createContext<NotebooksContextValue | undefined>(
	undefined,
);

export function NotebooksProvider({ children }: { children: ReactNode }) {
	const [notebooks, setNotebooks] = useState<NotebookData[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [currentNotebookId, setCurrentNotebookId] = useState<
		string | undefined
	>(undefined);

	const refreshNotebooks = useCallback(async () => {
		setIsLoading(true);
		try {
			// Currently sync, but ready for async DB call
			const loaded = notebookStorage.list();
			setNotebooks(loaded);
		} finally {
			setIsLoading(false);
		}
	}, []);

	// Load notebooks on mount
	useEffect(() => {
		refreshNotebooks();

		// Reload notebooks when window gains focus (in case another tab modified them)
		window.addEventListener("focus", refreshNotebooks);
		return () => window.removeEventListener("focus", refreshNotebooks);
	}, [refreshNotebooks]);

	const getNotebook = useCallback(
		(id: string) => {
			return notebooks.find((nb) => nb.id === id) || null;
		},
		[notebooks],
	);

	return (
		<NotebooksContext.Provider
			value={{
				notebooks,
				isLoading,
				refreshNotebooks,
				getNotebook,
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
