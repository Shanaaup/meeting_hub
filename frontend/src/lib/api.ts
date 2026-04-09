import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Auto-attach JWT token
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auto-redirect on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (!window.location.pathname.startsWith("/auth")) {
        window.location.href = "/auth/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;

/* ── Auth ─────────────────────────── */
export const authApi = {
  register: (data: { email: string; full_name: string; password: string }) =>
    api.post("/auth/register", data),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),
  me: () => api.get("/auth/me"),
};

/* ── Meetings ────────────────────── */
export const meetingsApi = {
  list: (project?: string) =>
    api.get("/meetings", { params: project ? { project } : {} }),
  stats: () => api.get("/meetings/stats"),
  get: (id: number) => api.get(`/meetings/${id}`),
  delete: (id: number) => api.delete(`/meetings/${id}`),
  upload: (files: File[], projectName: string) => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    form.append("project_name", projectName);
    return api.post("/meetings/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

/* ── Analysis ────────────────────── */
export const analysisApi = {
  extract: (meetingId: number) =>
    api.post(`/analysis/${meetingId}/extract`),
  getDecisions: (meetingId: number) =>
    api.get(`/analysis/${meetingId}/decisions`),
  getActions: (meetingId: number) =>
    api.get(`/analysis/${meetingId}/actions`),
  runSentiment: (meetingId: number) =>
    api.post(`/analysis/${meetingId}/sentiment`),
  getSentiment: (meetingId: number) =>
    api.get(`/analysis/${meetingId}/sentiment`),
  exportCsv: (meetingId: number) =>
    api.get(`/analysis/${meetingId}/export/csv`, { responseType: "blob" }),
  exportPdf: (meetingId: number) =>
    api.get(`/analysis/${meetingId}/export/pdf`, { responseType: "blob" }),
  getDNA: (meetingId: number) =>
    api.get(`/analysis/${meetingId}/dna`),
};

/* ── Chat ────────────────────────── */
export const chatApi = {
  query: (question: string, meetingId?: number, history?: { role: string; content: string }[]) =>
    api.post("/chat/query", { question, meeting_id: meetingId, history }),
};
