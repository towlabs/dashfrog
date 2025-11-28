import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/src/stores/auth";

interface ProtectedRouteProps {
	children: React.ReactNode;
}

/**
 * Route guard component that redirects to login if user is not authenticated
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

	if (!isAuthenticated) {
		// Redirect to login page if not authenticated
		return <Navigate to="/login" replace />;
	}

	// Render children if authenticated
	return <>{children}</>;
}
