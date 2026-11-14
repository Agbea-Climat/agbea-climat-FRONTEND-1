import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  createSession,
  getHealth,
  getMeta,
  getProfiles,
  getRegions,
  getSession,
  patchSessionPreferences,
} from '../services/climateApi.ts';
import type {
  ConversationSummary,
  ExperienceMode,
  LanguageCode,
  MetaResponse,
  ProfileId,
  RegionId,
  RegionInfo,
  UserProfile,
} from '../types/apiContract.ts';

interface AppContextValue {
  apiHealthy: boolean;
  meta: MetaResponse | null;
  profiles: UserProfile[];
  regions: RegionInfo[];
  sessionId: string | null;
  sessionReady: boolean;
  profile: ProfileId | null;
  regionId: RegionId;
  language: LanguageCode;
  mode: ExperienceMode;
  conversations: ConversationSummary[];
  showProfilePicker: boolean;
  setShowProfilePicker: (open: boolean) => void;
  activeDatasetId: string | null;
  openDatasetDialog: (datasetId: string) => void;
  closeDatasetDialog: () => void;
  updatePreferences: (patch: {
    profile?: ProfileId;
    region_id?: RegionId;
    language?: LanguageCode;
    mode?: ExperienceMode;
    onboarding_completed?: boolean;
  }) => Promise<void>;
  refreshSession: () => Promise<void>;
  recheckHealth: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [apiHealthy, setApiHealthy] = useState<boolean>(true);
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [regions, setRegions] = useState<RegionInfo[]>([]);

  const [sessionId, setSessionId] = useState<string | null>(
    () => localStorage.getItem('session_id')
  );
  const [sessionReady, setSessionReady] = useState<boolean>(false);
  const [profile, setProfile] = useState<ProfileId | null>(null);
  const [regionId, setRegionId] = useState<RegionId>('kara');
  const [language, setLanguage] = useState<LanguageCode>('fr');
  const [mode, setMode] = useState<ExperienceMode>('public');
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [showProfilePicker, setShowProfilePicker] = useState<boolean>(false);
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null);

  const recheckHealth = useCallback(async () => {
    try {
      const h = await getHealth();
      setApiHealthy(h.status === 'ok');
    } catch {
      setApiHealthy(false);
    }
  }, []);

  const hydrateSession = useCallback(async () => {
    const existingId = localStorage.getItem('session_id');
    if (existingId) {
      try {
        const s = await getSession(existingId);
        setSessionId(s.session_id);
        setProfile(s.preferences.profile);
        setRegionId(s.preferences.region_id);
        setLanguage(s.preferences.language);
        setMode(s.preferences.mode);
        setConversations(s.conversations || []);
        setShowProfilePicker(!s.onboarding_completed);
        setSessionReady(true);
        return;
      } catch {
        // Session expired or not found on backend -> create new session
        localStorage.removeItem('session_id');
      }
    }

    try {
      const created = await createSession();
      localStorage.setItem('session_id', created.session_id);
      setSessionId(created.session_id);
      setProfile(created.preferences.profile);
      setRegionId(created.preferences.region_id);
      setLanguage(created.preferences.language);
      setMode(created.preferences.mode);
      setConversations(created.conversations || []);
      setShowProfilePicker(!created.onboarding_completed);
    } catch {
      // Backend offline; M01 banner handles error state
    } finally {
      setSessionReady(true);
    }
  }, []);

  useEffect(() => {
    recheckHealth();
    getMeta().then(setMeta).catch(() => {});
    getProfiles().then((res) => setProfiles(res.profiles)).catch(() => {});
    getRegions().then((res) => setRegions(res.regions)).catch(() => {});
    hydrateSession();
  }, [recheckHealth, hydrateSession]);

  const updatePreferences = useCallback(
    async (patch: {
      profile?: ProfileId;
      region_id?: RegionId;
      language?: LanguageCode;
      mode?: ExperienceMode;
      onboarding_completed?: boolean;
    }) => {
      if (patch.profile !== undefined) setProfile(patch.profile);
      if (patch.region_id !== undefined) setRegionId(patch.region_id);
      if (patch.language !== undefined) setLanguage(patch.language);
      if (patch.mode !== undefined) setMode(patch.mode);

      const sid = sessionId || localStorage.getItem('session_id');
      if (!sid) return;
      try {
        const updated = await patchSessionPreferences(sid, patch);
        setConversations(updated.conversations || []);
      } catch {
        // Silent preference sync failure shouldn't block UI interaction
      }
    },
    [sessionId]
  );

  const refreshSession = useCallback(async () => {
    const sid = sessionId || localStorage.getItem('session_id');
    if (!sid) return;
    try {
      const s = await getSession(sid);
      setConversations(s.conversations || []);
    } catch {
      // ignore
    }
  }, [sessionId]);

  return (
    <AppContext.Provider
      value={{
        apiHealthy,
        meta,
        profiles,
        regions,
        sessionId,
        sessionReady,
        profile,
        regionId,
        language,
        mode,
        conversations,
        showProfilePicker,
        setShowProfilePicker,
        activeDatasetId,
        openDatasetDialog: (id) => setActiveDatasetId(id),
        closeDatasetDialog: () => setActiveDatasetId(null),
        updatePreferences,
        refreshSession,
        recheckHealth,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return ctx;
}
