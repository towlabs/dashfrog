"use client";

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import BlockNoteEditor from "@/components/BlockNoteEditor";
import { Notebooks } from "@/src/services/api/notebooks";
import type { Notebook } from "@/src/types/notebook";
import { useTenantStore } from "../stores/tenant";
import { useNotebooksStore } from "../stores/notebooks";

export default function NotebookView() {
	const { tenant, notebookId } = useParams<{
		tenant: string;
		notebookId: string;
	}>();

	const setCurrentTenant = useTenantStore((state) => state.setCurrentTenant);
	const setCurrentNotebook = useNotebooksStore(
		(state) => state.setCurrentNotebook,
	);
	const currentNotebook = useNotebooksStore((state) => state.currentNotebook);

	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const tenantName = tenant ? decodeURIComponent(tenant) : "";

	useEffect(() => {
		const fetchNotebook = async () => {
			if (!tenantName || !notebookId) return;

			setLoading(true);
			setError(null);

			try {
				const notebook = await Notebooks.getOne(notebookId);

				if (!notebook) {
					setError("Notebook not found");
					return;
				}
				setCurrentTenant(tenantName);
				setCurrentNotebook(tenantName, undefined, notebook);
			} catch (err) {
				console.error("Failed to fetch notebook:", err);
				setError("Failed to load notebook");
			} finally {
				setLoading(false);
			}
		};

		void fetchNotebook();
	}, [tenantName, notebookId, setCurrentNotebook, setCurrentTenant]);

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="mx-auto py-12">
					<div className="mx-32 space-y-4">
						{/* Title skeleton */}
						<div className="h-7 w-3/4 bg-muted rounded-lg animate-pulse" />
						{/* Description skeleton */}
						<div className="h-7 w-1/2 bg-muted rounded-lg animate-pulse" />
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<h1 className="text-2xl font-bold mb-2">Error</h1>
					<p className="text-muted-foreground">{error}</p>
				</div>
			</div>
		);
	}

	if (!currentNotebook) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-lg text-muted-foreground">Notebook not found</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen">
			<BlockNoteEditor
				tenantName={tenantName}
				notebook={currentNotebook}
				editable={false}
				openBlockSettings={() => {}} // No-op for readonly view
				updateNotebook={() => {}} // No-op for readonly view
			/>
		</div>
	);
}
