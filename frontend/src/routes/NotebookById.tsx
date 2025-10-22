import { useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import Notebook from "@/components/Notebook";
import { useNotebooks } from "@/src/contexts/notebooks";

export default function NotebookById() {
	const { id } = useParams<{ id: string }>();
	const {
		getNotebook,
		refreshNotebooks,
		setCurrentNotebookId,
		isLoading,
	} = useNotebooks();

	const notebook = id ? getNotebook(id) : null;

	useEffect(() => {
		if (id) {
			setCurrentNotebookId(id);
		}

		return () => {
			setCurrentNotebookId(undefined);
		};
	}, [id, setCurrentNotebookId]);

	const handleUpdate = () => {
		// Refresh notebooks from backend
		void refreshNotebooks();
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
