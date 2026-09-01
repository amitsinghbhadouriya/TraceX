import React, { useState, useRef, useEffect } from 'react';
import {
  ChatBubbleLeftRightIcon,
  ShieldExclamationIcon,
  PaperAirplaneIcon,
  CommandLineIcon
} from '@heroicons/react/24/outline';
import useAnalysisStore from '../store/analysisStore';

const AssistantPage = () => {
  const { selectedDataset, chatMessages, chatLoading, sendChatMessage, clearChat, fetchChatHistory } = useAnalysisStore();
  const [input, setInput] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  // Load chat history if messages are empty for active session
  useEffect(() => {
    if (chatMessages.length === 0 && selectedDataset?.sessionId) {
      fetchChatHistory(selectedDataset.sessionId);
    }
  }, [selectedDataset?.sessionId, chatMessages.length, fetchChatHistory]);

  if (!selectedDataset) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center card max-w-md mx-auto animate-fade-in">
        <ShieldExclamationIcon className="h-12 w-12 text-slate-500 mb-4 animate-pulse" />
        <h3 className="text-md font-bold text-slate-200">No Active Case Selected</h3>
        <p className="text-xs text-slate-400 mt-1">Please select an active dataset to interact with the assistant.</p>
      </div>
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || chatLoading) return;
    sendChatMessage(input);
    setInput('');
  };

  return (
    <div className="h-full flex flex-col gap-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ChatBubbleLeftRightIcon className="h-6 w-6 text-cyan animate-pulse" />
          <div>
            <h2 className="text-xl font-bold text-slate-100">AI Investigation Assistant</h2>
            <p className="text-xs text-slate-400 mt-0.5">Ask questions grounded strictly in computed case evidence</p>
          </div>
        </div>
        <button
          onClick={clearChat}
          className="text-xs text-slate-400 hover:text-slate-200 border border-white/10 rounded px-2.5 py-1.5 hover:bg-white/5 transition-all"
        >
          Reset Session
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 card flex flex-col overflow-hidden bg-navy-600/40 relative">
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {chatMessages.length === 0 && (
            <div className="my-auto text-center max-w-md mx-auto flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-cyan/15 flex items-center justify-center text-cyan mb-2">
                <ChatBubbleLeftRightIcon className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-200">Investigation Copilot</h3>
              <p className="text-xs text-slate-400">
                You can ask questions like:
              </p>
              <div className="grid grid-cols-1 gap-2 w-full mt-2 text-left">
                {[
                  "Which network cluster should I investigate first?",
                  "Why is entity ACC_tok_... flagged with a critical risk score?",
                  "Are there any shared device connections between suspicious accounts?",
                  "Summarize the anomaly findings for this transaction dataset.",
                ].map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (!chatLoading) sendChatMessage(q);
                    }}
                    className="text-left text-xs bg-white/5 hover:bg-white/10 border border-white/5 hover:border-cyan/30 rounded-lg p-2.5 text-slate-300 transition-all font-medium"
                  >
                    "{q}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {chatMessages.map((msg, index) => (
            <div key={index} className="flex flex-col gap-2 max-w-full">
              {/* Message Bubble */}
              <div className={`chat-bubble ${msg.role === 'user' ? 'user' : 'assistant'}`}>
                {/* Parse Markdown-like lists & highlights simply */}
                <div className="whitespace-pre-wrap font-sans text-xs">
                  {msg.content}
                </div>
              </div>

              {/* Render Tool Calls trace for transparency */}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="ml-4 flex flex-col gap-1.5 border-l-2 border-cyan/20 pl-3">
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold flex items-center gap-1">
                    <CommandLineIcon className="h-3 w-3 text-cyan" />
                    <span>Evidence Tools Invoked</span>
                  </span>
                  {msg.toolCalls.map((call, cIdx) => (
                    <details key={cIdx} className="group bg-white/5 border border-white/5 rounded-lg text-[10px] text-slate-300 overflow-hidden">
                      <summary className="cursor-pointer px-2.5 py-1.5 font-mono font-semibold flex items-center justify-between hover:bg-white/5 select-none">
                        <span>{call.tool_name}</span>
                        <span className="text-[8px] text-emerald bg-emerald/10 border border-emerald/25 rounded px-1 uppercase">
                          Success
                        </span>
                      </summary>
                      <div className="px-2.5 pb-2 pt-1 font-mono text-[9px] text-slate-400 bg-navy-800 border-t border-white/5 flex flex-col gap-1.5">
                        <div>
                          <span className="text-cyan font-semibold block mb-0.5">Parameters:</span>
                          <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify(call.args, null, 2)}</pre>
                        </div>
                        <div>
                          <span className="text-cyan font-semibold block mb-0.5">Returned Payload:</span>
                          <pre className="overflow-x-auto whitespace-pre-wrap max-h-40">{JSON.stringify(call.result, null, 2)}</pre>
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </div>
          ))}

          {chatLoading && (
            <div className="flex gap-2 items-center text-xs text-slate-400 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 max-w-[200px] border-dashed">
              <div className="h-3.5 w-3.5 border-2 border-t-cyan border-white/20 rounded-full animate-spin" />
              <span>Querying database engine...</span>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 bg-navy-700/40 flex gap-2 flex-shrink-0">
          <input
            type="text"
            placeholder="Search network connections, explain risk anomalies..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={chatLoading}
            className="input flex-1"
          />
          <button
            type="submit"
            disabled={!input.trim() || chatLoading}
            className="btn-primary"
          >
            <PaperAirplaneIcon className="h-4.5 w-4.5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AssistantPage;
