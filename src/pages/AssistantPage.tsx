import React, { useEffect, useRef, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Info, Mic, Send } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { FarmerVoiceAssistant } from '../components/FarmerVoiceAssistant.tsx';
import {
  sendChatFallback,
  streamChat,
  transcribeVoice,
} from '../services/climateApi.ts';
import type {
  ChatChartEvent,
  ChatSourceRef,
  RegionId,
} from '../types/apiContract.ts';

interface UiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSourceRef[];
  chart?: ChatChartEvent | null;
  error?: boolean;
}

export function AssistantPage() {
  const { profile } = useApp();

  if (profile === 'farmer') {
    return <FarmerVoiceAssistant />;
  }

  return <StandardAssistantChat />;
}

function StandardAssistantChat() {
  const {
    language,
    mode,
    profile,
    regionId,
    regions,
    sessionId,
    conversations,
    updatePreferences,
    refreshSession,
    openDatasetDialog,
  } = useApp();

  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        language === 'fr'
          ? 'Bonjour. Je suis AGBÉA Assistant. Posez-moi une question sur les pluies, la végétation ou la température dans votre région du Togo.'
          : 'Hello. I am AGBÉA Assistant. Ask me a question about rainfall, vegetation, or temperature in any region of Togo.',
    },
  ]);

  const [threadId, setThreadId] = useState<string | null>(null);
  const [input, setInput] = useState<string>('');
  const [streaming, setStreaming] = useState<boolean>(false);
  const [statusLabel, setStatusLabel] = useState<string | null>(null);
  const [forceFallback, setForceFallback] = useState<boolean>(false);
  const [voiceMessage, setVoiceMessage] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, statusLabel]);

  const activeRegion = regions.find((r) => r.id === regionId);

  const suggested =
    language === 'fr'
      ? [
          'Pourquoi la végétation change-t-elle en Savanes ?',
          'Que montrent les données de pluie à Kara ?',
          'Comment évolue la température de surface en Maritime ?',
        ]
      : [
          'Why is vegetation changing in Savanes?',
          'What do rainfall observations show in Kara?',
          'How is land surface temperature changing in Maritime?',
        ];

  const handleMicClick = async () => {
    setVoiceMessage(null);
    try {
      await transcribeVoice();
    } catch (err: any) {
      // M21 returns 501 with "Voice is coming soon" — display cleanly without throwing uncaught errors
      setVoiceMessage(
        err?.message ||
          (language === 'fr'
            ? 'La commande vocale arrive bientôt'
            : 'Voice is coming soon')
      );
    }
  };

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || streaming) return;

    const userMsg: UiMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
    };
    const assistantId = `a-${Date.now() + 1}`;

    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: 'assistant', content: '', sources: [], chart: null },
    ]);
    if (!overrideText) setInput('');
    setStreaming(true);
    setStatusLabel(language === 'fr' ? 'Récupération des données…' : 'Fetching data…');

    const payload = {
      session_id: sessionId,
      thread_id: threadId,
      message: text,
      region_id: regionId,
      profile,
      language,
      mode,
    };

    try {
      if (forceFallback) {
        const res = await sendChatFallback(payload);
        setThreadId(res.thread_id);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: res.answer,
                  sources: res.sources,
                  chart: res.chart || null,
                }
              : m
          )
        );
      } else {
        await streamChat(payload, {
          onMeta: (meta) => setThreadId(meta.thread_id),
          onStatus: (st) => setStatusLabel(st),
          onToken: (tok) =>
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + tok } : m
              )
            ),
          onData: (chart) =>
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, chart } : m))
            ),
          onSources: (sources) =>
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, sources } : m))
            ),
        });
      }
      refreshSession();
    } catch {
      // Automatic fallback to M26 POST /chat
      try {
        const fallback = await sendChatFallback(payload);
        setThreadId(fallback.thread_id);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: fallback.answer,
                  sources: fallback.sources,
                  chart: fallback.chart || null,
                }
              : m
          )
        );
        refreshSession();
      } catch (err: any) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: err?.message || 'Unable to generate response.',
                  error: true,
                }
              : m
          )
        );
      }
    } finally {
      setStreaming(false);
      setStatusLabel(null);
    }
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-8">
      <div className="pb-5 border-b border-[#DCE3E1] flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#0E7490]">
            {language === 'fr' ? 'Assistant AGBÉA' : 'AGBÉA AI Chat'}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F2942] mt-1">
            {language === 'fr'
              ? 'Interroger les observations NASA'
              : 'Ask about NASA climate observations'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label htmlFor="chat-region" className="block text-xs font-semibold text-[#475569] mb-1">
              {language === 'fr' ? 'Ma région' : 'My region'}
            </label>
            <select
              id="chat-region"
              value={regionId}
              onChange={(e) =>
                updatePreferences({ region_id: e.target.value as RegionId })
              }
              className="h-10 px-3 text-sm bg-white border border-[#CBD5E1] rounded text-[#0F2942]"
            >
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.capital})
                </option>
              ))}
            </select>
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-[#475569] mt-5 cursor-pointer">
            <input
              type="checkbox"
              checked={forceFallback}
              onChange={(e) => setForceFallback(e.target.checked)}
              className="accent-[#0E7490]"
            />
            <span>{language === 'fr' ? 'Mode direct (sans flux)' : 'Fallback mode'}</span>
          </label>
        </div>
      </div>

      <div className="pt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Past Conversations from Session (M04) */}
        <aside className="lg:col-span-3 bg-[#F7F9F8] border border-[#DCE3E1] rounded p-4 space-y-3 h-fit">
          <div className="text-xs font-semibold text-[#0F2942]">
            {language === 'fr' ? 'Conversations récentes' : 'Past conversations'}
          </div>
          {conversations.length === 0 ? (
            <p className="text-xs text-[#64748B]">
              {language === 'fr'
                ? 'Aucune conversation enregistrée.'
                : 'No conversations saved yet.'}
            </p>
          ) : (
            <ul className="space-y-2">
              {conversations.map((conv) => (
                <li
                  key={conv.thread_id}
                  className="p-2.5 bg-white border border-[#DCE3E1] rounded text-xs"
                >
                  <div className="font-semibold text-[#0F2942] truncate">
                    {conv.title}
                  </div>
                  <div className="text-[11px] text-[#64748B] mt-0.5 font-mono">
                    {conv.region_id}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Right: Chat Area */}
        <div className="lg:col-span-9 space-y-4">
          {/* Suggested questions */}
          <div className="flex flex-wrap gap-2">
            {suggested.map((q) => (
              <button
                key={q}
                type="button"
                disabled={streaming}
                onClick={() => handleSend(q)}
                className="px-3 py-1.5 text-xs font-medium bg-[#F7F9F8] hover:bg-[#EDF2F0] text-[#0F2942] border border-[#DCE3E1] rounded cursor-pointer disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>

          {voiceMessage && (
            <div
              className="px-4 py-2.5 bg-[#F7F9F8] border border-[#CBD5E1] rounded text-xs font-medium text-[#0F2942]"
              role="status"
            >
              {voiceMessage}
            </div>
          )}

          {/* Chat Thread */}
          <div className="bg-[#F7F9F8] border border-[#DCE3E1] rounded flex flex-col min-h-[420px] max-h-[560px]">
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded p-4 text-sm leading-relaxed space-y-3 ${
                      msg.role === 'user'
                        ? 'bg-[#0F2942] text-white'
                        : msg.error
                        ? 'bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B]'
                        : 'bg-white border border-[#DCE3E1] text-[#1E293B]'
                    }`}
                  >
                    {msg.role === 'assistant' && statusLabel && msg.content === '' && (
                      <div className="text-xs font-medium text-[#0E7490]">{statusLabel}</div>
                    )}

                    {msg.content && (
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    )}

                    {/* M25 Inline chart inside conversation */}
                    {msg.chart && msg.chart.points.length > 0 && (
                      <div className="pt-2 border-t border-[#DCE3E1]">
                        <div className="text-xs font-semibold text-[#0F2942] mb-2">
                          {msg.chart.title} ({msg.chart.unit})
                        </div>
                        <div className="h-44 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={msg.chart.points} margin={{ top: 4, right: 6, left: -16, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip />
                              <Bar dataKey="value" fill="#0E7490" radius={[2, 2, 0, 0]} />
                              <Line
                                type="monotone"
                                dataKey="normal"
                                stroke="#0F2942"
                                strokeDasharray="4 4"
                                dot={false}
                              />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* M25 Sources as clickable chips */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="pt-2 border-t border-[#DCE3E1] flex flex-wrap items-center gap-2">
                        {msg.sources.map((src) => (
                          <button
                            key={src.dataset_id}
                            type="button"
                            onClick={() => openDatasetDialog(src.dataset_id)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-mono bg-[#F7F9F8] hover:bg-[#EDF2F0] text-[#0E7490] border border-[#DCE3E1] rounded cursor-pointer"
                          >
                            <span>{src.name}</span>
                            <Info className="w-3 h-3" aria-hidden="true" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* M21 Greyed-out Mic Button with In Development badge + Text Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 bg-white border-t border-[#DCE3E1] flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
            >
              <button
                type="button"
                onClick={handleMicClick}
                aria-disabled="true"
                className="inline-flex items-center justify-center gap-2 px-3 h-10 bg-[#F1F5F9] text-[#64748B] border border-[#CBD5E1] text-xs font-medium rounded cursor-pointer shrink-0"
              >
                <Mic className="w-4 h-4 text-[#94A3B8]" aria-hidden="true" />
                <span>{language === 'fr' ? 'Micro' : 'Mic'}</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-[#E2E8F0] text-[#475569] rounded">
                  {language === 'fr' ? 'En développement' : 'In development'}
                </span>
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  language === 'fr'
                    ? `Question sur ${activeRegion?.name || regionId}...`
                    : `Ask about ${activeRegion?.name || regionId}...`
                }
                disabled={streaming}
                className="flex-1 h-10 px-3.5 text-sm bg-[#F7F9F8] border border-[#CBD5E1] rounded text-[#0F2942]"
              />

              <button
                type="submit"
                disabled={!input.trim() || streaming}
                className="inline-flex items-center justify-center gap-2 px-4 h-10 bg-[#0E7490] hover:bg-[#0B5D73] text-white text-sm font-semibold rounded transition-colors cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Send className="w-4 h-4" aria-hidden="true" />
                <span>{language === 'fr' ? 'Envoyer' : 'Send'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
