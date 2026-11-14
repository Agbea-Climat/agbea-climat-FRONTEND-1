import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar.tsx';
import { Footer } from '../components/Footer.tsx';
import { ProfilePickerModal } from '../components/ProfilePickerModal.tsx';
import { DatasetInfoModal } from '../components/DatasetInfoModal.tsx';
import { useApp } from '../context/AppContext.tsx';

export function MainLayout({ children }: { children: React.ReactNode }) {
  const { sessionReady, profile, profiles } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const didInitialRouteRef = useRef(false);

  // M04: On returning visit when landing on '/', redirect once to the saved profile's landing screen
  useEffect(() => {
    if (!sessionReady || didInitialRouteRef.current) return;
    didInitialRouteRef.current = true;
    if (location.pathname === '/' && profile) {
      const pObj = profiles.find((p) => p.id === profile);
      if (pObj && pObj.landing_screen && pObj.landing_screen !== '/') {
        navigate(pObj.landing_screen, { replace: true });
      }
    }
  }, [sessionReady, profile, profiles, location.pathname, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-white text-[#1E293B]">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <ProfilePickerModal />
      <DatasetInfoModal />
    </div>
  );
}
