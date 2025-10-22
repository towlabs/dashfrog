import { Navigate, useParams } from "react-router-dom";
import Notebook from "@/components/Notebook";
import { useNotebooks } from "@/src/contexts/notebooks";

export default function NotebookView() {
	const { viewId } = useParams<{ viewId: string }>();
	const { getNotebook, isLoading } = useNotebooks();

	// For now, viewId is the same as notebook ID
	// In the future, this could be a separate public view endpoint
	const notebook = viewId ? getNotebook(viewId) : null;

	if (!viewId) {
		return <Navigate to="/" />;
	}

	// Render notebook without any layout
	return <Notebook notebook={notebook} isLoading={isLoading} isView={true} />;
}
