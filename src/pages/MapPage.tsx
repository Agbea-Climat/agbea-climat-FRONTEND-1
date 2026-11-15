import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Info, MapPin, Sparkles, TrendingUp } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import {
  explainIndicator,
  getIndicators,
  getLayer,
  getRegion,
  getRegionsGeoJson,
  getRegionSummary,
  getRegionTimeseries,
  locateRegion,
} from '../services/climateApi.ts';
import type {
  ExplainSentence,
  IndicatorId,
  IndicatorInfo,
  MapLayerResponse,
  RegionId,
  RegionInfo,
  RegionsGeoJsonResponse,
  RegionSummaryResponse,
  TimeseriesResponse,
} from '../types/apiContract.ts';
import { TogoLeafletMap } from '../components/TogoLeafletMap.tsx';
import { EmptyDataPanel, ErrorPanel, LoadingPanel } from '../components/StatusStates.tsx';

export function MapPage() {
  const {
    language,
    mode,
    profile,
    regionId,
    updatePreferences,
    openDatasetDialog,
  } = useApp();

  const [searchParams, setSearchParams] = useSearchParams();
  const paramRegion = searchParams.get('region') as RegionId | null;

  const [activeRegionId, setActiveRegionId] = useState<RegionId>(paramRegion || regionId);
  const [indicator, setIndicator] = useState<IndicatorId>('greenness');
  const [layerDate, setLayerDate] = useState<string>('2025-09-15');
  const [opacity, setOpacity] = useState<number>(0.65);

  const [geojson, setGeojson] = useState<RegionsGeoJsonResponse | null>(null);
  const [indicatorsList, setIndicatorsList] = useState<IndicatorInfo[]>([]);
  const [layerData, setLayerData] = useState<MapLayerResponse | null>(null);
  const [regionHeader, setRegionHeader] = useState<RegionInfo | null>(null);
  const [summary, setSummary] = useState<RegionSummaryResponse | null>(null);

  const [mapLoading, setMapLoading] = useState(true);
  const [panelLoading, setPanelLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [outsideTogoMsg, setOutsideTogoMsg] = useState<string | null>(null);

  // M15 Trend chart state
  const [trendIndicator, setTrendIndicator] = useState<IndicatorId | null>(null);
  const [timeseries, setTimeseries] = useState<TimeseriesResponse | null>(null);
  const [tsLoading, setTsLoading] = useState(false);

  // M24 Explain state per indicator card
  const [explanations, setExplanations] = useState<
    Partial<Record<IndicatorId, ExplainSentence[]>>
  >({});
  const [explainLoadingId, setExplainLoadingId] = useState<IndicatorId | null>(null);

  useEffect(() => {
    if (paramRegion && ['maritime', 'plateaux', 'centrale', 'kara', 'savanes'].includes(paramRegion)) {
      setActiveRegionId(paramRegion);
    }
  }, [paramRegion]);

  // Initial static map resources (M07 GeoJSON + M10 Indicators)
  useEffect(() => {
    getRegionsGeoJson().then(setGeojson).catch(() => {});
    getIndicators().then((res) => setIndicatorsList(res.indicators)).catch(() => {});
  }, []);

  // M13 Map layer loader
  const loadLayer = useCallback(async () => {
    setMapLoading(true);
    setMapError(null);
    try {
      const res = await getLayer({ indicator, mode, date: layerDate });
      setLayerData(res);
    } catch (err: any) {
      setMapError(err?.message || 'Unable to load map layer.');
    } finally {
      setMapLoading(false);
    }
  }, [indicator, mode, layerDate]);

  useEffect(() => {
    loadLayer();
  }, [loadLayer]);

  // M08 + M14 Region Panel loader
  const loadRegionPanel = useCallback(async () => {
    setPanelLoading(true);
    setPanelError(null);
    setExplanations({});
    try {
      const [regInfo, regSum] = await Promise.all([
        getRegion(activeRegionId),
        getRegionSummary(activeRegionId, profile),
      ]);
      setRegionHeader(regInfo);
      setSummary(regSum);
    } catch (err: any) {
      setPanelError(err?.message || 'Unable to load region data.');
    } finally {
      setPanelLoading(false);
    }
  }, [activeRegionId, profile]);

  useEffect(() => {
    loadRegionPanel();
  }, [loadRegionPanel]);

  // M15 Trend loader
  useEffect(() => {
    if (!trendIndicator) {
      setTimeseries(null);
      return;
    }
    setTsLoading(true);
    getRegionTimeseries(activeRegionId, trendIndicator, 12)
      .then(setTimeseries)
      .catch(() => setTimeseries(null))
      .finally(() => setTsLoading(false));
  }, [activeRegionId, trendIndicator]);

  // M09 Map click coordinate check
  const handleMapClickCoordinate = async (lon: number, lat: number) => {
    setOutsideTogoMsg(null);
    try {
      const res = await locateRegion(lon, lat);
      setActiveRegionId(res.region_id);
      setSearchParams({ region: res.region_id });
      updatePreferences({ region_id: res.region_id });
    } catch (err: any) {
      if (err?.status === 404) {
        setOutsideTogoMsg(
          language === 'fr' ? 'Zone non couverte (hors du Togo)' : 'Area not covered'
        );
      } else {
        setOutsideTogoMsg(err?.message || 'Area not covered');
      }
    }
  };

  // M24 Explain handler
  const handleExplain = async (indId: IndicatorId) => {
    setExplainLoadingId(indId);
    try {
      const res = await explainIndicator({
        region_id: activeRegionId,
        indicator_id: indId,
        profile,
        language,
        mode,
      });
      setExplanations((prev) => ({ ...prev, [indId]: res.sentences }));
    } finally {
      setExplainLoadingId(null);
    }
  };

  const natureLabel = (nature: ExplainSentence['nature']) => {
    if (nature === 'observed') return language === 'fr' ? 'Observé' : 'Observed';
    if (nature === 'interpreted') return language === 'fr' ? 'Interprété' : 'Interpreted';
    return language === 'fr' ? 'Projeté' : 'Predicted';
  };

  const natureStyle = (nature: ExplainSentence['nature']) => {
    if (nature === 'observed') return 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]';
    if (nature === 'interpreted') return 'bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]';
    return 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]';
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-8">
      <div className="pb-5 border-b border-[#DCE3E1] flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F2942] tracking-tight">
            {language === 'fr'
              ? 'Carte interactive du Togo'
              : 'Interactive Map of Togo'}
          </h1>
          <p className="text-sm text-[#475569] mt-1">
            {language === 'fr'
              ? 'Cliquez sur une région pour explorer les données NASA ou ajustez la couche affichée.'
              : 'Click any region on the map to inspect NASA observations or switch indicator layers.'}
          </p>
        </div>

        {/* M10 4 Indicator buttons with mode-aware tooltip */}
        <div className="flex flex-wrap items-center gap-2" role="tablist">
          {indicatorsList.map((ind) => {
            const label = language === 'fr' ? ind.name_fr : ind.name_en;
            const tip =
              mode === 'scientific'
                ? language === 'fr'
                  ? ind.tooltip_scientific_fr
                  : ind.tooltip_scientific_en
                : language === 'fr'
                ? ind.tooltip_public_fr
                : ind.tooltip_public_en;
            const active = indicator === ind.id;

            return (
              <button
                key={ind.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setIndicator(ind.id)}
                title={tip}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded border transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#0F2942] text-white border-[#0F2942]'
                    : 'bg-white text-[#334155] border-[#CBD5E1] hover:border-[#0E7490]'
                }`}
              >
                <span>{label}</span>
                <span title={tip} className="inline-flex items-center opacity-80">
                  <Info className="w-3.5 h-3.5" aria-hidden="true" />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mode-aware active indicator tooltip line (visible directly for quick reading) */}
      {indicatorsList.length > 0 && (
        <div className="py-2.5 px-3 mt-4 bg-[#F7F9F8] border border-[#DCE3E1] rounded flex flex-wrap items-center justify-between gap-2 text-xs text-[#334155]">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#0E7490] shrink-0" aria-hidden="true" />
            <span>
              {(() => {
                const activeInd = indicatorsList.find((i) => i.id === indicator);
                if (!activeInd) return '';
                if (mode === 'scientific') {
                  return language === 'fr'
                    ? activeInd.tooltip_scientific_fr
                    : activeInd.tooltip_scientific_en;
                }
                return language === 'fr'
                  ? activeInd.tooltip_public_fr
                  : activeInd.tooltip_public_en;
              })()}
            </span>
          </div>
          <span className="font-mono text-[#64748B]">
            {mode === 'scientific'
              ? language === 'fr'
                ? 'Mode scientifique'
                : 'Scientific mode'
              : language === 'fr'
              ? 'Mode public'
              : 'Public mode'}
          </span>
        </div>
      )}

      {/* M09 Outside Togo Alert */}
      {outsideTogoMsg && (
        <div
          className="mt-4 px-4 py-2.5 bg-[#FEF3C7] border border-[#F59E0B] rounded text-xs font-semibold text-[#92400E]"
          role="status"
        >
          {outsideTogoMsg}
        </div>
      )}

      {/* Main Split: Map + Region Panel */}
      <div className="pt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Map + M13 Legend, Opacity & Date Picker */}
        <div className="lg:col-span-7 space-y-4">
          {mapError ? (
            <ErrorPanel message={mapError} onRetry={loadLayer} />
          ) : (
            <div className="relative">
              <TogoLeafletMap
                geojson={geojson}
                selectedRegionId={activeRegionId}
                indicator={indicator}
                regionValues={layerData?.region_values || {}}
                tileUrlTemplate={layerData?.tile_url_template}
                maxNativeZoom={layerData?.max_native_zoom}
                overlayOpacity={opacity}
                onMapClickCoordinate={handleMapClickCoordinate}
                heightClassName="h-[460px] sm:h-[520px]"
              />
              {mapLoading && (
                <div className="mt-2 text-xs text-[#475569]">
                  {language === 'fr' ? 'Chargement de la couche...' : 'Loading layer...'}
                </div>
              )}
            </div>
          )}

          {/* M13 Bottom Legend + Opacity Slider + Date Picker */}
          <div className="bg-[#F7F9F8] border border-[#DCE3E1] rounded p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-[#0F2942]">
                  {layerData
                    ? language === 'fr'
                      ? layerData.legend_title_fr
                      : layerData.legend_title_en
                    : ''}
                </div>
                <div className="text-[11px] text-[#475569] mt-0.5">
                  {layerData
                    ? `${
                        language === 'fr'
                          ? layerData.legend_min_label_fr
                          : layerData.legend_min_label_en
                      } → ${
                        language === 'fr'
                          ? layerData.legend_max_label_fr
                          : layerData.legend_max_label_en
                      }`
                    : ''}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <label
                    htmlFor="layer-date"
                    className="block text-[11px] font-semibold text-[#475569] mb-1"
                  >
                    {language === 'fr' ? 'Date' : 'Date'}
                  </label>
                  <input
                    id="layer-date"
                    type="date"
                    min="2020-01-01"
                    max="2025-12-31"
                    value={layerDate}
                    onChange={(e) => setLayerDate(e.target.value)}
                    className="h-9 px-2.5 text-xs font-mono bg-white border border-[#CBD5E1] rounded text-[#0F2942]"
                  />
                </div>

                <div className="w-40">
                  <label
                    htmlFor="layer-opacity"
                    className="block text-[11px] font-semibold text-[#475569] mb-1"
                  >
                    {language === 'fr' ? 'Opacité' : 'Opacity'} ({Math.round(opacity * 100)}%)
                  </label>
                  <input
                    id="layer-opacity"
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={opacity}
                    onChange={(e) => setOpacity(Number(e.target.value))}
                    className="w-full accent-[#0E7490]"
                  />
                </div>
              </div>
            </div>

            {layerData && (
              <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-[#DCE3E1]">
                {layerData.stops.map((s) => (
                  <div key={s.color} className="flex items-center gap-1.5 text-xs text-[#334155]">
                    <span
                      className="w-3.5 h-3.5 rounded-sm border border-[#94A3B8]"
                      style={{ backgroundColor: s.color }}
                      aria-hidden="true"
                    />
                    <span className="font-mono text-[11px]">
                      {language === 'fr' ? s.label_fr : s.label_en}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Region Panel (M08, M14, M15, M24, M12) */}
        <aside className="lg:col-span-5 bg-white border border-[#DCE3E1] rounded p-5 space-y-5">
          {panelLoading ? (
            <LoadingPanel rows={4} />
          ) : panelError ? (
            <ErrorPanel message={panelError} onRetry={loadRegionPanel} />
          ) : !summary || summary.indicators.length === 0 ? (
            <EmptyDataPanel />
          ) : (
            <>
              {/* M08 Header */}
              <div className="pb-4 border-b border-[#DCE3E1]">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1A5E36]">
                  <MapPin className="w-4 h-4" aria-hidden="true" />
                  <span>Togo</span>
                </div>
                <h2 className="text-xl font-bold text-[#0F2942] mt-1">
                  {language === 'fr'
                    ? `Région ${regionHeader?.name || summary.region.name} — chef-lieu : ${
                        regionHeader?.capital || summary.region.capital
                      }`
                    : `${regionHeader?.name || summary.region.name} region — capital: ${
                        regionHeader?.capital || summary.region.capital
                      }`}
                </h2>
                <p className="text-xs text-[#475569] mt-1">
                  {language === 'fr'
                    ? summary.region.climate_zone_fr
                    : summary.region.climate_zone_en}
                </p>
              </div>

              {/* M14 Indicator Cards (ordered by profile's featured_indicators) */}
              <div className="space-y-4">
                {summary.indicators.map((card) => {
                  const sentences = explanations[card.indicator_id];
                  const isExplaining = explainLoadingId === card.indicator_id;
                  const isTrendOpen = trendIndicator === card.indicator_id;

                  return (
                    <div
                      key={card.indicator_id}
                      className="bg-[#F7F9F8] border border-[#DCE3E1] rounded p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-semibold text-[#475569]">
                            {language === 'fr' ? card.label_fr : card.label_en} ·{' '}
                            <span className="font-normal">
                              {language === 'fr' ? card.period_label_fr : card.period_label_en}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-baseline gap-2.5">
                            <span className="text-2xl font-bold font-mono text-[#0F2942]">
                              {card.value !== null ? `${card.value} ${card.unit}` : 'N/D'}
                            </span>
                            <span
                              className={`text-xs font-semibold ${
                                card.trend === 'below_normal'
                                  ? 'text-[#B45309]'
                                  : card.trend === 'above_normal'
                                  ? 'text-[#0E7490]'
                                  : 'text-[#1A5E36]'
                              }`}
                            >
                              {language === 'fr' ? card.trend_text_fr : card.trend_text_en}
                            </span>
                          </div>
                        </div>

                        {/* M12 Info dialog trigger */}
                        <button
                          type="button"
                          onClick={() => openDatasetDialog(card.dataset_id)}
                          className="p-1.5 text-[#475569] hover:text-[#0E7490] rounded cursor-pointer"
                          aria-label={`Source ${card.dataset_id}`}
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      </div>

                      {mode === 'public' && (
                        <p className="text-xs text-[#334155] leading-relaxed">
                          {language === 'fr' ? card.plain_sentence_fr : card.plain_sentence_en}
                        </p>
                      )}

                      {/* Action Buttons: See trend (only if has_timeseries per M10) + Explain (M24) */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {card.has_timeseries && (
                          <button
                            type="button"
                            onClick={() =>
                              setTrendIndicator(isTrendOpen ? null : card.indicator_id)
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-[#CBD5E1] text-[#0F2942] hover:border-[#0E7490] rounded cursor-pointer"
                          >
                            <TrendingUp className="w-3.5 h-3.5 text-[#0E7490]" aria-hidden="true" />
                            <span>
                              {isTrendOpen
                                ? language === 'fr'
                                  ? 'Masquer la tendance'
                                  : 'Hide trend'
                                : language === 'fr'
                                ? 'Voir la tendance'
                                : 'See trend'}
                            </span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleExplain(card.indicator_id)}
                          disabled={isExplaining}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#0F2942] hover:bg-[#163656] text-white rounded cursor-pointer disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>
                            {isExplaining
                              ? language === 'fr'
                                ? 'Analyse...'
                                : 'Analyzing...'
                              : language === 'fr'
                              ? 'Expliquer'
                              : 'Explain'}
                          </span>
                        </button>
                      </div>

                      {/* M24 Sentence-by-sentence explanation with Observed/Interpreted/Predicted & source chip */}
                      {sentences && sentences.length > 0 && (
                        <div className="mt-2 pt-3 border-t border-[#DCE3E1] space-y-2.5 bg-white p-3 rounded border">
                          {sentences.map((s, idx) => (
                            <div key={idx} className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`text-[11px] font-semibold px-2 py-0.5 border rounded ${natureStyle(
                                    s.nature
                                  )}`}
                                >
                                  {natureLabel(s.nature)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => openDatasetDialog(s.source_id)}
                                  className="text-[11px] font-mono text-[#0E7490] hover:underline cursor-pointer"
                                >
                                  {s.source_name}
                                </button>
                              </div>
                              <p className="text-xs text-[#1E293B] leading-relaxed">
                                {s.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* M15 Timeseries Chart (actual bars + normal dotted line) */}
              {trendIndicator && (
                <div className="pt-4 border-t border-[#DCE3E1] space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[#0F2942]">
                      {language === 'fr' ? 'Tendance sur 12 mois' : '12-Month Trend'}
                    </h3>
                    {timeseries && (
                      <button
                        type="button"
                        onClick={() => openDatasetDialog(timeseries.dataset_id)}
                        className="inline-flex items-center gap-1 text-xs text-[#0E7490] hover:underline cursor-pointer"
                      >
                        <span>Source: {timeseries.source_name}</span>
                        <Info className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>

                  {tsLoading ? (
                    <LoadingPanel rows={2} />
                  ) : !timeseries || timeseries.series.length === 0 ? (
                    <EmptyDataPanel />
                  ) : (
                    <div className="h-52 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                          data={timeseries.series.map((pt) => ({
                            label: language === 'fr' ? pt.label_fr : pt.label_en,
                            value: pt.value,
                            normal: pt.normal,
                          }))}
                          margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#475569' }} />
                          <YAxis
                            tick={{ fontSize: 10, fill: '#475569' }}
                            unit={` ${timeseries.unit}`}
                          />
                          <Tooltip
                            formatter={(val: any, name: any) => [
                              `${val} ${timeseries.unit}`,
                              name,
                            ]}
                            contentStyle={{
                              backgroundColor: '#FFFFFF',
                              borderColor: '#DCE3E1',
                              fontSize: '12px',
                            }}
                          />
                          <Legend />
                          <Bar
                            dataKey="value"
                            name={language === 'fr' ? 'Observé' : 'Actual'}
                            fill="#0E7490"
                            radius={[2, 2, 0, 0]}
                          />
                          <Line
                            type="monotone"
                            dataKey="normal"
                            name={language === 'fr' ? 'Normale' : 'Normal'}
                            stroke="#0F2942"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            dot={false}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
