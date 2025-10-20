import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import Notebook from "@/app/components/Notebook";
import { useNotebooks } from "@/app/components/notebooks-context";
import { notebookStorage } from "@/lib/notebook-storage";
import type { NotebookData } from "@/lib/notebook-types";

export default function NotebookById() {
	const { id } = useParams<{ id: string }>();
	const [notebook, setNotebook] = useState<NotebookData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const { refreshNotebooks, setCurrentNotebookId } = useNotebooks();

	const loadNotebook = () => {
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
	};

	useEffect(() => {
		loadNotebook();

		return () => {
			setCurrentNotebookId(undefined);
		};
	}, [id, setCurrentNotebookId]);

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
