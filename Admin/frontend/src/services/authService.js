// src/services/authService.js
import axios from "axios";

const api = axios.create({ baseURL: "/api", timeout: 15000 });

// ── Interceptor: añade Bearer token a cada request ────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Interceptor: maneja token expirado con refresh ────────────
let isRefreshing = false;
let failedQueue  = [];

function processQueue(error, token = null) {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token));
  failedQueue = [];
}

api.interceptors.response.use(
  r => r,
  async (error) => {
    const originalReq = error.config;

    if (
      error.response?.status === 401 &&
      error.response?.data?.code === "TOKEN_EXPIRED" &&
      !originalReq._retry
    ) {
      originalReq._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalReq.headers.Authorization = `Bearer ${token}`;
          return api(originalReq);
        });
      }

      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) throw new Error("No refresh token");

        const { data } = await axios.post("/api/auth/refresh", { refreshToken });
        localStorage.setItem("accessToken", data.accessToken);
        api.defaults.headers.Authorization = `Bearer ${data.accessToken}`;
        processQueue(null, data.accessToken);
        originalReq.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalReq);
      } catch (err) {
        processQueue(err, null);
        authService.logout();
        window.location.href = "/login";
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ──────────────────────────────────────────────
const authService = {
  /** Login: guarda tokens y devuelve el usuario */
  async login(username, password) {
    const { data } = await api.post("/auth/login", { username, password });
    localStorage.setItem("accessToken",  data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("user",         JSON.stringify(data.user));
    return data.user;
  },

  /** Cierra sesión y limpia storage */
  logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
  },

  /** Devuelve el usuario guardado localmente */
  getLocalUser() {
    try { return JSON.parse(localStorage.getItem("user") || "null"); }
    catch { return null; }
  },

  /** Obtiene los datos frescos del usuario desde la API */
  async getMe() {
    const { data } = await api.get("/auth/me");
    return data;
  },

  /** Valida y restaura la sesión si el token es aún válido */
  async restoreSession() {
    const token = localStorage.getItem("accessToken");
    if (!token) return null;

    try {
      const user = await this.getMe();
      localStorage.setItem("user", JSON.stringify(user));
      return user;
    } catch (error) {
      // Si falla, podría ser un error temporal. No limpiar sesión automáticamente
      throw error;
    }
  },

  /** Solicita email de recuperación */
  async forgotPassword(email) {
    const { data } = await api.post("/auth/forgot-password", { email });
    return data;
  },

  /** Restablece contraseña con el token del email */
  async resetPassword(token, newPassword) {
    const { data } = await api.post("/auth/reset-password", { token, newPassword });
    return data;
  },

  /** Cambia contraseña del usuario logueado */
  async changePassword(currentPassword, newPassword) {
    const { data } = await api.post("/auth/change-password", { currentPassword, newPassword });
    return data;
  },

  /** Inicializa contraseñas en desarrollo */
  async seedPasswords(password) {
    const { data } = await api.post("/auth/seed-passwords", { password });
    return data;
  },

  /** Verifica si hay sesión activa */
  isAuthenticated() {
    return !!localStorage.getItem("accessToken");
  },
};

export { api };
export default authService;