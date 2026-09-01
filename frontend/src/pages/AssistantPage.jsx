import React, { useState, useRef, useEffect } from 'react';
import {
  ChatBubbleLeftRightIcon,
  ShieldExclamationIcon,
  PaperAirplaneIcon,
  CommandLineIcon,
  SparklesIcon,
  ArrowPathIcon,
  UserCircleIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';
import useAnalysisStore from '../store/analysisStore';

const QUICK_PROMPTS = [
  { label: '🎯 Priority Target', prompt: 'Which network cluster should I investigate first?' },
  { label: '🔍 Check Cluster 0', prompt: 'Check cluster 0' },
  { label: '⚡ Top Anomalies', prompt: 'Show top anomalous transactions' },
  { label: '👤 High-Risk Entities', prompt: 'List highest risk entities and hubs' },
  { label: '📋 Case Summary', prompt: 'Summarize dataset findings' },
];

const AssistantPage = () => {
  const {
    selectedDataset,
    chatMessages,
    chatLoading,
    sendChatMessage,
    clearChat,
    fetchChatHistory
  } = useAnalysisStore();

  const [input, setInput] = useState('');
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const activeSessionId = selectedDataset?.sessionId;

  // Auto-scroll to latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  // Auto-focus input on mount and when loading finishes
  useEffect(() => {
    if (!chatLoading) {
      inputRef.current?.focus();
    }
  }, [chatLoading]);

  // Load chat history once per active session
  useEffect(() => {
    if (activeSessionId && chatMessages.length === 0) {
      fetchChatHistory(activeSessionId);
    }
  }, [activeSessionId]);

  if (!selectedDataset) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center card max-w-md mx-auto animate-fade-in mt-12">
        <ShieldExclamationIcon className="h-12 w-12 text-slate-500 mb-4 animate-pulse" />
        <h3 className="text-base font-bold text-slate-200">No Active Case Selected</h3>
        <p className="text-xs text-slate-400 mt-1">Please select an active dataset or upload one to begin AI-assisted forensic interrogation.</p>
      </div>
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || chatLoading) return;
    const msg = input.trim();
    setInput('');
    sendChatMessage(msg);
  };

  const handlePromptClick = (promptText) => {
    if (chatLoading) return;
    sendChatMessage(promptText);
  };

  return (
    <div className="h-full flex flex-col gap-3 animate-fade-in">
      {/* ── Top Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-cyan/15 border border-cyan/30 flex items-center justify-center text-cyan shadow-glow-cyan">
            <ChatBubbleLeftRightIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-slate-100">AI Investigation Assistant</h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald/15 text-emerald border border-emerald/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald animate-pulse" />
                Live Copilot
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Grounded in active case evidence: <span className="font-mono text-cyan">{selectedDataset.filename || 'Dataset'}</span>
            </p>
          </div>
        </div>

        <button
          onClick={clearChat}
          className="text-xs text-slate-400 hover:text-slate-200 border border-white/10 hover:border-white/20 rounded-lg px-3 py-1.5 hover:bg-white/5 transition-all flex items-center gap-1.5"
          title="Clear chat history"
        >
          <ArrowPathIcon className="h-3.5 w-3.5" />
          <span>Clear Chat</span>
        </button>
      </div>

      {/* ── Main Chat Area ──────────────────────────────────────── */}
      <div className="flex-1 card flex flex-col overflow-hidden bg-navy-800/80 border-white/10 relative">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4">
          
          {/* Welcome / Empty State */}
          {chatMessages.length === 0 && (
            <div className="my-auto text-center max-w-lg mx-auto flex flex-col items-center gap-3 py-8">
              <div className="h-14 w-14 rounded-2xl bg-cyan/15 border border-cyan/30 flex items-center justify-center text-cyan shadow-glow-cyan mb-1">
                <SparklesIcon className="h-7 w-7 animate-pulse" />
              </div>
              <h3 className="text-base font-extrabold text-slate-100">Continuous Forensic Interrogation</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-md">
                Ask any questions about suspicious accounts, coordinated network clusters, transaction anomalies, or shared devices.
              </p>
              
              <div className="w-full mt-3 flex flex-col gap-2 text-left">
                <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500 text-center">
                  Quick Start Prompts
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {QUICK_PROMPTS.map((qp, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePromptClick(qp.prompt)}
                      disabled={chatLoading}
                      className="text-left text-xs bg-white/5 hover:bg-cyan/10 border border-white/8 hover:border-cyan/30 rounded-xl p-3 text-slate-300 hover:text-cyan transition-all font-medium flex items-center gap-2 group"
                    >
                      <span className="text-sm">{qp.label.split(' ')[0]}</span>
                      <span className="truncate">{qp.prompt}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Chat Messages */}
          {chatMessages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={index}
                className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar Icon */}
                <div
                  className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 ${
                    isUser
                      ? 'bg-cyan text-navy font-bold'
                      : 'bg-navy-900 border border-cyan/40 text-cyan shadow-glow-cyan'
                  }`}
                >
                  {isUser ? (
                    <UserCircleIcon className="h-4 w-4" />
                  ) : (
                    <CpuChipIcon className="h-4 w-4" />
                  )}
                </div>

                <div className="flex flex-col gap-2 max-w-full">
                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                      isUser
                        ? 'bg-cyan text-navy-900 font-medium rounded-tr-sm shadow-glow-cyan'
                        : 'bg-white/5 text-slate-200 border border-white/10 rounded-tl-sm backdrop-blur-sm'
                    }`}
                  >
                    <div className="whitespace-pre-wrap font-sans">
                      {msg.content}
                    </div>
                  </div>

                  {/* Tool Calls Inspector */}
                  {!isUser && msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="flex flex-col gap-1.5 border-l-2 border-cyan/30 pl-3 my-1">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-mono font-bold flex items-center gap-1">
                        <CommandLineIcon className="h-3 w-3 text-cyan" />
                        <span>Evidence Tools Executed ({msg.toolCalls.length})</span>
                      </span>
                      {msg.toolCalls.map((call, cIdx) => (
                        <details
                          key={cIdx}
                          className="bg-navy-900/90 border border-white/10 rounded-lg text-[10px] text-slate-300 overflow-hidden"
                        >
                          <summary className="cursor-pointer px-2.5 py-1.5 font-mono font-semibold flex items-center justify-between hover:bg-white/5 select-none">
                            <span className="text-cyan">{call.tool_name}</span>
                            <span className="text-[8px] text-emerald bg-emerald/10 border border-emerald/30 rounded px-1 uppercase">
                              Ground Truth
                            </span>
                          </summary>
                          <div className="px-2.5 pb-2 pt-1 font-mono text-[9px] text-slate-400 bg-navy-950 border-t border-white/5 flex flex-col gap-1.5">
                            {call.args && Object.keys(call.args).length > 0 && (
                              <div>
                                <span className="text-slate-400 font-semibold block mb-0.5">Parameters:</span>
                                <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(call.args, null, 2)}</pre>
                              </div>
                            )}
                            <div>
                              <span className="text-slate-400 font-semibold block mb-0.5">Evidence Payload:</span>
                              <pre className="overflow-x-auto whitespace-pre-wrap max-h-36">{JSON.stringify(call.result, null, 2)}</pre>
                            </div>
                          </div>
                        </details>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Loading bubble */}
          {chatLoading && (
            <div className="flex gap-2 items-center text-xs text-slate-300 bg-white/5 border border-cyan/30 rounded-2xl px-4 py-3 max-w-[240px] mr-auto animate-pulse">
              <div className="h-3.5 w-3.5 border-2 border-t-cyan border-white/20 rounded-full animate-spin" />
              <span>Querying forensic evidence...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* ── Persistent Quick-Action Chips ────────────────────── */}
        <div className="px-4 py-2 bg-navy-900/60 border-t border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider flex-shrink-0 mr-1">
            Quick Actions:
          </span>
          {QUICK_PROMPTS.map((qp, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handlePromptClick(qp.prompt)}
              disabled={chatLoading}
              className="text-[11px] font-medium whitespace-nowrap px-2.5 py-1 rounded-lg bg-white/5 hover:bg-cyan/15 text-slate-300 hover:text-cyan border border-white/8 hover:border-cyan/30 transition-all flex-shrink-0 disabled:opacity-50"
            >
              {qp.label}
            </button>
          ))}
        </div>

        {/* ── Continuous Input Bar ─────────────────────────────── */}
        <form onSubmit={handleSubmit} className="p-3 sm:p-4 border-t border-white/10 bg-navy-900/90 flex gap-2 flex-shrink-0">
          <input
            ref={inputRef}
            type="text"
            placeholder="Ask anything (e.g. 'Check cluster 0', 'Explain anomaly patterns', 'Who is in cluster 1?')..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={chatLoading}
            className="input flex-1 text-xs sm:text-sm bg-navy-950/80 border-white/15 focus:border-cyan/60"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!input.trim() || chatLoading}
            className="btn-primary py-2.5 px-4 flex-shrink-0"
            title="Send Message (Enter)"
          >
            {chatLoading ? (
              <div className="h-4 w-4 border-2 border-t-navy border-white/30 rounded-full animate-spin" />
            ) : (
              <span className="flex items-center gap-1.5">
                <span>Send</span>
                <PaperAirplaneIcon className="h-4 w-4" />
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AssistantPage;
