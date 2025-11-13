import * as React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import "@/src/globals.css";
import LayoutClient from "@/components/LayoutClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/src/routes/Home";
import Notebook from "@/src/routes/Notebook";
import Tenant from "@/src/routes/Tenant";

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
		path: "/tenants/:tenant",
		element: (
			<LayoutClient>
				<Tenant />
			</LayoutClient>
		),
	},
	{
		path: "/tenants/:tenant/notebooks/:notebookId",
		element: (
			<LayoutClient>
				<Notebook />
			</LayoutClient>
		),
	},
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<TooltipProvider delayDuration={200}>
			<RouterProvider router={router} />
		</TooltipProvider>
	</React.StrictMode>,
);
