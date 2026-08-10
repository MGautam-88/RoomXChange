/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/axios.js";

const AuthContext = createContext(null);
const STORAGE_KEY = "roomxchange-auth";

const loadStoredSession = () => {
	if (typeof window === "undefined") return { token: null, user: null };
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || { token: null, user: null };
	} catch {
		return { token: null, user: null };
	}
};

export function AuthProvider({ children }) {
	const [session, setSession] = useState(loadStoredSession);
	const ready = true;

	const persistSession = (nextSession) => {
		setSession(nextSession);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
	};

	const clearSession = () => {
		setSession({ token: null, user: null });
		localStorage.removeItem(STORAGE_KEY);
	};

	// Silently sync user session with backend on initial load to purge stale session after DB re-seeding
	useEffect(() => {
		if (session.token) {
			api.get("/auth/me")
				.then(({ data }) => {
					if (data?.user) {
						persistSession({ token: session.token, user: data.user });
					}
				})
				.catch((err) => {
					if (err.response?.status === 401 || err.response?.status === 404) {
						clearSession();
					}
				});
		}
	}, []);

	const register = useCallback(async (payload) => (await api.post("/auth/register", payload)).data, []);
	const verifyOtp = useCallback(async (payload) => {
		const { data } = await api.post("/auth/verify-signup-otp", payload);
		persistSession({ token: data.token, user: data.user });
		return data;
	}, []);
	const resendOtp = useCallback(async (payload) => (await api.post("/auth/resend-otp", payload)).data, []);
	const login = useCallback(async (payload) => {
		const { data } = await api.post("/auth/login", payload);
		persistSession({ token: data.token, user: data.user });
		return data;
	}, []);
	const forgotPassword = useCallback(async (payload) => (await api.post("/auth/forgot-password", payload)).data, []);
	const resetPassword = useCallback(async (payload) => (await api.post("/auth/reset-password", payload)).data, []);
	const logout = useCallback(() => clearSession(), []);
	const updateUser = useCallback((updatedUserData) => {
		setSession((current) => {
			const nextSession = { ...current, user: { ...current.user, ...updatedUserData } };
			localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
			return nextSession;
		});
	}, []);

	const setAuthSession = useCallback(({ token, user }) => {
		persistSession({ token, user });
	}, []);

	const value = useMemo(() => ({
		ready,
		token: session.token,
		user: session.user,
		isAuthenticated: Boolean(session.token),
		register,
		verifyOtp,
		resendOtp,
		login,
		forgotPassword,
		resetPassword,
		logout,
		updateUser,
		setAuthSession,
	}), [ready, session, register, verifyOtp, resendOtp, login, forgotPassword, resetPassword, logout, updateUser, setAuthSession]);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) throw new Error("useAuth must be used within AuthProvider");
	return context;
};