import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Auth } from "@/src/services/api/auth";
import { useAuthStore } from "@/src/stores/auth";

export default function Login() {
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();
	const login = useAuthStore((state) => state.login);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		try {
			// Validate inputs
			if (!username || !password) {
				setError("Please enter both username and password");
				return;
			}

			// Call authentication API
			const response = await Auth.login(username, password);

			// Update auth store with token
			login(username, response.access_token);

			// Navigate to home page
			navigate("/");
		} catch (err) {
			// Handle authentication errors
			if (err instanceof Error) {
				setError(err.message);
			} else {
				setError("An error occurred during login");
			}
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-background p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="space-y-1">
					<CardTitle className="text-2xl font-bold">Login</CardTitle>
					<CardDescription>
						Enter your credentials to access Dashfrog
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="username">Username</Label>
							<Input
								id="username"
								type="text"
								placeholder="Enter your username"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								disabled={loading}
								autoComplete="username"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="password">Password</Label>
							<Input
								id="password"
								type="password"
								placeholder="Enter your password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								disabled={loading}
								autoComplete="current-password"
							/>
						</div>
						{error && (
							<div className="text-sm text-red-500 font-medium">{error}</div>
						)}
						<Button type="submit" className="w-full" disabled={loading}>
							{loading ? "Logging in..." : "Login"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
