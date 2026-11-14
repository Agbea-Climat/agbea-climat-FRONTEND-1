import type { ExperienceMode, Language } from '../types/climate.ts';
import { fetchJson } from './api.ts';

export interface AssistantReply {
  reply: string;
  locationName: string;
  regionName: string;
  source: string;
}

export async function sendAssistantMessage(payload: {
  message: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  locationId: string;
  language: Language;
  mode: ExperienceMode;
}): Promise<AssistantReply> {
  return fetchJson<AssistantReply>('/api/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function transcribeAudio(payload: {
  audioBase64: string;
  mimeType: string;
  language: Language;
}): Promise<{ transcript: string }> {
  return fetchJson<{ transcript: string }>('/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function synthesizeSpeech(payload: {
  text: string;
  language: Language;
}): Promise<{ audioBase64: string; mimeType: string }> {
  return fetchJson<{ audioBase64: string; mimeType: string }>('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
