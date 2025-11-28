import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/src/stores/auth";

interface ProtectedRouteProps {
	children: React.ReactNode;
}

/**
 * Route guard component that redirects to login if user is not authenticated
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
	const location = useLocation();

	if (!isAuthenticated) {
		// Check if this is a notebook route
		const notebookMatch = location.pathname.match(
			/^\/tenants\/([^/]+)\/notebooks\/([^/]+)$/,
		);

		if (notebookMatch) {
			// Redirect to notebook view instead of login
			const [, tenant, notebookId] = notebookMatch;
			return (
				<Navigate to={`/view/${tenant}/notebooks/${notebookId}`} replace />
			);
		}

		// Redirect to login page for other routes
		return <Navigate to="/login" replace />;
	}

	// Render children if authenticated
	return <>{children}</>;
}
