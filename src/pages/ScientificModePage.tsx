import { useCallback, useEffect, useState } from 'react';
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
import { Download, ExternalLink, Info } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import {
  downloadTimeseriesCsv,
  getDatasets,
  getRegionCompare,
  getRegionTimeseries,
} from '../services/climateApi.ts';
import type {
  DatasetInfo,
  IndicatorId,
  RegionCompareResponse,
  RegionId,
  TimeseriesResponse,
} from '../types/apiContract.ts';
import { EmptyDataPanel, ErrorPanel, LoadingPanel } from '../components/StatusStates.tsx';

export function ScientificModePage() {
  const { language, regions, regionId, updatePreferences, openDatasetDialog } = useApp();

  const [indicator, setIndicator] = useState<IndicatorId>('rainfall');
  const [months, setMonths] = useState<number>(24);
  const [startA, setStartA] = useState<number>(2015);
  const [endA, setEndA] = useState<number>(2019);
  const [startB, setStartB] = useState<number>(2021);
  const [endB, setEndB] = useState<number>(2025);

  const [timeseries, setTimeseries] = useState<TimeseriesResponse | null>(null);
  const [compareData, setCompareData] = useState<RegionCompareResponse | null>(null);
  const [datasets, setDatasets] = useState<DatasetInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDatasets().then((r) => setDatasets(r.datasets)).catch(() => {});
  }, []);

  const loadScientific = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ts, cmp] = await Promise.all([
        getRegionTimeseries(regionId, indicator, months),
        getRegionCompare({ regionId, indicator, startA, endA, startB, endB }),
      ]);
      setTimeseries(ts);
      setCompareData(cmp);
    } catch (err: any) {
      setError(err?.message || 'Unable to load scientific data.');
    } finally {
      setLoading(false);
    }
  }, [regionId, indicator, months, startA, endA, startB, endB]);

  useEffect(() => {
    loadScientific();
  }, [loadScientific]);

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="pb-5 border-b border-[#DCE3E1]">
        <p className="text-xs font-semibold text-[#0F2942]">
          {language === 'fr' ? 'Mode scientifique' : 'Scientific mode'}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0F2942] mt-1 tracking-tight">
          {language === 'fr'
            ? 'Séries temporelles, comparaisons et sources de données'
            : 'Time Series, Comparisons & Data Sources'}
        </h1>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pb-5 border-b border-[#DCE3E1]">
        <div>
          <label htmlFor="sci-region" className="block text-xs font-semibold text-[#475569] mb-1">
            {language === 'fr' ? 'Région' : 'Region'}
          </label>
          <select
            id="sci-region"
            value={regionId}
            onChange={(e) =>
              updatePreferences({ region_id: e.target.value as RegionId })
            }
            className="w-full h-10 px-3 text-sm bg-white border border-[#CBD5E1] rounded text-[#0F2942]"
          >
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.capital})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="sci-ind" className="block text-xs font-semibold text-[#475569] mb-1">
            {language === 'fr' ? 'Indicateur' : 'Indicator'}
          </label>
          <select
            id="sci-ind"
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
          <label htmlFor="sci-win" className="block text-xs font-semibold text-[#475569] mb-1">
            {language === 'fr' ? 'Fenêtre' : 'Window'}
          </label>
          <select
            id="sci-win"
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="w-full h-10 px-3 text-sm bg-white border border-[#CBD5E1] rounded text-[#0F2942] font-mono"
          >
            <option value={12}>12 {language === 'fr' ? 'mois' : 'months'}</option>
            <option value={24}>24 {language === 'fr' ? 'mois' : 'months'}</option>
          </select>
        </div>

        <div>
          <label htmlFor="sci-pa" className="block text-xs font-semibold text-[#475569] mb-1">
            {language === 'fr' ? 'Période A' : 'Period A'}
          </label>
          <select
            id="sci-pa"
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
          <label htmlFor="sci-pb" className="block text-xs font-semibold text-[#475569] mb-1">
            {language === 'fr' ? 'Période B' : 'Period B'}
          </label>
          <select
            id="sci-pb"
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
      </div>

      {loading ? (
        <LoadingPanel rows={4} />
      ) : error ? (
        <ErrorPanel message={error} onRetry={loadScientific} />
      ) : !timeseries || timeseries.series.length === 0 ? (
        <EmptyDataPanel />
      ) : (
        <div className="space-y-8">
          {/* M15 Timeseries Chart + M17 Download (CSV) under chart */}
          <div className="bg-white border border-[#DCE3E1] rounded p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-[#0F2942]">
                {language === 'fr'
                  ? `Série mensuelle (${months} mois) — ${timeseries.unit}`
                  : `Monthly Time Series (${months} months) — ${timeseries.unit}`}
              </h2>
              <button
                type="button"
                onClick={() => openDatasetDialog(timeseries.dataset_id)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0E7490] hover:underline cursor-pointer"
              >
                <span>Source: {timeseries.source_name}</span>
                <Info className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={timeseries.series.map((pt) => ({
                    label: language === 'fr' ? pt.label_fr : pt.label_en,
                    value: pt.value,
                    normal: pt.normal,
                  }))}
                  margin={{ top: 8, right: 16, left: -4, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#475569' }} minTickGap={16} />
                  <YAxis tick={{ fontSize: 11, fill: '#475569' }} unit={` ${timeseries.unit}`} />
                  <Tooltip
                    formatter={(val: any, name: any) => [`${val} ${timeseries.unit}`, name]}
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
                    name={`${language === 'fr' ? 'Normale' : 'Normal'} (${(timeseries.baseline_period || ['2020', '2024']).join('–')})`}
                    stroke="#0F2942"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="pt-3 border-t border-[#DCE3E1] flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-[#475569]">
                Source: {timeseries.source_name}
              </span>
              <button
                type="button"
                onClick={() => downloadTimeseriesCsv(regionId, indicator, months)}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-[#0F2942] hover:bg-[#163656] text-white rounded transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Download (CSV)</span>
              </button>
            </div>
          </div>

          {/* M16 Comparison summary */}
          {compareData && (
            <div className="bg-[#F7F9F8] border border-[#DCE3E1] rounded p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-[#0F2942]">
                  {language === 'fr' ? 'Comparaison interannuelle' : 'Period Comparison'}
                </h2>
                <button
                  type="button"
                  onClick={() => openDatasetDialog(compareData.dataset_id)}
                  className="p-1 text-[#0E7490] hover:text-[#0F2942] cursor-pointer"
                  aria-label="Dataset info"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="bg-white border border-[#DCE3E1] rounded p-4 font-mono">
                  <div className="text-xs text-[#64748B]">{compareData.period_a.label}</div>
                  <div className="text-xl font-bold text-[#0F2942] mt-1">
                    {compareData.period_a.value ?? 'N/D'} {compareData.unit}
                  </div>
                </div>
                <div className="bg-white border border-[#0E7490] rounded p-4 text-center font-mono">
                  <div className="text-xs text-[#64748B]">Delta (%)</div>
                  <div className="text-xl font-bold text-[#0E7490] mt-1">
                    {compareData.delta_pct !== null
                      ? `${compareData.delta_pct > 0 ? '+' : ''}${compareData.delta_pct}%`
                      : 'N/D'}
                  </div>
                </div>
                <div className="bg-white border border-[#DCE3E1] rounded p-4 font-mono">
                  <div className="text-xs text-[#64748B]">{compareData.period_b.label}</div>
                  <div className="text-xl font-bold text-[#0F2942] mt-1">
                    {compareData.period_b.value ?? 'N/D'} {compareData.unit}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* M11 Data Sources (4 cards) */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-[#0F2942]">
          {language === 'fr' ? 'Sources de données NASA' : 'Data sources'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {datasets.map((ds) => (
            <div key={ds.id} className="bg-white border border-[#DCE3E1] rounded p-5 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-semibold text-[#0F2942]">{ds.name}</h3>
                <a
                  href={ds.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#0E7490] hover:underline shrink-0"
                >
                  <span>NASA</span>
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-[#334155]">
                <div>
                  <strong>Variable:</strong> {ds.variable}
                </div>
                <div>
                  <strong>{language === 'fr' ? 'Résolution' : 'Resolution'}:</strong>{' '}
                  <span className="font-mono">{ds.resolution}</span>
                </div>
                <div>
                  <strong>{language === 'fr' ? 'Unités' : 'Units'}:</strong>{' '}
                  <span className="font-mono">{ds.units}</span>
                </div>
                <div>
                  <strong>{language === 'fr' ? 'Période' : 'Period'}:</strong> {ds.period}
                </div>
              </div>
              <p className="text-xs text-[#475569] pt-2 border-t border-[#DCE3E1]">
                {language === 'fr' ? ds.limitations_fr : ds.limitations_en}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
