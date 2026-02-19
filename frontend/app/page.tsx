"use client";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  type Message = {
    role: "user" | "assistant";
    content: string;
    type?: "text" | "confirmation" | "error";
    confirmed?: boolean;
    agent?: string;
    tools?: string[];
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [agent, setAgent] = useState<string>("Front Desk Agent");
  const [toolsUsed, setToolsUsed] = useState<string[]>([]);
  const [messagesRemaining, setMessagesRemaining] = useState<number | null>(null);


  const handleTextAreaInput = () => {
    const textarea = textareaRef.current;
    if(textarea){
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`; 
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const pendingConfirmation = messages.length > 0 && messages[messages.length - 1].type === "confirmation" && !messages[messages.length - 1].confirmed;
  const limitReached = messagesRemaining === 0;

  const sendMessage = async (message?: string) => {
    const text = message || input;
    if(!text.trim() || isLoading || limitReached) return;
    

    const userMessage: Message = {role: "user", content: text};
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setToolsUsed([])

    try {
      const res = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          message: text, 
          sessionId: sessionId
        }),
      });

      const remaining = res.headers.get("RateLimit-Remaining");
      if (remaining !== null) setMessagesRemaining(parseInt(remaining, 10));

      if (res.status === 429) {
        const errData = await res.json().catch(() => ({ error: "Daily limit reached." }));
        throw new Error(errData.error);
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Server error" }));
        throw new Error(errData.error || "Request failed");
      }

      const data = await res.json();
      if (data.sessionId) setSessionId(data.sessionId);
      if (data.tools) setToolsUsed(data.tools || []);
      if (data.agent) setAgent(getAgentType(data.agent));

      setMessages(prev => [...prev, {role: "assistant", content: data.response, type: data.type || "text", agent: data.agent, tools: data.tools}]);
    } catch(error) {
      console.error("Error:", error);
      const errorMsg = error instanceof Error ? error.message : "Something went wrong";
      setMessages(prev => [...prev, {role: "assistant", content: errorMsg, type: "error"}]);
    } finally{
      setIsLoading(false);
    }
  }

  const handleConfirmation = async (messageIndex: number, answer: string) => {
    setMessages(prev => prev.map((msg, i) => i == messageIndex ? {...msg, confirmed: true} : msg));
    await sendMessage(answer);
  }

  const getAgentType = (agentName: string) => {
    switch(agentName){
      case "RAGAgent":
        return "Rag Agent";
      case "BookingAgent":
        return "Booking Agent";
      default:
        return "Front Desk Agent";
    }
  }
  return (
    <div className="flex h-screen w-full bg-[#0a0c14] text-gray-200 font-sans overflow-hidden">

      {/* --- Main Content --- */}
      <main className=" custom-scrollbar flex-1 flex flex-col relative items-center justify-center px-4 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent">
        
        {/* Top Header Bar */}
        <div className="absolute top-6 right-8 flex items-center gap-4">
          <button className="bg-[#161926] px-4 py-1.5 rounded-full border border-white/5 text-[11px] font-medium flex items-center gap-2 hover:bg-gray-800 transition-all">
             <div className="w-4 h-4 bg-linear-to-b from-gray-400 to-gray-700 rounded-sm" />
             Demo account
             <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
          </button>
        </div>

        {messages.length === 0 ? (
          <div>
            {/* Center Hero Section */}
            <div className="text-center mb-10 z-10">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="absolute inset-0 blur-xl bg-blue-500/20 rounded-full" />
                  <svg className="w-8 h-8 text-blue-400 fill-blue-400 relative" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                </div>
              </div>
              <p className="text-gray-400 text-xs mb-1 uppercase tracking-widest font-medium">Welcome to Gym Assistant</p>
              <h1 className="text-5xl font-bold tracking-tight text-white">How can I help?</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-4xl mb-20 z-10">
            <FeatureCard title="Book a gym class" color="from-indigo-600/30 to-blue-500/5" onClick={sendMessage}/>
            <FeatureCard title="Check class schedule" color="from-cyan-500/20 to-blue-500/5" onClick={sendMessage}/>
            <FeatureCard title="Check opening hours" color="from-orange-400/20 to-pink-500/5" onClick={sendMessage}/>
            </div>
          </div>
          ) : (
          <div className="flex-1 overflow-y-auto w-full pr-80 pl-80 mx-auto px-4 pt-10 custom-scrollbar">
            {messages.map((msg, i) =>
              msg.role === "user" ? (
                <div key={i} className="flex flex-row-reverse gap-4 mb-8">
                  <div className="w-8 h-8 rounded-full border border-pink-500/30 flex items-center justify-center shrink-0 bg-linear-to-br from-pink-500/20 to-purple-500/20">
                    <svg className="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                  </div>
                  <div className="bg-[#2f2f2f] px-5 py-3 rounded-3xl max-w-[70%]">
                    <p className="text-gray-200">{msg.content}</p>
                  </div>
                </div>
              ) : msg.type === "error" ? (
                <div key={i} className="flex gap-4 mb-8">
                  <div className="w-8 h-8 rounded-full border border-red-500/30 flex items-center justify-center shrink-0 bg-red-500/10">
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="border border-red-500/20 bg-red-500/5 rounded-xl px-4 py-3">
                      <p className="text-red-300 text-sm">{msg.content}</p>
                      {!limitReached && (
                        <button onClick={() => sendMessage(messages.filter(m => m.role === "user").pop()?.content)}
                          className="mt-2 px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors">
                          Retry
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div key={i} className="flex gap-4 mb-8 group">
                  <div className="w-8 h-8 rounded-full border border-purple-500/30 flex items-center justify-center shrink-0 bg-linear-to-br from-purple-500/20 to-blue-500/20">
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" /></svg>
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-gray-200 leading-relaxed">{msg.content}</p>
                    {msg.type === "confirmation" && !msg.confirmed && (
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => handleConfirmation(i, "yes")}
                          className="px-4 py-2 bg-red-600 rounded-lg text-sm hover:bg-red-700 transition-colors">
                          Yes, cancel
                        </button>
                        <button onClick={() => handleConfirmation(i, "no")}
                          className="px-4 py-2 bg-gray-600 rounded-lg text-sm hover:bg-gray-700 transition-colors">
                          No, keep it
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* --- Chat Input Area --- */}
        <div className="w-full max-w-2xl flex flex-col items-center z-10 mb-8">
          <div className="flex justify-between gap-3 w-full">
            <div className="mb-4 bg-[#1a1d2e] border border-white/5 rounded-lg px-3 py-1.5 flex items-center gap-2 text-[11px] text-gray-300 hover:border-white/20 cursor-pointer">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2a2 2 0 012 2v1h2a3 3 0 013 3v8a3 3 0 01-3 3H8a3 3 0 01-3-3V8a3 3 0 013-3h2V4a2 2 0 012-2zM9 12a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm6 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm-6 4h6M2 10h1m18 0h1" /></svg>
              {agent}
            </div>
            <div className="mb-4 bg-[#1a1d2e] border border-white/5 rounded-lg px-3 py-1.5 flex items-center gap-2 text-[11px] text-gray-300 hover:border-white/20 cursor-pointer">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" /></svg>
              {toolsUsed.length > 0 ? toolsUsed.join(", ") : "No tools used"}
            </div>
            {messagesRemaining !== null && (
              <div className={`mb-4 border rounded-lg px-3 py-1.5 flex items-center gap-2 text-[11px] ${limitReached ? "bg-red-500/10 border-red-500/40 text-red-400" : "bg-[#1a1d2e] border-white/5 text-gray-300"}`}>
                {messagesRemaining} / 15 messages left
              </div>
            )}
          </div>

          <div className="w-full bg-[#161926]/80 backdrop-blur-sm border border-white/10 rounded-2xl p-4 flex items-end gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                } 
              }}
              ref={textareaRef}
              disabled={pendingConfirmation || limitReached}
              placeholder={limitReached ? "Daily demo limit reached. Come back tomorrow." : pendingConfirmation ? "Please confirm or cancel the action above..." : "Ask about classes, bookings, or gym info..."}
              className={`bg-transparent flex-1 resize-none outline-none text-sm py-1 ${pendingConfirmation || limitReached ? "text-gray-500 placeholder:text-gray-600 cursor-not-allowed" : "text-gray-200 placeholder:text-gray-600"}`}
              onInput={handleTextAreaInput}
              rows={1}
            />
            <button onClick={() => sendMessage()} disabled={isLoading || pendingConfirmation || limitReached} className={`p-2 rounded-lg transition-colors ${pendingConfirmation || limitReached ? "bg-white/5 cursor-not-allowed opacity-50" : "bg-white/5 hover:bg-white/10"}`}>
              {isLoading ? (
                <svg className="w-4 h-4 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              )}

            </button>
          </div>
        </div>

      </main>
    </div>
  );
}

function FeatureCard({ title, color, onClick }: { title: string; color: string; onClick?: (message: string) => void }) {
  return (
    <div className={`relative h-44 rounded-2xl p-6 border transition-all cursor-pointer overflow-hidden group
      ${'border-white/5 hover:border-white/10'}
      bg-linear-to-br ${color}`}
      onClick={() => onClick?.(title)}
    >
      <h3 className="text-sm font-semibold text-white/90 max-w-30 relative z-10 leading-snug">
        {title}
      </h3>
      <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/5 blur-3xl rounded-full" />
    </div>
  );
}