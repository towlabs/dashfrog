import * as React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import "@/src/globals.css";
import LayoutClient from "@/components/LayoutClient";
import CatalogPage from "@/src/routes/Catalog";
import EventsPage from "@/src/routes/Events";
import Home from "@/src/routes/Home";
import LabelsPage from "@/src/routes/Labels";
import NotebookById from "@/src/routes/NotebookById";
import NotebookView from "@/src/routes/NotebookView";

const router = createBrowserRouter([
	{
		path: "/",
		element: (
			<LayoutClient>
				<Home />
			</LayoutClient>
		),
	},
	{
		path: "/events",
		element: (
			<LayoutClient>
				<EventsPage />
			</LayoutClient>
		),
	},
	{
		path: "/notebook/:uuid",
		element: (
			<LayoutClient>
				<NotebookById />
			</LayoutClient>
		),
	},
	{ path: "/view/:viewId", element: <NotebookView /> },
	{
		path: "/catalog",
		element: (
			<LayoutClient>
				<CatalogPage />
			</LayoutClient>
		),
	},
	{
		path: "/labels",
		element: (
			<LayoutClient>
				<LabelsPage />
			</LayoutClient>
		),
	},
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<RouterProvider router={router} />
	</React.StrictMode>,
);
