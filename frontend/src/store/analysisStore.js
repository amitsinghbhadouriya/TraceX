import { create } from 'zustand';
import { authApi, datasetApi, analysisApi, graphApi } from '../api';
import {
  DEMO_DATASET,
  DEMO_SUMMARY,
  DEMO_CLUSTERS,
  DEMO_NODES,
  DEMO_EDGES,
  DEMO_ENTITY_DETAILS,
  DEMO_CHAT_RESPONSES,
} from '../data/demoData';

const useAnalysisStore = create((set, get) => ({
  // --- Auth State ---
  user: null,
  token: localStorage.getItem('tracex_token') || null,
  isDemoMode: localStorage.getItem('tracex_demo_mode') === 'true',
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

  loadDemoCase: () => {
    const demoUser = {
      name: 'Lead Fraud Investigator (Demo)',
      email: 'investigator@tracex.internal',
      role: 'lead_investigator',
    };
    localStorage.setItem('tracex_token', 'demo-token-active');
    localStorage.setItem('tracex_demo_mode', 'true');
    set({
      isDemoMode: true,
      token: 'demo-token-active',
      user: demoUser,
      datasets: [DEMO_DATASET],
      selectedDataset: DEMO_DATASET,
      sessionId: DEMO_DATASET.sessionId,
      summary: DEMO_SUMMARY,
      nodes: DEMO_NODES,
      edges: DEMO_EDGES,
      clusters: DEMO_CLUSTERS,
      chatMessages: [
        {
          role: 'assistant',
          content: 'Hello Investigator. Case Operation Hydra is loaded in Showcase Demo Mode. 3 fraud rings detected with $106,020 in suspicious transactions. Ask me any question or explore the 3D Network Map and Clusters above.',
          timestamp: new Date().toISOString(),
        },
      ],
      authLoading: false,
      authError: null,
      graphLoading: false,
      graphError: null,
      analysisRunning: false,
    });
  },

  register: async (name, email, password, role = 'investigator') => {
    set({ authLoading: true, authError: null });
    try {
      const res = await authApi.register(name, email, password, role);
      const { token, user } = res.data;
      if (token) {
        localStorage.setItem('tracex_token', token);
        localStorage.removeItem('tracex_demo_mode');
        set({ token, user, isDemoMode: false, authLoading: false, authError: null });
      } else {
        set({ authLoading: false, authError: null });
      }
      return { success: true, data: res.data };
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        (err.code === 'ERR_NETWORK'
          ? 'Cannot connect to backend server. Make sure your API is online.'
          : err.message || 'Registration failed');
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
      localStorage.removeItem('tracex_demo_mode');
      set({ token, user, isDemoMode: false, authLoading: false, authError: null });
      return true;
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        (err.code === 'ERR_NETWORK'
          ? 'Cannot connect to backend server. Make sure your API is online.'
          : 'Login failed');
      set({ authError: errorMsg, authLoading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('tracex_token');
    localStorage.removeItem('tracex_demo_mode');
    set({
      isDemoMode: false,
      user: null,
      token: null,
      selectedDataset: null,
      sessionId: null,
      nodes: [],
      edges: [],
      clusters: [],
      summary: null,
      chatMessages: [],
    });
  },

  checkAuth: async () => {
    const token = get().token;
    if (!token) return;
    if (token === 'demo-token-active' || get().isDemoMode) {
      get().loadDemoCase();
      return;
    }
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
    if (get().isDemoMode) {
      set({ datasets: [DEMO_DATASET], datasetsLoading: false });
      return;
    }
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
      summary: dataset?.isDemo ? DEMO_SUMMARY : null,
      nodes: dataset?.isDemo ? DEMO_NODES : [],
      edges: dataset?.isDemo ? DEMO_EDGES : [],
      clusters: dataset?.isDemo ? DEMO_CLUSTERS : [],
      ...(sessionChanged ? { chatMessages: [] } : {}),
    });
    if (sessionChanged && newSessionId && !dataset?.isDemo) {
      get().fetchChatHistory(newSessionId);
    }
  },

  clearActiveCase: () => {
    set({
      selectedDataset: null,
      sessionId: null,
      summary: null,
      nodes: [],
      edges: [],
      clusters: [],
      chatMessages: [],
    });
  },

  deleteDataset: async (datasetId) => {
    if (!datasetId) return false;
    if (get().isDemoMode || datasetId === DEMO_DATASET._id) {
      get().clearActiveCase();
      return true;
    }
    try {
      await datasetApi.delete(datasetId);
      const isCurrent = get().selectedDataset?._id === datasetId;
      const remaining = (get().datasets || []).filter((d) => d._id !== datasetId);

      if (isCurrent) {
        if (remaining.length > 0) {
          const nextDataset = remaining[0];
          set({
            datasets: remaining,
            selectedDataset: nextDataset,
            sessionId: nextDataset.sessionId,
            summary: null,
            nodes: [],
            edges: [],
            clusters: [],
            chatMessages: [],
          });
          if (nextDataset.status === 'analysis_complete') {
            get().fetchSummary();
            get().fetchGraph();
          }
        } else {
          set({
            datasets: [],
            selectedDataset: null,
            sessionId: null,
            summary: null,
            nodes: [],
            edges: [],
            clusters: [],
            chatMessages: [],
          });
        }
      } else {
        set({ datasets: remaining });
      }
      return true;
    } catch (err) {
      console.error('Failed to delete dataset:', err);
      return false;
    }
  },

  uploadDataset: async (file) => {
    try {
      const res = await datasetApi.upload(file);
      await get().fetchDatasets();
      return res.data;
    } catch (err) {
      throw new Error(err.response?.data?.error || err.message || 'Upload failed');
    }
  },

  // --- Analysis Execution ---
  runAnalysis: async (datasetId) => {
    if (get().isDemoMode || datasetId === DEMO_DATASET._id) {
      set({ analysisRunning: true });
      setTimeout(() => {
        set({
          selectedDataset: DEMO_DATASET,
          sessionId: DEMO_DATASET.sessionId,
          summary: DEMO_SUMMARY,
          nodes: DEMO_NODES,
          edges: DEMO_EDGES,
          clusters: DEMO_CLUSTERS,
          analysisRunning: false,
        });
      }, 800);
      return true;
    }

    set({ analysisRunning: true, analysisError: null });
    try {
      await analysisApi.run(datasetId);
      await get().fetchDatasets();
      const currentRes = await datasetApi.getById(datasetId);
      const updatedDataset = currentRes.data.dataset;
      set({
        selectedDataset: updatedDataset,
        sessionId: updatedDataset.sessionId,
        analysisRunning: false,
      });
      await get().fetchSummary();
      return true;
    } catch (err) {
      set({ analysisError: err.response?.data?.error || 'Analysis failed', analysisRunning: false });
      return false;
    }
  },

  fetchSummary: async () => {
    const { sessionId, isDemoMode, selectedDataset } = get();
    if (isDemoMode || selectedDataset?.isDemo) {
      set({ summary: DEMO_SUMMARY });
      return;
    }
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
    const { sessionId, isDemoMode, selectedDataset } = get();
    if (isDemoMode || selectedDataset?.isDemo) {
      set({
        nodes: DEMO_NODES,
        edges: DEMO_EDGES,
        clusters: DEMO_CLUSTERS,
        graphLoading: false,
      });
      return;
    }
    if (!sessionId) return;
    set({ graphLoading: true, graphError: null });
    try {
      const graphRes = await graphApi.getGraph(sessionId);
      const clusterRes = await graphApi.getClusters(sessionId);
      set({
        nodes: graphRes.data.nodes,
        edges: graphRes.data.edges,
        clusters: clusterRes.data.clusters,
        graphLoading: false,
      });
    } catch (err) {
      set({ graphError: err.response?.data?.error || 'Failed to load graph nodes.', graphLoading: false });
    }
  },

  fetchEntityDetails: async (entityId) => {
    const { sessionId, isDemoMode } = get();
    if (isDemoMode) {
      const demoDetail = DEMO_ENTITY_DETAILS[entityId] || {
        entity_id: entityId,
        label: entityId,
        type: 'account',
        risk_score: 85,
        risk_level: 'HIGH',
        summary: `Entity ${entityId} identified as part of the suspicious syndicate network.`,
        flags: ['Multi-Account Association', 'Elevated Velocity'],
        metrics: { inflow: '$15,000', outflow: '$14,200', retention_rate: '5.3%', unique_peers: 3 },
        recent_transactions: [],
      };
      set({ selectedEntity: demoDetail, selectedEntityLoading: false });
      return;
    }
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
    if (get().isDemoMode) return;
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
    const cleanMsg = message.trim();
    const userMsg = { role: 'user', content: cleanMsg, timestamp: new Date().toISOString() };
    set((state) => ({ chatMessages: [...state.chatMessages, userMsg], chatLoading: true }));

    if (get().isDemoMode || get().selectedDataset?.isDemo) {
      setTimeout(() => {
        const responseText =
          DEMO_CHAT_RESPONSES[cleanMsg] ||
          DEMO_CHAT_RESPONSES.default;
        const botMsg = {
          role: 'assistant',
          content: responseText,
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          chatMessages: [...state.chatMessages, botMsg],
          chatLoading: false,
        }));
      }, 500);
      return;
    }

    const targetSession = get().sessionId || get().selectedDataset?.sessionId;
    if (!targetSession) {
      const errMsg = {
        role: 'assistant',
        content: 'No active investigation session. Please select or analyze a dataset first.',
        timestamp: new Date().toISOString(),
      };
      set((state) => ({ chatMessages: [...state.chatMessages, errMsg], chatLoading: false }));
      return;
    }

    try {
      const res = await graphApi.chat(targetSession, cleanMsg);
      const botMsg = {
        role: 'assistant',
        content: res.data.response,
        toolCalls: res.data.tool_calls,
        timestamp: new Date().toISOString(),
      };
      set((state) => ({
        chatMessages: [...state.chatMessages, botMsg],
        chatLoading: false,
      }));
    } catch (err) {
      const errMsg = {
        role: 'assistant',
        content: `Error: ${err.response?.data?.error || err.response?.data?.detail || 'Failed to get answer from assistant.'}`,
        timestamp: new Date().toISOString(),
      };
      set((state) => ({
        chatMessages: [...state.chatMessages, errMsg],
        chatLoading: false,
      }));
    }
  },

  clearChat: () => set({ chatMessages: [] }),
}));

export default useAnalysisStore;
