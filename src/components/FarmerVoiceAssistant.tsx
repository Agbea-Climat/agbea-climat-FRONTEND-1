import { useCallback, useEffect, useRef, useState } from 'react';
import { Info, Mic, RotateCcw, Square, Volume2 } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { detectBackendMode } from '../services/apiClient.ts';
import {
  sendChatFallback,
  synthesizeSpeech,
  transcribeVoiceAudio,
} from '../services/climateApi.ts';
import type {
  ChatSourceRef,
  LanguageCode,
  RegionId,
} from '../types/apiContract.ts';

interface VoiceTurn {
  id: string;
  question: string;
  answer: string;
  spokenLanguage: LanguageCode;
  sources: ChatSourceRef[];
  audioUrl?: string;
}

type VoicePhase = 'idle' | 'listening' | 'processing' | 'speaking';

function detectSpokenLanguage(text: string, fallback: LanguageCode): LanguageCode {
  const lower = ` ${text.toLowerCase()} `;
  const frScore = [
    ' la ',
    ' le ',
    ' les ',
    ' des ',
    ' est ',
    ' pluie ',
    ' pluies ',
    ' quel ',
    ' quelle ',
    ' comment ',
    ' pour ',
    ' dans ',
    ' ma ',
    ' mes ',
    ' végétation ',
    ' culture ',
    ' cultures ',
    ' bonjour ',
    ' merci ',
  ].reduce((acc, w) => acc + (lower.includes(w) ? 1 : 0), 0);

  const enScore = [
    ' the ',
    ' is ',
    ' are ',
    ' rain ',
    ' rainfall ',
    ' what ',
    ' how ',
    ' will ',
    ' for ',
    ' my ',
    ' crops ',
    ' vegetation ',
    ' temperature ',
    ' weather ',
    ' hello ',
    ' thank ',
  ].reduce((acc, w) => acc + (lower.includes(w) ? 1 : 0), 0);

  if (frScore > enScore) return 'fr';
  if (enScore > frScore) return 'en';
  return fallback;
}

function pickSpeechSynthesisVoice(lang: LanguageCode): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  const prefix = lang === 'fr' ? 'fr' : 'en';
  return (
    voices.find((v) => v.lang.toLowerCase().startsWith(prefix) && v.localService) ||
    voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) ||
    null
  );
}

export function FarmerVoiceAssistant() {
  const {
    language,
    regionId,
    regions,
    sessionId,
    updatePreferences,
    refreshSession,
    openDatasetDialog,
  } = useApp();

  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [interimText, setInterimText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [turns, setTurns] = useState<VoiceTurn[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [speakingTurnId, setSpeakingTurnId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const recognitionFinalRef = useRef<string>('');
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const serverSttUnavailableRef = useRef<boolean>(false);

  const activeRegion = regions.find((r) => r.id === regionId);

  const stopPlayback = useCallback(() => {
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.currentTime = 0;
      audioElRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingTurnId(null);
    setPhase((prev) => (prev === 'speaking' ? 'idle' : prev));
  }, []);

  useEffect(() => {
    return () => {
      stopPlayback();
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      try {
        recognitionRef.current?.abort();
      } catch {
        // ignore cleanup error
      }
    };
  }, [stopPlayback]);

  const speakWithBrowser = useCallback(
    (text: string, lang: LanguageCode, turnId: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        setPhase('idle');
        setSpeakingTurnId(null);
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'fr' ? 'fr-FR' : 'en-US';
      utterance.rate = 0.95;
      const voice = pickSpeechSynthesisVoice(lang);
      if (voice) utterance.voice = voice;

      setPhase('speaking');
      setSpeakingTurnId(turnId);

      utterance.onend = () => {
        setPhase('idle');
        setSpeakingTurnId(null);
      };
      utterance.onerror = () => {
        setPhase('idle');
        setSpeakingTurnId(null);
      };

      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 40);
    },
    []
  );

  const playTurnAudio = useCallback(
    async (turn: VoiceTurn) => {
      stopPlayback();
      setPhase('speaking');
      setSpeakingTurnId(turn.id);

      if (turn.audioUrl) {
        const audio = new Audio(turn.audioUrl);
        audioElRef.current = audio;
        audio.onended = () => {
          setPhase('idle');
          setSpeakingTurnId(null);
        };
        audio.onerror = () => {
          speakWithBrowser(turn.answer, turn.spokenLanguage, turn.id);
        };
        try {
          await audio.play();
          return;
        } catch {
          speakWithBrowser(turn.answer, turn.spokenLanguage, turn.id);
          return;
        }
      }

      speakWithBrowser(turn.answer, turn.spokenLanguage, turn.id);
    },
    [stopPlayback, speakWithBrowser]
  );

  const processSpokenQuestion = useCallback(
    async (questionText: string) => {
      const cleaned = questionText.trim();
      if (!cleaned) {
        setPhase('idle');
        setErrorMsg(
          language === 'fr'
            ? 'Aucune parole détectée. Veuillez réessayer.'
            : 'No speech detected. Please try again.'
        );
        return;
      }

      setPhase('processing');
      setInterimText('');
      setErrorMsg(null);

      const spokenLang = detectSpokenLanguage(cleaned, language);

      try {
        const reply = await sendChatFallback({
          session_id: sessionId,
          thread_id: threadId,
          message: cleaned,
          region_id: regionId,
          profile: 'farmer',
          language: spokenLang,
          mode: 'public',
        });

        setThreadId(reply.thread_id);
        refreshSession();

        // Try Gemini TTS on backend; falls back gracefully to null in standalone Vercel mode
        const tts = await synthesizeSpeech({
          text: reply.answer,
          language: spokenLang,
        });

        const audioUrl = tts?.audioBase64
          ? `data:${tts.mimeType || 'audio/wav'};base64,${tts.audioBase64}`
          : undefined;

        const newTurn: VoiceTurn = {
          id: `vt-${Date.now()}`,
          question: cleaned,
          answer: reply.answer,
          spokenLanguage: spokenLang,
          sources: reply.sources || [],
          audioUrl,
        };

        setTurns((prev) => [newTurn, ...prev]);
        await playTurnAudio(newTurn);
      } catch (err: any) {
        setPhase('idle');
        setErrorMsg(
          err?.message ||
            (language === 'fr'
              ? 'Impossible de préparer la réponse vocale.'
              : 'Unable to prepare voice response.')
        );
      }
    },
    [language, sessionId, threadId, regionId, refreshSession, playTurnAudio]
  );

  const startBrowserSpeechRecognition = useCallback(() => {
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      setPhase('idle');
      setErrorMsg(
        language === 'fr'
          ? 'Le microphone vocal direct n’est pas pris en charge par ce navigateur. Utilisez un des boutons ci-dessous ou essayez Chrome / Safari.'
          : 'Live browser speech input is not supported in this browser. Use one of the quick voice buttons below or try Chrome / Safari.'
      );
      return;
    }

    const recognition = new SpeechRec();
    recognition.lang = language === 'fr' ? 'fr-FR' : 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognitionFinalRef.current = '';
    setInterimText('');
    setErrorMsg(null);
    setPhase('listening');

    recognition.onresult = (event: any) => {
      let interim = '';
      let finalChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) {
          finalChunk += transcript;
        } else {
          interim += transcript;
        }
      }
      if (finalChunk) {
        recognitionFinalRef.current = `${recognitionFinalRef.current} ${finalChunk}`.trim();
      }
      setInterimText(recognitionFinalRef.current || interim);
    };

    recognition.onerror = (event: any) => {
      setPhase('idle');
      if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') {
        setErrorMsg(
          language === 'fr'
            ? 'Autorisez l’accès au microphone dans votre navigateur pour parler.'
            : 'Please allow microphone access in your browser to speak.'
        );
      } else if (event?.error !== 'aborted') {
        setErrorMsg(
          language === 'fr'
            ? 'Erreur microphone. Appuyez à nouveau pour parler.'
            : 'Microphone error. Tap again to speak.'
        );
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      const finalText = recognitionFinalRef.current.trim();
      if (finalText) {
        processSpokenQuestion(finalText);
      } else {
        setPhase((prev) => (prev === 'listening' ? 'idle' : prev));
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [language, processSpokenQuestion]);

  const startBackendRecording = useCallback(async () => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function' ||
      typeof MediaRecorder === 'undefined'
    ) {
      startBrowserSpeechRecognition();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;

        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });

        if (blob.size < 400) {
          setPhase('idle');
          setErrorMsg(
            language === 'fr'
              ? 'Enregistrement trop court. Parlez un peu plus longtemps.'
              : 'Recording was too short. Please speak a little longer.'
          );
          return;
        }

        setPhase('processing');
        try {
          const base64: string = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(new Error('Audio read error'));
            reader.readAsDataURL(blob);
          });

          const transcribed = await transcribeVoiceAudio({
            audioBase64: base64,
            mimeType: blob.type || 'audio/webm',
            language,
          });

          await processSpokenQuestion(transcribed.text);
        } catch {
          serverSttUnavailableRef.current = true;
          const hasWebSpeech =
            typeof window !== 'undefined' &&
            Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
          setPhase('idle');
          setErrorMsg(
            language === 'fr'
              ? hasWebSpeech
                ? 'Transcription serveur indisponible. Appuyez à nouveau sur le micro pour utiliser la reconnaissance vocale du navigateur.'
                : 'Impossible de transcrire la voix pour le moment. Essayez un bouton rapide ci-dessous.'
              : hasWebSpeech
              ? 'Server transcription unavailable. Tap the microphone again to use browser voice recognition.'
              : 'Unable to transcribe audio right now. Try one of the quick voice topics below.'
          );
        }
      };

      mediaRecorderRef.current = recorder;
      setErrorMsg(null);
      setInterimText('');
      setPhase('listening');
      recorder.start();
    } catch {
      // Fallback to browser Web Speech if MediaRecorder stream denied or unavailable
      startBrowserSpeechRecognition();
    }
  }, [language, processSpokenQuestion, startBrowserSpeechRecognition]);

  const handleToggleMic = async () => {
    if (phase === 'speaking') {
      stopPlayback();
      return;
    }

    if (phase === 'listening') {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      } else if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          setPhase('idle');
        }
      }
      return;
    }

    if (phase === 'processing') return;

    stopPlayback();
    const backendMode = await detectBackendMode();
    if (
      backendMode === 'backend' &&
      !serverSttUnavailableRef.current &&
      typeof navigator !== 'undefined' &&
      Boolean(navigator.mediaDevices) &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof MediaRecorder !== 'undefined'
    ) {
      await startBackendRecording();
    } else {
      startBrowserSpeechRecognition();
    }
  };

  const quickVoicePrompts =
    language === 'fr'
      ? [
          'Comment sont les pluies ce mois-ci ?',
          'Quel est l’état de la végétation et du sol ?',
          'Quels conseils pratiques pour mes cultures ?',
        ]
      : [
          'How is rainfall this month?',
          'How is vegetation and soil moisture right now?',
          'What practical tips do you have for my crops?',
        ];

  return (
    <div className="max-w-[960px] mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header with Region & Spoken Language Selector */}
      <div className="pb-5 border-b border-[#DCE3E1] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#1A5E36]">
            {language === 'fr'
              ? 'Profil Agriculteur · Assistant vocal'
              : 'Farmer Profile · Voice Assistant'}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F2942] mt-1">
            {language === 'fr'
              ? 'Parlez en français ou en anglais'
              : 'Speak in French or English'}
          </h1>
          <p className="text-sm text-[#475569] mt-1">
            {language === 'fr'
              ? 'Pas besoin d’écrire : posez votre question à voix haute et écoutez la réponse.'
              : 'No typing needed: ask your question out loud and hear the response.'}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="voice-lang" className="block text-xs font-semibold text-[#475569] mb-1">
              {language === 'fr' ? 'Langue vocale' : 'Voice language'}
            </label>
            <div
              id="voice-lang"
              className="flex items-center border border-[#CBD5E1] rounded bg-white h-10 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => updatePreferences({ language: 'fr' })}
                className={`px-3 h-full text-xs font-semibold cursor-pointer ${
                  language === 'fr' ? 'bg-[#1A5E36] text-white' : 'text-[#334155] hover:bg-[#F7F9F8]'
                }`}
              >
                Français
              </button>
              <button
                type="button"
                onClick={() => updatePreferences({ language: 'en' })}
                className={`px-3 h-full text-xs font-semibold border-l border-[#CBD5E1] cursor-pointer ${
                  language === 'en' ? 'bg-[#1A5E36] text-white' : 'text-[#334155] hover:bg-[#F7F9F8]'
                }`}
              >
                English
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="voice-region" className="block text-xs font-semibold text-[#475569] mb-1">
              {language === 'fr' ? 'Ma région' : 'My region'}
            </label>
            <select
              id="voice-region"
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
        </div>
      </div>

      {/* Main Push-to-Speak Voice Console (No Text Input Needed) */}
      <div className="bg-[#F7F9F8] border border-[#DCE3E1] rounded p-6 sm:p-10 flex flex-col items-center text-center space-y-5">
        <button
          type="button"
          onClick={handleToggleMic}
          disabled={phase === 'processing'}
          aria-pressed={phase === 'listening'}
          className={`w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60 ${
            phase === 'listening'
              ? 'bg-[#B91C1C] border-[#FECACA] text-white'
              : phase === 'speaking'
              ? 'bg-[#0E7490] border-[#BAE6FD] text-white'
              : 'bg-[#1A5E36] hover:bg-[#154D2C] border-[#BBF7D0] text-white'
          }`}
        >
          {phase === 'listening' || phase === 'speaking' ? (
            <Square className="w-8 h-8" aria-hidden="true" />
          ) : (
            <Mic className="w-9 h-9" aria-hidden="true" />
          )}
          <span className="text-xs font-semibold">
            {phase === 'listening'
              ? language === 'fr'
                ? 'Arrêter'
                : 'Stop'
              : phase === 'speaking'
              ? language === 'fr'
                ? 'Couper'
                : 'Mute'
              : phase === 'processing'
              ? '...'
              : language === 'fr'
              ? 'Parler'
              : 'Speak'}
          </span>
        </button>

        <div className="space-y-1.5 max-w-md">
          <div className="text-base font-bold text-[#0F2942]">
            {phase === 'listening'
              ? language === 'fr'
                ? 'Je vous écoute… Appuyez pour terminer'
                : 'Listening… Tap to finish'
              : phase === 'processing'
              ? language === 'fr'
                ? `Consultation des données NASA pour ${activeRegion?.name || regionId}…`
                : `Checking NASA data for ${activeRegion?.name || regionId}…`
              : phase === 'speaking'
              ? language === 'fr'
                ? 'Réponse vocale en cours…'
                : 'Playing voice response…'
              : language === 'fr'
              ? 'Appuyez sur le micro et posez votre question'
              : 'Tap the microphone and ask your question'}
          </div>

          {interimText && (
            <p className="text-sm text-[#0E7490] font-medium bg-white border border-[#DCE3E1] rounded px-3 py-2">
              “{interimText}”
            </p>
          )}
        </div>

        {errorMsg && (
          <div
            className="w-full max-w-lg px-4 py-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded text-xs font-medium text-[#991B1B]"
            role="alert"
          >
            {errorMsg}
          </div>
        )}

        {/* Quick 1-tap spoken prompts (zero typing) */}
        <div className="w-full pt-4 border-t border-[#DCE3E1] space-y-2.5">
          <p className="text-xs font-semibold text-[#475569]">
            {language === 'fr'
              ? 'Ou appuyez directement sur une question pour écouter la réponse :'
              : 'Or tap a question directly to hear the voice answer:'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {quickVoicePrompts.map((q) => (
              <button
                key={q}
                type="button"
                disabled={phase === 'processing' || phase === 'listening'}
                onClick={() => processSpokenQuestion(q)}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-white hover:bg-[#EDF2F0] text-[#0F2942] border border-[#CBD5E1] rounded transition-colors cursor-pointer disabled:opacity-50"
              >
                <Volume2 className="w-4 h-4 text-[#1A5E36] shrink-0" aria-hidden="true" />
                <span>{q}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Voice Conversation History with Audio Replay */}
      {turns.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-[#0F2942]">
            {language === 'fr' ? 'Réponses vocales récentes' : 'Recent voice answers'}
          </h2>
          <div className="space-y-3">
            {turns.map((turn) => {
              const isPlaying = speakingTurnId === turn.id && phase === 'speaking';
              return (
                <div
                  key={turn.id}
                  className="bg-white border border-[#DCE3E1] rounded p-5 space-y-3"
                >
                  <div className="text-xs font-semibold text-[#475569]">
                    {turn.spokenLanguage === 'fr' ? 'Vous avez demandé :' : 'You asked:'}{' '}
                    <span className="text-[#0F2942]">“{turn.question}”</span>
                  </div>

                  <p className="text-base text-[#0F2942] leading-relaxed font-medium">
                    {turn.answer}
                  </p>

                  <div className="pt-2 border-t border-[#DCE3E1] flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => (isPlaying ? stopPlayback() : playTurnAudio(turn))}
                      className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-[#1A5E36] hover:bg-[#154D2C] text-white rounded cursor-pointer"
                    >
                      {isPlaying ? (
                        <>
                          <Square className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{language === 'fr' ? 'Arrêter' : 'Stop'}</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{language === 'fr' ? 'Réécouter' : 'Replay voice'}</span>
                        </>
                      )}
                    </button>

                    <div className="flex flex-wrap items-center gap-2">
                      {turn.sources.map((src) => (
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
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
