import { Navigate, useParams } from "react-router-dom";
import Notebook from "@/components/Notebook";

export default function NotebookById() {
	const { uuid } = useParams<{ uuid: string }>();

	if (!uuid) {
		return <Navigate to="/" />;
	}

	return <Notebook notebookUuid={uuid} />;
}
