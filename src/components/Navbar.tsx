import { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AlertCircle, Menu, UserCheck, X } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

export function Navbar() {
  const {
    apiHealthy,
    recheckHealth,
    meta,
    language,
    setShowProfilePicker,
    updatePreferences,
  } = useApp();

  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const navItems = [
    { to: '/', label: language === 'fr' ? 'Accueil' : 'Home', end: true },
    { to: '/carte', label: language === 'fr' ? 'Explorer la carte' : 'Explore Map', end: false },
    { to: '/comparer', label: language === 'fr' ? 'Comparer' : 'Before / After', end: false },
    { to: '/assistant', label: language === 'fr' ? 'Assistant AGBÉA' : 'AI Chat', end: false },
    { to: '/a-propos', label: language === 'fr' ? 'À propos' : 'Data sources', end: false },
  ];

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

            <button
              type="button"
              onClick={() => setShowProfilePicker(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-[#1A5E36] hover:bg-[#154D2C] text-white rounded border border-[#277A49] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{language === 'fr' ? 'Changer de profil' : 'Change profile'}</span>
            </button>
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

            <div className="pt-3 border-t border-[#1E3A5F]">
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  setShowProfilePicker(true);
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-semibold bg-[#1A5E36] hover:bg-[#154D2C] text-white rounded cursor-pointer"
              >
                <UserCheck className="w-4 h-4" aria-hidden="true" />
                <span>{language === 'fr' ? 'Changer de profil' : 'Change profile'}</span>
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
