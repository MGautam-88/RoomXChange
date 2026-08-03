import axios from "axios";

const STORAGE_KEY = "roomxchange-auth";

const api = axios.create({
	baseURL: import.meta.env.VITE_API_URL || "http://localhost:5500/api",
	withCredentials: true,
});

api.interceptors.request.use((config) => {
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored) {
		try {
			const { token } = JSON.parse(stored);
			if (token) {
				config.headers.Authorization = `Bearer ${token}`;
			}
		} catch {
			localStorage.removeItem(STORAGE_KEY);
		}
	}
	return config;
});

api.interceptors.response.use(
	(response) => response,
	(error) => {
		if (
			error.response &&
			(error.response.status === 401 ||
				(error.response.status === 404 && error.response.data?.message?.includes("User not found")))
		) {
			localStorage.removeItem(STORAGE_KEY);
			if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
				window.location.assign("/login");
			}
		}
		return Promise.reject(error);
	}
);

export default api;