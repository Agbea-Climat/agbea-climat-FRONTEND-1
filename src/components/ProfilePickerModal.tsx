import { useNavigate } from 'react-router-dom';
import { Building2, Microscope, Sprout, Users, X } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import type { ProfileId, UserProfile } from '../types/apiContract.ts';

function ProfileIcon({ id }: { id: ProfileId }) {
  if (id === 'farmer') return <Sprout className="w-5 h-5 text-[#1A5E36]" aria-hidden="true" />;
  if (id === 'researcher') return <Microscope className="w-5 h-5 text-[#0F2942]" aria-hidden="true" />;
  if (id === 'decision_maker') return <Building2 className="w-5 h-5 text-[#0E7490]" aria-hidden="true" />;
  return <Users className="w-5 h-5 text-[#0E7490]" aria-hidden="true" />;
}

export function ProfilePickerModal() {
  const {
    showProfilePicker,
    setShowProfilePicker,
    profiles,
    profile: currentProfile,
    language,
    updatePreferences,
  } = useApp();
  const navigate = useNavigate();

  if (!showProfilePicker || profiles.length === 0) return null;

  const handleSelectProfile = async (p: UserProfile) => {
    await updatePreferences({
      profile: p.id,
      mode: p.default_mode,
      onboarding_completed: true,
    });
    setShowProfilePicker(false);
    navigate(p.landing_screen);
  };

  const handleSkip = async () => {
    await updatePreferences({ onboarding_completed: true });
    setShowProfilePicker(false);
  };

  return (
    <div
      className="fixed inset-0 z-[1200] bg-[#0F2942]/60 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-picker-title"
    >
      <div className="bg-white border border-[#DCE3E1] rounded max-w-2xl w-full p-6 sm:p-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="profile-picker-title" className="text-2xl font-bold text-[#0F2942]">
              {language === 'fr' ? 'Vous êtes… ?' : 'You are…?'}
            </h2>
            <p className="text-sm text-[#475569] mt-1">
              {language === 'fr'
                ? 'Choisissez votre profil pour adapter les indicateurs et explications à vos besoins.'
                : 'Choose your profile so indicators and explanations match your needs.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs font-semibold text-[#475569] hover:text-[#0F2942] inline-flex items-center gap-1 cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {profiles.map((p) => {
            const isActive = currentProfile === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectProfile(p)}
                className={`text-left p-4 rounded border transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#F0F7F4] border-[#1A5E36]'
                    : 'bg-[#F7F9F8] border-[#DCE3E1] hover:border-[#0E7490] hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <ProfileIcon id={p.id} />
                  <span className="text-base font-semibold text-[#0F2942]">
                    {language === 'fr' ? p.title_fr : p.title_en}
                  </span>
                </div>
                <p className="text-xs text-[#475569] leading-relaxed">
                  {language === 'fr' ? p.description_fr : p.description_en}
                </p>
              </button>
            );
          })}
        </div>

        <div className="pt-2 border-t border-[#DCE3E1] flex items-center justify-between">
          <span className="text-xs text-[#64748B]">
            {language === 'fr'
              ? 'Modifiable à tout moment depuis le menu.'
              : 'You can change this anytime from the menu.'}
          </span>
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm font-semibold text-[#0E7490] hover:underline cursor-pointer"
          >
            {language === 'fr' ? 'Passer' : 'Skip'}
          </button>
        </div>
      </div>
    </div>
  );
}
