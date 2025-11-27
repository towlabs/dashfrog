import * as React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import "@/src/globals.css";
import LayoutClient from "@/components/LayoutClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/src/routes/Home";
import Login from "@/src/routes/Login";
import Notebook from "@/src/routes/Notebook";
import Tenant from "@/src/routes/Tenant";
import { ProtectedRoute } from "./components/ProtectedRoute";

const router = createBrowserRouter([
	{
		path: "/login",
		element: <Login />,
	},
	{
		path: "/",
		element: (
			<ProtectedRoute>
				<LayoutClient>
					<Home />
				</LayoutClient>
			</ProtectedRoute>
		),
	},
	{
		path: "/tenants/:tenant",
		element: (
			<ProtectedRoute>
				<LayoutClient>
					<Tenant />
				</LayoutClient>
			</ProtectedRoute>
		),
	},
	{
		path: "/tenants/:tenant/notebooks/:notebookId",
		element: (
			<ProtectedRoute>
				<LayoutClient>
					<Notebook />
				</LayoutClient>
			</ProtectedRoute>
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
