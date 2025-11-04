import * as React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import "@/src/globals.css";
import LayoutClient from "@/components/LayoutClient";
import Home from "@/src/routes/Home";
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
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<RouterProvider router={router} />
	</React.StrictMode>,
);
