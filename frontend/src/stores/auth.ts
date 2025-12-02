import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

interface AuthState {
	isAuthenticated: boolean;
	username: string | null;
	token: string | null;
	login: (username: string, token: string) => void;
	logout: () => void;
}

export const useAuthStore = create<AuthState>()(
	devtools(
		persist(
			(set, _get) => ({
				isAuthenticated: false,
				username: null,
				token: null,
				login: (username: string, token: string) => {
					set({ isAuthenticated: true, username, token });
				},
				logout: () => {
					set({ isAuthenticated: false, username: null, token: null });
					localStorage.removeItem("auth_token");
					localStorage.removeItem("username");
				},
			}),
			{
				name: "auth-storage",
			},
		),
		{ name: "auth" },
	),
);
