const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const api = {
  async getHealth() {
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2000) });
      return res.ok;
    } catch {
      return false;
    }
  },

  async createResearch({ question, constraints }) {
    const res = await fetch(`${API_BASE}/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, constraints }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create research session');
    return data.data;
  },

  async getResearch(id) {
    const res = await fetch(`${API_BASE}/research/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch research session');
    return data.data;
  },

  async getTasks(id) {
    const res = await fetch(`${API_BASE}/research/${id}/tasks`);
    const data = await res.json();
    return res.ok ? data.data : [];
  },

  async getEvidence(id) {
    const res = await fetch(`${API_BASE}/research/${id}/evidence`);
    const data = await res.json();
    return res.ok ? data.data : [];
  },

  async getToolCalls(id) {
    const res = await fetch(`${API_BASE}/research/${id}/tool-calls`);
    const data = await res.json();
    return res.ok ? data.data : [];
  },

  async getReport(id) {
    const res = await fetch(`${API_BASE}/research/${id}/report`);
    const data = await res.json();
    return res.ok ? data.data : null;
  },

  async getActivity(id) {
    const res = await fetch(`${API_BASE}/research/${id}/activity`);
    const data = await res.json();
    return res.ok ? data.data : null;
  },
};
