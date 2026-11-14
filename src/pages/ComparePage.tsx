import { useCallback, useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import {
  getBeforeAfterLayers,
  getRegionCompare,
  getRegionsGeoJson,
} from '../services/climateApi.ts';
import type {
  BeforeAfterLayersResponse,
  IndicatorId,
  RegionCompareResponse,
  RegionId,
  RegionsGeoJsonResponse,
} from '../types/apiContract.ts';
import { TogoLeafletMap } from '../components/TogoLeafletMap.tsx';
import { EmptyDataPanel, ErrorPanel, LoadingPanel } from '../components/StatusStates.tsx';

export function ComparePage() {
  const { language, regions, regionId, updatePreferences, openDatasetDialog } = useApp();

  const [selectedRegion, setSelectedRegion] = useState<RegionId>(regionId);
  const [indicator, setIndicator] = useState<IndicatorId>('rainfall');
  const [startA, setStartA] = useState<number>(2015);
  const [endA, setEndA] = useState<number>(2019);
  const [startB, setStartB] = useState<number>(2021);
  const [endB, setEndB] = useState<number>(2025);

  const [dateA, setDateA] = useState<string>('2016-09-15');
  const [dateB, setDateB] = useState<string>('2025-09-15');
  const [splitPercent, setSplitPercent] = useState<number>(50);

  const [geojson, setGeojson] = useState<RegionsGeoJsonResponse | null>(null);
  const [compareData, setCompareData] = useState<RegionCompareResponse | null>(null);
  const [layerPair, setLayerPair] = useState<BeforeAfterLayersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRegionsGeoJson().then(setGeojson).catch(() => {});
  }, []);

  const loadComparison = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cmp, layers] = await Promise.all([
        getRegionCompare({
          regionId: selectedRegion,
          indicator,
          startA,
          endA,
          startB,
          endB,
        }),
        getBeforeAfterLayers({
          indicator,
          regionId: selectedRegion,
          dateA,
          dateB,
        }),
      ]);
      setCompareData(cmp);
      setLayerPair(layers);
    } catch (err: any) {
      setError(err?.message || 'Unable to load comparison.');
    } finally {
      setLoading(false);
    }
  }, [selectedRegion, indicator, startA, endA, startB, endB, dateA, dateB]);

  useEffect(() => {
    loadComparison();
  }, [loadComparison]);

  const handleRegionChange = (rid: RegionId) => {
    setSelectedRegion(rid);
    updatePreferences({ region_id: rid });
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="pb-5 border-b border-[#DCE3E1]">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0F2942] tracking-tight">
          {language === 'fr' ? 'Comparaison Avant / Après' : 'Before / After Comparison'}
        </h1>
        <p className="text-sm text-[#475569] mt-1">
          {language === 'fr'
            ? 'Faites glisser le séparateur vertical sur la carte et comparez deux périodes d’observation NASA.'
            : 'Drag the vertical slider across the map and compare two NASA observation periods.'}
        </p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pb-5 border-b border-[#DCE3E1]">
        <div>
          <label htmlFor="ba-region" className="block text-xs font-semibold text-[#475569] mb-1">
            {language === 'fr' ? 'Région' : 'Region'}
          </label>
          <select
            id="ba-region"
            value={selectedRegion}
            onChange={(e) => handleRegionChange(e.target.value as RegionId)}
            className="w-full h-10 px-3 text-sm bg-white border border-[#CBD5E1] rounded text-[#0F2942]"
          >
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ba-ind" className="block text-xs font-semibold text-[#475569] mb-1">
            {language === 'fr' ? 'Indicateur' : 'Indicator'}
          </label>
          <select
            id="ba-ind"
            value={indicator}
            onChange={(e) => setIndicator(e.target.value as IndicatorId)}
            className="w-full h-10 px-3 text-sm bg-white border border-[#CBD5E1] rounded text-[#0F2942]"
          >
            <option value="rainfall">{language === 'fr' ? 'Précipitations' : 'Rainfall'}</option>
            <option value="greenness">{language === 'fr' ? 'Végétation' : 'Greenness'}</option>
            <option value="lst">{language === 'fr' ? 'Température surface' : 'Land surface temp.'}</option>
          </select>
        </div>

        <div>
          <label htmlFor="ba-period-a" className="block text-xs font-semibold text-[#475569] mb-1">
            {language === 'fr' ? 'Période A' : 'Period A'}
          </label>
          <select
            id="ba-period-a"
            value={`${startA}-${endA}`}
            onChange={(e) => {
              const [s, en] = e.target.value.split('-').map(Number);
              setStartA(s);
              setEndA(en);
            }}
            className="w-full h-10 px-3 text-sm bg-white border border-[#CBD5E1] rounded text-[#0F2942] font-mono"
          >
            <option value="2005-2014">2005–2014</option>
            <option value="2015-2019">2015–2019</option>
            <option value="2020-2022">2020–2022</option>
          </select>
        </div>

        <div>
          <label htmlFor="ba-period-b" className="block text-xs font-semibold text-[#475569] mb-1">
            {language === 'fr' ? 'Période B' : 'Period B'}
          </label>
          <select
            id="ba-period-b"
            value={`${startB}-${endB}`}
            onChange={(e) => {
              const [s, en] = e.target.value.split('-').map(Number);
              setStartB(s);
              setEndB(en);
            }}
            className="w-full h-10 px-3 text-sm bg-white border border-[#CBD5E1] rounded text-[#0F2942] font-mono"
          >
            <option value="2016-2025">2016–2025</option>
            <option value="2021-2025">2021–2025</option>
            <option value="2023-2025">2023–2025</option>
          </select>
        </div>

        <div>
          <label htmlFor="ba-date-a" className="block text-xs font-semibold text-[#475569] mb-1">
            {language === 'fr' ? 'Carte Avant' : 'Left map date'}
          </label>
          <input
            id="ba-date-a"
            type="date"
            min="2005-01-01"
            max="2025-12-31"
            value={dateA}
            onChange={(e) => setDateA(e.target.value)}
            className="w-full h-10 px-2.5 text-xs font-mono bg-white border border-[#CBD5E1] rounded text-[#0F2942]"
          />
        </div>

        <div>
          <label htmlFor="ba-date-b" className="block text-xs font-semibold text-[#475569] mb-1">
            {language === 'fr' ? 'Carte Après' : 'Right map date'}
          </label>
          <input
            id="ba-date-b"
            type="date"
            min="2005-01-01"
            max="2025-12-31"
            value={dateB}
            onChange={(e) => setDateB(e.target.value)}
            className="w-full h-10 px-2.5 text-xs font-mono bg-white border border-[#CBD5E1] rounded text-[#0F2942]"
          />
        </div>
      </div>

      {loading ? (
        <LoadingPanel rows={4} />
      ) : error ? (
        <ErrorPanel message={error} onRetry={loadComparison} />
      ) : !compareData || !layerPair ? (
        <EmptyDataPanel />
      ) : (
        <div className="space-y-6">
          {/* M18 Vertical Split Slider Map */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#0F2942]">
              <span>
                {language === 'fr' ? layerPair.left.label_fr : layerPair.left.label_en}
              </span>
              <span>
                {language === 'fr' ? layerPair.right.label_fr : layerPair.right.label_en}
              </span>
            </div>

            <div className="relative h-[440px] border border-[#DCE3E1] rounded overflow-hidden">
              {/* Right layer (full background) */}
              <div className="absolute inset-0">
                <TogoLeafletMap
                  geojson={geojson}
                  selectedRegionId={selectedRegion}
                  indicator={indicator}
                  regionValues={layerPair.right.region_values}
                  tileUrlTemplate={layerPair.right.tile_url_template}
                  maxNativeZoom={layerPair.right.max_native_zoom}
                  heightClassName="h-[440px]"
                  interactive={false}
                />
              </div>

              {/* Left layer (clipped to splitPercent%) */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - splitPercent}% 0 0)` }}
              >
                <TogoLeafletMap
                  geojson={geojson}
                  selectedRegionId={selectedRegion}
                  indicator={indicator}
                  regionValues={layerPair.left.region_values}
                  tileUrlTemplate={layerPair.left.tile_url_template}
                  maxNativeZoom={layerPair.left.max_native_zoom}
                  heightClassName="h-[440px]"
                  interactive={false}
                />
              </div>

              {/* Vertical divider line */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-[#0F2942] z-20 pointer-events-none"
                style={{ left: `${splitPercent}%` }}
              >
                <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-1 bg-[#0F2942] text-white text-[11px] font-mono rounded whitespace-nowrap">
                  {splitPercent}%
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-1">
              <span className="text-xs font-semibold text-[#475569] shrink-0">
                {language === 'fr' ? 'Curseur Avant / Après :' : 'Before / After slider:'}
              </span>
              <input
                type="range"
                min={5}
                max={95}
                value={splitPercent}
                onChange={(e) => setSplitPercent(Number(e.target.value))}
                aria-label="Before / After split slider"
                className="w-full accent-[#0E7490] cursor-ew-resize"
              />
            </div>
          </div>

          {/* M16 Two Side-by-Side Blocks with Computed Difference in Between */}
          <div className="bg-[#F7F9F8] border border-[#DCE3E1] rounded p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-[#0F2942]">
                {language === 'fr'
                  ? 'Comparaison chiffrée entre périodes'
                  : 'Period Comparison'}
              </h2>
              <button
                type="button"
                onClick={() => openDatasetDialog(compareData.dataset_id)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0E7490] hover:underline cursor-pointer"
              >
                <Info className="w-4 h-4" aria-hidden="true" />
                <span>{language === 'fr' ? 'Source des données' : 'Data source'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="bg-white border border-[#DCE3E1] rounded p-5">
                <div className="text-xs font-mono text-[#64748B]">
                  {compareData.period_a.label}
                </div>
                <div className="text-2xl font-bold font-mono text-[#0F2942] mt-1.5">
                  {compareData.period_a.value !== null
                    ? `${compareData.period_a.value} ${compareData.unit}`
                    : 'N/D'}
                </div>
              </div>

              <div className="bg-white border border-[#0E7490] rounded p-5 text-center">
                <div className="text-xs font-semibold text-[#475569]">
                  {language === 'fr' ? 'Variation (B − A)' : 'Difference (B − A)'}
                </div>
                <div className="text-2xl font-bold font-mono text-[#0E7490] mt-1.5">
                  {compareData.delta_pct !== null
                    ? `${compareData.delta_pct > 0 ? '+' : ''}${compareData.delta_pct}%`
                    : 'N/D'}
                </div>
                {compareData.delta_abs !== null && (
                  <div className="text-xs font-mono text-[#64748B] mt-1">
                    {compareData.delta_abs > 0 ? '+' : ''}
                    {compareData.delta_abs} {compareData.unit}
                  </div>
                )}
              </div>

              <div className="bg-white border border-[#DCE3E1] rounded p-5">
                <div className="text-xs font-mono text-[#64748B]">
                  {compareData.period_b.label}
                </div>
                <div className="text-2xl font-bold font-mono text-[#0F2942] mt-1.5">
                  {compareData.period_b.value !== null
                    ? `${compareData.period_b.value} ${compareData.unit}`
                    : 'N/D'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
