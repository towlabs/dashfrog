import { useCallback, useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import Notebook from "@/components/Notebook";
import { useNotebooks } from "@/src/contexts/notebooks";
import { notebookStorage } from "@/src/services/api/notebook";
import type { NotebookData } from "@/src/types/notebook";

export default function NotebookById() {
	const { id } = useParams<{ id: string }>();
	const [notebook, setNotebook] = useState<NotebookData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const { refreshNotebooks, setCurrentNotebookId } = useNotebooks();

	const loadNotebook = useCallback(() => {
		if (!id) return;

		setIsLoading(true);
		try {
			// Load notebook from storage
			const loaded = notebookStorage.load(id);
			if (loaded) {
				setNotebook(loaded);
				setCurrentNotebookId(id);
			}
		} finally {
			setIsLoading(false);
		}
	}, [id, setCurrentNotebookId]);

	useEffect(() => {
		loadNotebook();

		return () => {
			setCurrentNotebookId(undefined);
		};
	}, [loadNotebook, setCurrentNotebookId]);

	const handleUpdate = () => {
		// Reload the notebook from storage and refresh the sidebar
		loadNotebook();
		refreshNotebooks();
	};

	if (!id) {
		return <Navigate to="/" />;
	}

	return (
		<Notebook
			notebook={notebook}
			isLoading={isLoading}
			onUpdate={handleUpdate}
		/>
	);
}
