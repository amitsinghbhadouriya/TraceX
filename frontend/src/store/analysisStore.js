import { create } from 'zustand';
import { authApi, datasetApi, analysisApi, graphApi } from '../api';

const useAnalysisStore = create((set, get) => ({
  // --- Auth State ---
  user: null,
  token: localStorage.getItem('tracex_token') || null,
  authLoading: false,
  authError: null,

  // --- Datasets & Sessions ---
  datasets: [],
  selectedDataset: null,
  sessionId: null,
  datasetsLoading: false,

  // --- Analysis Status ---
  analysisRunning: false,
  analysisError: null,
  summary: null,

  // --- Graph & Visuals ---
  nodes: [],
  edges: [],
  clusters: [],
  graphLoading: false,
  graphError: null,

  // --- Entity Investigation Panel ---
  selectedEntity: null,
  selectedEntityLoading: false,

  // --- Chat Assistant ---
  chatMessages: [],
  chatLoading: false,

  // --- Auth Actions ---
  clearAuthError: () => set({ authError: null }),

  register: async (name, email, password, role = 'investigator') => {
    set({ authLoading: true, authError: null });
    try {
      const res = await authApi.register(name, email, password, role);
      const { token, user } = res.data;
      if (token) {
        localStorage.setItem('tracex_token', token);
        set({ token, user, authLoading: false, authError: null });
      } else {
        set({ authLoading: false, authError: null });
      }
      return { success: true, data: res.data };
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Registration failed';
      set({ authError: errorMsg, authLoading: false });
      return { success: false, error: errorMsg };
    }
  },

  login: async (email, password) => {
    set({ authLoading: true, authError: null });
    try {
      const res = await authApi.login(email, password);
      const { token, user } = res.data;
      localStorage.setItem('tracex_token', token);
      set({ token, user, authLoading: false, authError: null });
      return true;
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Login failed';
      set({ authError: errorMsg, authLoading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('tracex_token');
    set({ user: null, token: null, selectedDataset: null, sessionId: null, nodes: [], edges: [], clusters: [], summary: null });
  },

  checkAuth: async () => {
    if (!get().token) return;
    set({ authLoading: true });
    try {
      const res = await authApi.getMe();
      set({ user: res.data.user, authLoading: false });
    } catch (err) {
      get().logout();
      set({ authLoading: false });
    }
  },

  // --- Dataset Actions ---
  fetchDatasets: async () => {
    set({ datasetsLoading: true });
    try {
      const res = await datasetApi.list();
      set({ datasets: res.data.datasets, datasetsLoading: false });
    } catch (err) {
      set({ datasetsLoading: false });
    }
  },

  selectDataset: (dataset) => {
    const currentSessionId = get().sessionId;
    const newSessionId = dataset?.sessionId || null;
    const sessionChanged = currentSessionId !== newSessionId;
    set({
      selectedDataset: dataset,
      sessionId: newSessionId,
      summary: null,
      nodes: [],
      edges: [],
      clusters: [],
      ...(sessionChanged ? { chatMessages: [] } : {})
    });
    if (sessionChanged && newSessionId) {
      get().fetchChatHistory(newSessionId);
    }
  },

  uploadDataset: async (file) => {
    try {
      const res = await datasetApi.upload(file);
      await get().fetchDatasets();
      return res.data;
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Upload failed');
    }
  },

  // --- Analysis Execution ---
  runAnalysis: async (datasetId) => {
    set({ analysisRunning: true, analysisError: null });
    try {
      const res = await analysisApi.run(datasetId);
      await get().fetchDatasets();
      // Reload current dataset with complete analysis results
      const currentRes = await datasetApi.getById(datasetId);
      const updatedDataset = currentRes.data.dataset;
      set({
        selectedDataset: updatedDataset,
        sessionId: updatedDataset.sessionId,
        analysisRunning: false
      });
      await get().fetchSummary();
      return true;
    } catch (err) {
      set({ analysisError: err.response?.data?.error || 'Analysis failed', analysisRunning: false });
      return false;
    }
  },

  fetchSummary: async () => {
    const { sessionId } = get();
    if (!sessionId) return;
    try {
      const res = await graphApi.getSummary(sessionId);
      set({ summary: res.data });
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    }
  },

  // --- Graph Data Actions ---
  fetchGraph: async () => {
    const { sessionId } = get();
    if (!sessionId) return;
    set({ graphLoading: true, graphError: null });
    try {
      const graphRes = await graphApi.getGraph(sessionId);
      const clusterRes = await graphApi.getClusters(sessionId);
      set({
        nodes: graphRes.data.nodes,
        edges: graphRes.data.edges,
        clusters: clusterRes.data.clusters,
        graphLoading: false
      });
    } catch (err) {
      set({ graphError: err.response?.data?.error || 'Failed to load graph nodes.', graphLoading: false });
    }
  },

  fetchEntityDetails: async (entityId) => {
    const { sessionId } = get();
    if (!sessionId || !entityId) return;
    set({ selectedEntityLoading: true });
    try {
      const res = await graphApi.getEntity(sessionId, entityId);
      set({ selectedEntity: res.data, selectedEntityLoading: false });
    } catch (err) {
      set({ selectedEntityLoading: false });
    }
  },

  // Backward compatibility alias
  fetchEntityDetail: function (entityId) {
    return get().fetchEntityDetails(entityId);
  },

  clearSelectedEntity: () => set({ selectedEntity: null }),

  // --- Chat Assistant Actions ---
  fetchChatHistory: async (sessionId) => {
    const targetSession = sessionId || get().sessionId || get().selectedDataset?.sessionId;
    if (!targetSession) return;
    try {
      const res = await graphApi.getChatHistory(targetSession);
      if (res.data?.messages && Array.isArray(res.data.messages)) {
        const formatted = res.data.messages.flatMap((m) => {
          const msgs = [];
          if (m.user_message) {
            msgs.push({ role: 'user', content: m.user_message, timestamp: m.timestamp || new Date().toISOString() });
          }
          if (m.response) {
            msgs.push({ role: 'assistant', content: m.response, toolCalls: m.tool_calls, timestamp: m.timestamp || new Date().toISOString() });
          }
          return msgs;
        });
        if (formatted.length > 0) {
          set({ chatMessages: formatted });
        }
      }
    } catch (err) {
      // Graceful fallback if no history exists yet
    }
  },

  sendChatMessage: async (message) => {
    if (!message || !message.trim()) return;
    const targetSession = get().sessionId || get().selectedDataset?.sessionId;
    if (!targetSession) {
      const errMsg = {
        role: 'assistant',
        content: 'No active investigation session. Please select or analyze a dataset first.',
        timestamp: new Date().toISOString()
      };
      set((state) => ({ chatMessages: [...state.chatMessages, errMsg], chatLoading: false }));
      return;
    }

    set({ chatLoading: true });
    
    // Add user message immediately
    const userMsg = { role: 'user', content: message.trim(), timestamp: new Date().toISOString() };
    set((state) => ({ chatMessages: [...state.chatMessages, userMsg] }));

    try {
      const res = await graphApi.chat(targetSession, message.trim());
      const botMsg = {
        role: 'assistant',
        content: res.data.response,
        toolCalls: res.data.tool_calls,
        timestamp: new Date().toISOString()
      };
      set((state) => ({
        chatMessages: [...state.chatMessages, botMsg],
        chatLoading: false
      }));
    } catch (err) {
      const errMsg = {
        role: 'assistant',
        content: `Error: ${err.response?.data?.error || err.response?.data?.detail || 'Failed to get answer from assistant.'}`,
        timestamp: new Date().toISOString()
      };
      set((state) => ({
        chatMessages: [...state.chatMessages, errMsg],
        chatLoading: false
      }));
    }
  },

  clearChat: () => set({ chatMessages: [] }),
}));

export default useAnalysisStore;
