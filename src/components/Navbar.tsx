import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronDown, Menu, X } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

export function Navbar() {
  const {
    apiHealthy,
    recheckHealth,
    meta,
    language,
    mode,
    profile,
    profiles,
    setShowProfilePicker,
    updatePreferences,
  } = useApp();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
    setModeMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setModeMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const navItems = [
    { to: '/', label: language === 'fr' ? 'Accueil' : 'Home', end: true },
    { to: '/carte', label: language === 'fr' ? 'Explorer la carte' : 'Explore Map', end: false },
    { to: '/comparer', label: language === 'fr' ? 'Comparer' : 'Before / After', end: false },
    { to: '/assistant', label: language === 'fr' ? 'Assistant AGBÉA' : 'AI Chat', end: false },
    { to: '/a-propos', label: language === 'fr' ? 'À propos' : 'Data sources', end: false },
  ];

  const activeProfileObj = profiles.find((p) => p.id === profile);
  const activeProfileTitle = activeProfileObj
    ? language === 'fr'
      ? activeProfileObj.title_fr
      : activeProfileObj.title_en
    : null;

  const handleSelectMode = async (targetMode: 'public' | 'scientific', path: string) => {
    await updatePreferences({ mode: targetMode });
    setModeMenuOpen(false);
    navigate(path);
  };

  return (
    <div className="sticky top-0 z-[1100]">
      {/* M01 Global Health Banner */}
      {!apiHealthy && (
        <div
          className="bg-[#B91C1C] text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-3"
          role="alert"
        >
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>
            {language === 'fr'
              ? 'Service temporairement indisponible'
              : 'Service temporarily unavailable'}
          </span>
          <button
            type="button"
            onClick={recheckHealth}
            className="underline hover:no-underline cursor-pointer"
          >
            {language === 'fr' ? 'Réessayer' : 'Retry'}
          </button>
        </div>
      )}

      <header className="bg-[#0F2942] text-white border-b border-[#1E3A5F]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
          {/* Zone 1: Brand logo */}
          <Link
            to="/"
            className="flex items-center shrink-0 rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#38BDF8]"
            aria-label="AGBÉA CLIMAT"
          >
            <img
              src="/assets/aistudio/agbeaclimat_logo_8ca34e04.png"
              alt="AGBÉA CLIMAT"
              className="h-9 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
          </Link>

          {/* Zone 2: Nav links */}
          <nav className="hidden lg:flex items-center gap-6" aria-label="Navigation principale">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `text-sm font-medium whitespace-nowrap shrink-0 py-1.5 border-b-2 transition-colors duration-150 ${
                    isActive
                      ? 'text-white border-[#38BDF8]'
                      : 'text-[#CBD5E1] border-transparent hover:text-white hover:border-[#64748B]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Zone 3: Language selector (incl. Ewe — Planned) + Mode & Profile menu */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <div
              className="flex items-center border border-[#2C4B6E] rounded bg-[#0A1D30]"
              role="group"
              aria-label="Language"
            >
              <button
                type="button"
                onClick={() => updatePreferences({ language: 'fr' })}
                className={`px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                  language === 'fr' ? 'bg-[#0E7490] text-white' : 'text-[#CBD5E1] hover:text-white'
                }`}
              >
                FR
              </button>
              <button
                type="button"
                onClick={() => updatePreferences({ language: 'en' })}
                className={`px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                  language === 'en' ? 'bg-[#0E7490] text-white' : 'text-[#CBD5E1] hover:text-white'
                }`}
              >
                EN
              </button>
              <span
                className="px-2.5 py-1.5 text-[11px] text-[#94A3B8] border-l border-[#2C4B6E] whitespace-nowrap shrink-0"
                title={meta?.features.ewe === 'planned' ? 'Ewe — Planned' : 'Ewe'}
              >
                {language === 'fr' ? 'Éwé — En projet' : 'Ewe — Planned'}
              </span>
            </div>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setModeMenuOpen((v) => !v)}
                aria-expanded={modeMenuOpen}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-[#1A5E36] hover:bg-[#154D2C] text-white rounded border border-[#277A49] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>
                  {mode === 'scientific'
                    ? language === 'fr'
                      ? 'Mode scientifique'
                      : 'Scientific mode'
                    : language === 'fr'
                    ? 'Mode public'
                    : 'Public mode'}
                </span>
                <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
              </button>

              {modeMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white text-[#0F2942] border border-[#DCE3E1] rounded py-1 z-50">
                  <button
                    type="button"
                    onClick={() => handleSelectMode('public', '/grand-public')}
                    className="w-full text-left px-4 py-2.5 hover:bg-[#F7F9F8] cursor-pointer border-b border-[#DCE3E1]"
                  >
                    <div className="text-sm font-semibold text-[#0F2942]">
                      {language === 'fr' ? 'Mode grand public / Agriculture' : 'Agriculture / Public mode'}
                    </div>
                    <div className="text-xs text-[#475569] mt-0.5">
                      {language === 'fr'
                        ? 'Conseils simples, sans jargon'
                        : 'Plain language and seasonal tips'}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectMode('scientific', '/scientifique')}
                    className="w-full text-left px-4 py-2.5 hover:bg-[#F7F9F8] cursor-pointer border-b border-[#DCE3E1]"
                  >
                    <div className="text-sm font-semibold text-[#0F2942]">
                      {language === 'fr' ? 'Mode scientifique' : 'Scientific mode'}
                    </div>
                    <div className="text-xs text-[#475569] mt-0.5">
                      {language === 'fr'
                        ? 'Séries NASA, sources & export CSV'
                        : 'Time series, sources & CSV export'}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModeMenuOpen(false);
                      setShowProfilePicker(true);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-[#F7F9F8] cursor-pointer"
                  >
                    <div className="text-xs font-semibold text-[#0E7490]">
                      {language === 'fr' ? 'Changer de profil' : 'Change profile'}
                      {activeProfileTitle ? ` (${activeProfileTitle})` : ''}
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden inline-flex items-center justify-center w-11 h-11 rounded border border-[#2C4B6E] text-white hover:bg-[#163656] cursor-pointer"
            aria-label="Menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="lg:hidden bg-[#0F2942] border-t border-[#1E3A5F] px-4 py-4 space-y-3">
            <nav className="flex flex-col space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `px-3 py-2.5 text-sm font-medium rounded ${
                      isActive ? 'bg-[#163656] text-white' : 'text-[#CBD5E1] hover:text-white'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="pt-3 border-t border-[#1E3A5F] grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleSelectMode('public', '/grand-public')}
                className="px-3 py-2.5 text-sm font-semibold bg-[#1A5E36] text-white rounded text-center cursor-pointer"
              >
                {language === 'fr' ? 'Mode grand public / Agriculture' : 'Agriculture / Public mode'}
              </button>
              <button
                type="button"
                onClick={() => handleSelectMode('scientific', '/scientifique')}
                className="px-3 py-2.5 text-sm font-semibold bg-[#0E7490] text-white rounded text-center cursor-pointer"
              >
                {language === 'fr' ? 'Mode scientifique' : 'Scientific mode'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  setShowProfilePicker(true);
                }}
                className="px-3 py-2 text-xs font-semibold text-[#BAE6FD] text-center cursor-pointer"
              >
                {language === 'fr' ? 'Changer de profil' : 'Change profile'}
              </button>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-[#1E3A5F] text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updatePreferences({ language: 'fr' })}
                  className={`px-2.5 py-1 rounded cursor-pointer ${
                    language === 'fr' ? 'bg-[#0E7490] text-white' : 'text-[#CBD5E1]'
                  }`}
                >
                  FR
                </button>
                <button
                  type="button"
                  onClick={() => updatePreferences({ language: 'en' })}
                  className={`px-2.5 py-1 rounded cursor-pointer ${
                    language === 'en' ? 'bg-[#0E7490] text-white' : 'text-[#CBD5E1]'
                  }`}
                >
                  EN
                </button>
              </div>
              <span className="text-[#94A3B8]">
                {language === 'fr' ? 'Éwé — En projet' : 'Ewe — Planned'}
              </span>
            </div>
          </div>
        )}
      </header>
    </div>
  );
}
