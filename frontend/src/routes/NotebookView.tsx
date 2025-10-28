import { Navigate, useParams } from "react-router-dom";
import Notebook from "@/components/Notebook";

export default function NotebookView() {
	const { viewId } = useParams<{ viewId: string }>();

	if (!viewId) {
		return <Navigate to="/" />;
	}

	// Render notebook without any layout
	return <Notebook notebookUuid={viewId} isView={true} />;
}
