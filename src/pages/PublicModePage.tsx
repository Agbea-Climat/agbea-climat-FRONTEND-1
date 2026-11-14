import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CloudRain, Info, MessageSquare, Sprout, Sun } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { getRegionAgriculture } from '../services/climateApi.ts';
import type { AgricultureModeResponse, RegionId } from '../types/apiContract.ts';
import { EmptyDataPanel, ErrorPanel, LoadingPanel } from '../components/StatusStates.tsx';

export function PublicModePage() {
  const { language, regions, regionId, updatePreferences, openDatasetDialog } = useApp();
  const [data, setData] = useState<AgricultureModeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAgri = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getRegionAgriculture(regionId);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Unable to load agriculture view.');
    } finally {
      setLoading(false);
    }
  }, [regionId]);

  useEffect(() => {
    loadAgri();
  }, [loadAgri]);

  return (
    <div className="max-w-[1160px] mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Header + Disclaimer visible immediately above the fold on 360px screens */}
      <div className="pb-4 border-b border-[#DCE3E1] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-[#1A5E36]">
              {language === 'fr' ? 'Mode agriculture' : 'Agriculture mode'}
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0F2942] mt-0.5">
              {language === 'fr'
                ? 'Repères simples pour votre région'
                : 'Simple seasonal overview for your region'}
            </h1>
          </div>

          <div className="sm:w-64">
            <label htmlFor="ag-region" className="block text-xs font-semibold text-[#475569] mb-1">
              {language === 'fr' ? 'Ma région' : 'My region'}
            </label>
            <select
              id="ag-region"
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
        </div>

        {/* M20 Mandatory Disclaimer visible without scrolling on 360px phone */}
        <div
          className="px-3.5 py-2 bg-[#FEF3C7] border border-[#F59E0B] rounded text-xs sm:text-sm font-semibold text-[#92400E]"
          role="note"
        >
          {data
            ? language === 'fr'
              ? data.disclaimer_fr
              : data.disclaimer_en
            : language === 'fr'
            ? 'Ne remplace pas les prévisions officielles'
            : 'Does not replace official forecasts'}
        </div>
      </div>

      {loading ? (
        <LoadingPanel rows={3} />
      ) : error ? (
        <ErrorPanel message={error} onRetry={loadAgri} />
      ) : !data ? (
        <EmptyDataPanel />
      ) : (
        <div className="space-y-6">
          {/* 3 Large Pictogram Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#F7F9F8] border border-[#DCE3E1] rounded p-5 flex items-center gap-4">
              <div className="w-14 h-14 bg-white border border-[#DCE3E1] rounded flex items-center justify-center shrink-0">
                {data.season_status === 'rainy' ? (
                  <CloudRain className="w-8 h-8 text-[#0E7490]" aria-hidden="true" />
                ) : (
                  <Sun className="w-8 h-8 text-[#C2410C]" aria-hidden="true" />
                )}
              </div>
              <div>
                <div className="text-xs text-[#475569]">
                  {language === 'fr' ? data.month_label_fr : data.month_label_en}
                </div>
                <div className="text-lg font-bold text-[#0F2942]">
                  {language === 'fr' ? data.season_label_fr : data.season_label_en}
                </div>
              </div>
            </div>

            <div className="bg-[#F7F9F8] border border-[#DCE3E1] rounded p-5 flex items-center gap-4">
              <div className="w-14 h-14 bg-white border border-[#DCE3E1] rounded flex items-center justify-center shrink-0">
                <CloudRain className="w-8 h-8 text-[#0F2942]" aria-hidden="true" />
              </div>
              <div>
                <div className="text-xs text-[#475569]">
                  {language === 'fr' ? 'Pluie observée' : 'Observed rainfall'}
                </div>
                <div className="text-lg font-bold text-[#0F2942]">
                  {language === 'fr' ? data.rainfall_label_fr : data.rainfall_label_en}
                </div>
              </div>
            </div>

            <div className="bg-[#F7F9F8] border border-[#DCE3E1] rounded p-5 flex items-center gap-4">
              <div className="w-14 h-14 bg-white border border-[#DCE3E1] rounded flex items-center justify-center shrink-0">
                <Sprout className="w-8 h-8 text-[#1A5E36]" aria-hidden="true" />
              </div>
              <div>
                <div className="text-xs text-[#475569]">
                  {language === 'fr' ? 'Couvert végétal' : 'Vegetation state'}
                </div>
                <div className="text-lg font-bold text-[#0F2942]">
                  {language === 'fr' ? data.vegetation_label_fr : data.vegetation_label_en}
                </div>
              </div>
            </div>
          </div>

          {/* 2–3 Practical Tips in Large Type */}
          <div className="bg-white border border-[#DCE3E1] rounded p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-[#0F2942]">
                {language === 'fr' ? 'Conseils pratiques' : 'Practical tips'}
              </h2>
              <button
                type="button"
                onClick={() => openDatasetDialog(data.dataset_id)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0E7490] hover:underline cursor-pointer"
              >
                <span>{data.source}</span>
                <Info className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <ul className="space-y-3">
              {data.tips.map((tip) => (
                <li
                  key={tip.id}
                  className="p-4 bg-[#F7F9F8] border border-[#DCE3E1] rounded text-base sm:text-lg font-medium text-[#0F2942] leading-relaxed"
                >
                  {language === 'fr' ? tip.text_fr : tip.text_en}
                </li>
              ))}
            </ul>

            <div className="pt-2">
              <Link
                to="/assistant"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-[#1A5E36] hover:bg-[#154D2C] text-white rounded transition-colors"
              >
                <MessageSquare className="w-4 h-4" aria-hidden="true" />
                <span>
                  {language === 'fr'
                    ? 'Poser une question à l’assistant'
                    : 'Ask the climate assistant'}
                </span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
