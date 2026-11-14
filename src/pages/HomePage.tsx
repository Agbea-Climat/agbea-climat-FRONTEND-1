import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, Compass, Info, Microscope, Sprout, Users } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { getDashboard, getRegionsGeoJson } from '../services/climateApi.ts';
import type {
  DashboardResponse,
  ProfileId,
  RegionId,
  RegionsGeoJsonResponse,
  TrendDirection,
} from '../types/apiContract.ts';
import { TogoLeafletMap } from '../components/TogoLeafletMap.tsx';
import { EmptyDataPanel, ErrorPanel, LoadingPanel } from '../components/StatusStates.tsx';
import heroOrbitImg from '../assets/images/hero_togo_orbit_1794656420448.jpg';

function ProfileIcon({ id }: { id: ProfileId }) {
  if (id === 'farmer') return <Sprout className="w-5 h-5 text-[#1A5E36]" aria-hidden="true" />;
  if (id === 'researcher') return <Microscope className="w-5 h-5 text-[#0F2942]" aria-hidden="true" />;
  if (id === 'decision_maker') return <Building2 className="w-5 h-5 text-[#0E7490]" aria-hidden="true" />;
  return <Users className="w-5 h-5 text-[#0E7490]" aria-hidden="true" />;
}

function TrendBadgeText({ trend, language }: { trend: TrendDirection; language: 'fr' | 'en' }) {
  if (trend === 'above_normal') {
    return (
      <span className="text-xs font-semibold text-[#0E7490]">
        {language === 'fr' ? '▲ Au-dessus de la normale' : '▲ Above normal'}
      </span>
    );
  }
  if (trend === 'below_normal') {
    return (
      <span className="text-xs font-semibold text-[#B45309]">
        {language === 'fr' ? '▼ Sous la normale' : '▼ Below normal'}
      </span>
    );
  }
  return (
    <span className="text-xs font-semibold text-[#1A5E36]">
      {language === 'fr' ? '● Normal' : '● Normal'}
    </span>
  );
}

export function HomePage() {
  const {
    language,
    profile,
    profiles,
    regions,
    regionId,
    updatePreferences,
    openDatasetDialog,
  } = useApp();
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [geojson, setGeojson] = useState<RegionsGeoJsonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, geo] = await Promise.all([
        getDashboard(profile),
        getRegionsGeoJson(),
      ]);
      setDashboard(dash);
      setGeojson(geo);
    } catch (err: any) {
      setError(err?.message || 'Unable to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const mapRegionValues: Partial<Record<RegionId, number | null>> = {};
  if (dashboard) {
    for (const card of dashboard.regions) {
      mapRegionValues[card.region.id] = card.metrics[0]?.value ?? null;
    }
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-white border-b border-[#DCE3E1]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-10 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center space-y-5">
              <p className="text-xs font-semibold tracking-wider text-[#1A5E36]">
                {language === 'fr'
                  ? 'Observation terrestre · Togo & Afrique de l’Ouest'
                  : 'Earth Observation · Togo & West Africa'}
              </p>
              <h1
                className="text-3xl sm:text-4xl lg:text-[42px] font-bold text-[#0F2942] leading-[1.15] tracking-tight"
                style={{ textWrap: 'balance' }}
              >
                {language === 'fr'
                  ? "Comprendre notre environnement commence par l'observer."
                  : 'Understanding our environment begins with observing it.'}
              </h1>
              <p className="text-base text-[#334155] leading-relaxed max-w-xl">
                {language === 'fr'
                  ? 'AGBÉA CLIMAT transforme les données satellitaires de la NASA en informations environnementales accessibles pour mieux comprendre les changements qui touchent nos communautés.'
                  : 'AGBÉA CLIMAT transforms NASA satellite observations into accessible environmental intelligence for Togo and African communities.'}
              </p>

              {/* M06 "My region" selector + primary actions */}
              <div className="pt-1 flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="sm:w-56">
                  <label
                    htmlFor="home-my-region"
                    className="block text-xs font-semibold text-[#475569] mb-1"
                  >
                    {language === 'fr' ? 'Ma région' : 'My region'}
                  </label>
                  <select
                    id="home-my-region"
                    value={regionId}
                    onChange={(e) =>
                      updatePreferences({ region_id: e.target.value as RegionId })
                    }
                    className="w-full h-11 px-3 text-sm bg-white border border-[#CBD5E1] rounded text-[#0F2942]"
                  >
                    {regions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.capital})
                      </option>
                    ))}
                  </select>
                </div>

                <Link
                  to={`/carte?region=${regionId}`}
                  className="inline-flex items-center justify-center gap-2 h-11 px-5 text-sm font-semibold bg-[#0E7490] hover:bg-[#0B5D73] text-white rounded transition-colors whitespace-nowrap shrink-0"
                >
                  <Compass className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {language === 'fr' ? 'Explorer la carte' : 'Explore Map'}
                  </span>
                </Link>

                <Link
                  to="/a-propos"
                  className="inline-flex items-center justify-center h-11 px-4 text-sm font-semibold bg-white hover:bg-[#F7F9F8] text-[#0F2942] border border-[#CBD5E1] rounded transition-colors whitespace-nowrap shrink-0"
                >
                  {language === 'fr' ? 'Découvrir AGBÉA' : 'Data sources'}
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6 flex flex-col">
              <div className="flex-1 border border-[#DCE3E1] rounded overflow-hidden bg-[#F7F9F8] flex flex-col">
                <div className="relative flex-1 min-h-[240px] lg:min-h-[340px]">
                  <img
                    src={heroOrbitImg}
                    alt={
                      language === 'fr'
                        ? 'Observation satellitaire du Togo et du golfe de Guinée'
                        : 'Satellite observation of Togo and the Gulf of Guinea'
                    }
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="px-4 py-2.5 bg-[#F7F9F8] border-t border-[#DCE3E1] flex items-center justify-between text-xs text-[#475569]">
                  <span>
                    {language === 'fr'
                      ? 'Observation NASA · Golfe de Guinée & Togo'
                      : 'NASA Earth Observation · Gulf of Guinea & Togo'}
                  </span>
                  <span className="font-mono text-[#0F2942]">6°N–11°N · 0°E–2°E</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* M27 "Who is it for?" Section (4 profile cards) */}
      <section className="bg-[#F7F9F8] border-b border-[#DCE3E1]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-12">
          <div className="max-w-2xl mb-6">
            <h2 className="text-2xl font-bold text-[#0F2942] tracking-tight">
              {language === 'fr' ? 'Pour qui est conçu AGBÉA ?' : 'Who is it for?'}
            </h2>
            <p className="text-sm text-[#475569] mt-1.5">
              {language === 'fr'
                ? 'Choisissez un profil pour adapter les indicateurs et le niveau de lecture.'
                : 'Select a profile to adapt featured indicators and explanation style.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {profiles.map((p) => {
              const isSelected = profile === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={async () => {
                    await updatePreferences({
                      profile: p.id,
                      mode: p.default_mode,
                      onboarding_completed: true,
                    });
                    navigate(p.landing_screen);
                  }}
                  className={`text-left p-5 rounded border transition-colors flex flex-col justify-between space-y-4 cursor-pointer ${
                    isSelected
                      ? 'bg-white border-[#1A5E36]'
                      : 'bg-white border-[#DCE3E1] hover:border-[#0E7490]'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <ProfileIcon id={p.id} />
                      <h3 className="text-base font-semibold text-[#0F2942]">
                        {language === 'fr' ? p.title_fr : p.title_en}
                      </h3>
                    </div>
                    <p className="text-sm text-[#475569] leading-relaxed">
                      {language === 'fr' ? p.description_fr : p.description_en}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0E7490]">
                    <span>{language === 'fr' ? 'Ouvrir' : 'Open'}</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* M19 Togo Regional Dashboard */}
      <section className="bg-white border-b border-[#DCE3E1]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-[#0F2942] tracking-tight">
                {language === 'fr'
                  ? 'Situation régionale au Togo'
                  : 'Togo Regional Overview'}
              </h2>
              <p className="text-sm text-[#475569] mt-1">
                {language === 'fr'
                  ? 'Cliquez sur une région sur la carte ou sur une fiche pour ouvrir son analyse détaillée.'
                  : 'Click a region on the map or a card below to open its detailed panel.'}
              </p>
            </div>
            {dashboard && (
              <span className="text-xs font-mono text-[#475569]">
                {dashboard.reference_period}
              </span>
            )}
          </div>

          {loading ? (
            <LoadingPanel rows={4} />
          ) : error ? (
            <ErrorPanel message={error} onRetry={loadDashboard} />
          ) : !dashboard || dashboard.regions.length === 0 ? (
            <EmptyDataPanel />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left: Map of Togo colored by deviation */}
              <div className="lg:col-span-5 space-y-4">
                <TogoLeafletMap
                  geojson={geojson}
                  selectedRegionId={regionId}
                  indicator={dashboard.regions[0]?.metrics[0]?.indicator_id || 'rainfall'}
                  regionValues={mapRegionValues}
                  onSelectRegion={(rid) => navigate(`/carte?region=${rid}`)}
                  heightClassName="h-[420px]"
                />

                {/* 3 Highlights citing sources */}
                <div className="bg-[#F7F9F8] border border-[#DCE3E1] rounded p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-[#0F2942] uppercase tracking-wider">
                    {language === 'fr' ? 'Faits marquants' : 'Regional highlights'}
                  </h3>
                  <ul className="space-y-2.5">
                    {dashboard.highlights.map((hl) => (
                      <li
                        key={hl.id}
                        className="text-xs text-[#334155] leading-relaxed border-b border-[#DCE3E1] last:border-b-0 pb-2 last:pb-0"
                      >
                        <p className="font-medium text-[#0F2942]">
                          {language === 'fr' ? hl.text_fr : hl.text_en}
                        </p>
                        <div className="mt-1 flex items-center gap-1.5 text-[#64748B]">
                          <span>{hl.source}</span>
                          <button
                            type="button"
                            onClick={() => openDatasetDialog(hl.dataset_id)}
                            className="inline-flex items-center text-[#0E7490] hover:text-[#0F2942] cursor-pointer"
                            aria-label={`Source ${hl.source}`}
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Right: 5 Region Mini-Cards featuring profile's indicators */}
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {dashboard.regions.map((card) => (
                  <button
                    key={card.region.id}
                    type="button"
                    onClick={() => navigate(`/carte?region=${card.region.id}`)}
                    className={`text-left bg-white border rounded p-5 transition-colors cursor-pointer space-y-3 ${
                      card.region.id === regionId
                        ? 'border-[#0E7490] bg-[#F7F9F8]'
                        : 'border-[#DCE3E1] hover:border-[#0E7490]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-[#0F2942]">
                          {card.region.name}
                        </h3>
                        <p className="text-xs text-[#64748B]">
                          {language === 'fr' ? 'Chef-lieu :' : 'Capital:'} {card.region.capital}
                        </p>
                      </div>
                      <TrendBadgeText trend={card.trend} language={language} />
                    </div>

                    <div className="pt-2 border-t border-[#DCE3E1] grid grid-cols-2 gap-3">
                      {card.metrics.map((m) => (
                        <div key={m.indicator_id}>
                          <div className="text-[11px] text-[#475569]">
                            {language === 'fr' ? m.label_fr : m.label_en}
                          </div>
                          <div className="font-mono text-sm font-semibold text-[#0F2942] mt-0.5">
                            {m.value !== null ? `${m.value} ${m.unit}` : 'N/D'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
