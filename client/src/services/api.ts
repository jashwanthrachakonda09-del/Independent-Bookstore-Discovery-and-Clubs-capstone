const API_BASE = "/api";

/**
 * Universal JSON fetch helper handling cookies and tokens.
 */
async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("session_token");

  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || `Request failed with status ${response.status}`;
    const error: any = new Error(errorMsg);
    error.status = response.status;
    error.code = data.code;
    throw error;
  }

  return data;
}

export const api = {
  // --- AUTH ---
  register: (payload: any) => fetchApi<any>("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  verifyEmail: (token: string) => fetchApi<any>("/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) }),
  login: (payload: any) => fetchApi<any>("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  getMe: () => fetchApi<any>("/auth/me"),
  logout: () => fetchApi<any>("/auth/logout", { method: "POST" }),
  forgotPassword: (email: string) => fetchApi<any>("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
  resetPassword: (payload: any) => fetchApi<any>("/auth/reset-password", { method: "POST", body: JSON.stringify(payload) }),
  changePassword: (payload: any) => fetchApi<any>("/auth/change-password", { method: "POST", body: JSON.stringify(payload) }),

  // --- BOOKS & DISCOVERY ---
  getBooks: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") query.append(k, String(v));
    });
    return fetchApi<any>(`/books?${query.toString()}`);
  },
  getBook: (id: string) => fetchApi<any>(`/books/${id}`),
  updateStock: (id: string, payload: any) => fetchApi<any>(`/books/${id}/stock`, { method: "PATCH", body: JSON.stringify(payload) }),

  // --- RESERVATIONS ---
  reserveBook: (bookId: string, payload: any) =>
    fetchApi<any>(`/books/${bookId}/reservations`, { method: "POST", body: JSON.stringify(payload) }),
  getReservations: () => fetchApi<any>("/reservations"),
  getReservation: (id: string) => fetchApi<any>(`/reservations/${id}`),
  cancelReservation: (id: string, reason?: string) =>
    fetchApi<any>(`/reservations/${id}/cancel`, { method: "POST", body: JSON.stringify({ reason }) }),
  collectReservation: (id: string) =>
    fetchApi<any>(`/reservations/${id}/collection`, { method: "POST", body: JSON.stringify({}) }),

  // --- READING LISTS ---
  getReadingLists: () => fetchApi<any>("/reading-lists"),
  createReadingList: (payload: any) => fetchApi<any>("/reading-lists", { method: "POST", body: JSON.stringify(payload) }),
  getReadingList: (id: string) => fetchApi<any>(`/reading-lists/${id}`),
  addBookToList: (listId: string, payload: any) =>
    fetchApi<any>(`/reading-lists/${listId}/books`, { method: "POST", body: JSON.stringify(payload) }),
  removeBookFromList: (listId: string, bookId: string) =>
    fetchApi<any>(`/reading-lists/${listId}/books/${bookId}`, { method: "DELETE" }),
  deleteReadingList: (id: string) => fetchApi<any>(`/reading-lists/${id}`, { method: "DELETE" }),

  // --- READING PROGRESS ---
  getProgress: (bookId?: string) => fetchApi<any>(`/reading-progress${bookId ? `?bookId=${bookId}` : ""}`),
  updateProgress: (payload: any) => fetchApi<any>("/reading-progress", { method: "PATCH", body: JSON.stringify(payload) }),

  // --- CLUBS ---
  getClubs: () => fetchApi<any>("/clubs"),
  getClub: (id: string) => fetchApi<any>(`/clubs/${id}`),
  createClub: (payload: any) => fetchApi<any>("/clubs", { method: "POST", body: JSON.stringify(payload) }),
  joinClub: (id: string) => fetchApi<any>(`/clubs/${id}/join`, { method: "POST" }),
  leaveClub: (id: string) => fetchApi<any>(`/clubs/${id}/leave`, { method: "POST" }),
  getClubMeetings: (id: string) => fetchApi<any>(`/clubs/${id}/meetings`),
  createMeeting: (clubId: string, payload: any) =>
    fetchApi<any>(`/clubs/${clubId}/meetings`, { method: "POST", body: JSON.stringify(payload) }),
  getClubDiscussions: (id: string) => fetchApi<any>(`/clubs/${id}/discussions`),
  createDiscussion: (clubId: string, payload: any) =>
    fetchApi<any>(`/clubs/${clubId}/discussions`, { method: "POST", body: JSON.stringify(payload) }),
  moderateDiscussion: (id: string, payload: any) =>
    fetchApi<any>(`/discussions/${id}/moderation`, { method: "PATCH", body: JSON.stringify(payload) }),
  runClubAgent: (clubId: string, query: string) =>
    fetchApi<any>(`/clubs/${clubId}/book-selection`, { method: "POST", body: JSON.stringify({ query }) }),
  confirmClubBookSelection: (clubId: string, payload: any) =>
    fetchApi<any>(`/clubs/${clubId}/book-selection/confirm`, { method: "POST", body: JSON.stringify(payload) }),

  // --- BOOKSELLER ---
  getBooksellerInventory: () => fetchApi<any>("/bookseller/inventory"),
  getBooksellerReservations: () => fetchApi<any>("/bookseller/reservations"),
  getBooksellerStore: () => fetchApi<any>("/bookseller/store"),
  updateStorePolicy: (payload: any) => fetchApi<any>("/bookseller/policy", { method: "POST", body: JSON.stringify(payload) }),

  // --- ADMIN ---
  updateStaffRole: (userId: string, payload: any) =>
    fetchApi<any>(`/admin/users/${userId}/staff-role`, { method: "PATCH", body: JSON.stringify(payload) }),
  getAuditLogs: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v && q.append(k, String(v)));
    return fetchApi<any>(`/admin/audit-logs?${q.toString()}`);
  },
  getSystemHealth: () => fetchApi<any>("/admin/system-health"),

  // --- CHAT & RAG ---
  sendBookChat: (payload: any) => fetchApi<any>("/book-chat", { method: "POST", body: JSON.stringify(payload) }),
  getConversations: () => fetchApi<any>("/book-chat/conversations"),
  getConversation: (id: string) => fetchApi<any>(`/book-chat/conversations/${id}`),

  // --- DOCUMENTS ---
  uploadDocument: (formData: FormData) => fetchApi<any>("/documents/upload", { method: "POST", body: formData }),
  getDocuments: () => fetchApi<any>("/documents"),
  retryDocument: (id: string) => fetchApi<any>(`/documents/${id}/retry`, { method: "POST" }),
};
