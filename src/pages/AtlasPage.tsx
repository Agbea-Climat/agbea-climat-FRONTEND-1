/**
 * Atlas des données : the AGBÉA data as in the data team's notebooks (01 thematic map, 02 unit sheet).
 * Static files produced by the data pipeline (`python -m pipeline export-front`) in public/atlas/:
 * values.json (normal, last complete year, anomaly, tested trend per unit × indicator × season),
 * units/<level>.geojson, series/<unit>.json, summaries/<unit>.json. Nothing is computed here except
 * colour classes and the Sen trend line drawn from the published slope.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApp } from '../context/AppContext.tsx';

type Level = 'region' | 'prefecture' | 'canton' | 'site';
type Measure = 'base' | 'value' | 'anom' | 'trend';
type Season = 'annual' | 'jfm' | 'mjjaso';
type Ind = 'rainfall' | 'ndvi' | 'lst_day' | 'lst_night';

interface TrendInfo { slope: number | null; lo: number | null; hi: number | null; pct: number | null; p: number | null; sig: boolean; first: number; last: number }
interface Entry { base: number | null; year?: number; value?: number | null; anom?: number | null; anom_pct?: number | null; trend?: TrendInfo }
interface UnitInfo { name: string; level: string; parent: string | null; area_km2: number | null; elevation?: { mean: number; min: number; max: number; pct_below_10m: number } }
interface Atlas {
  baseline: string;
  notes_fr: string[];
  indicators: Record<Ind, { label_fr: string; label_en: string; unit: string; decimals: number; agg: string }>;
  seasons: Record<Season, { label_fr: string; label_en: string }>;
  units: Record<string, UnitInfo>;
  data: Record<string, Partial<Record<Ind, Partial<Record<Season, Entry>>>>>;
}

const BASE = '/atlas';
const LEVELS: { id: Level; fr: string; en: string }[] = [
  { id: 'region', fr: 'Régions', en: 'Regions' },
  { id: 'prefecture', fr: 'Préfectures', en: 'Prefectures' },
  { id: 'canton', fr: 'Cantons', en: 'Cantons' },
  { id: 'site', fr: 'Sites pilotes', en: 'Pilot sites' },
];
const MEASURES: { id: Measure; fr: string; en: string }[] = [
  { id: 'base', fr: 'Moyenne 2001-2020', en: '2001-2020 mean' },
  { id: 'value', fr: 'Dernière année complète', en: 'Latest complete year' },
  { id: 'anom', fr: 'Écart à la normale', en: 'Anomaly' },
  { id: 'trend', fr: 'Tendance par décennie', en: 'Trend per decade' },
];
// Sequential palettes (low → high) per indicator, diverging palette for anomalies and trends
const SEQ: Record<Ind, string[]> = {
  rainfall: ['#E0F2FE', '#BAE6FD', '#7DD3FC', '#38BDF8', '#0284C7', '#0C4A6E'],
  ndvi: ['#F5F0E1', '#D9E8C4', '#A9CF8E', '#6FAF5F', '#3A8340', '#14532D'],
  lst_day: ['#FFF4E0', '#FED7AA', '#FDBA74', '#FB923C', '#EA580C', '#9A3412'],
  lst_night: ['#FFF4E0', '#FED7AA', '#FDBA74', '#FB923C', '#EA580C', '#9A3412'],
};
const DIV_WARM = ['#2563EB', '#93C5FD', '#F1F5F9', '#FCA5A5', '#DC2626']; // negative → positive (warmer = red)
const DIV_WET = ['#B45309', '#FCD34D', '#F1F5F9', '#93C5FD', '#1D4ED8']; // drier = brown, wetter = blue
const DIV_GREEN = ['#B45309', '#FCD34D', '#F1F5F9', '#86EFAC', '#15803D'];
const GREY = '#CBD5E1';

function fmt(x: number | null | undefined, d: number, lang: string, signed = false): string {
  if (x === null || x === undefined || Number.isNaN(x)) return '—';
  const s = x.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });
  return signed && x > 0 ? `+${s}` : s;
}

/** Value shown on the map for a unit, and whether it is "greyed" (no data or non-significant trend). */
function pick(e: Entry | undefined, m: Measure, ind: Ind): { v: number | null; grey: boolean } {
  if (!e) return { v: null, grey: true };
  if (m === 'base') return { v: e.base, grey: e.base === null };
  if (m === 'value') return { v: e.value ?? null, grey: e.value === null || e.value === undefined };
  if (m === 'anom') {
    const v = ind === 'rainfall' || ind === 'ndvi' ? e.anom_pct ?? null : e.anom ?? null;
    return { v, grey: v === null };
  }
  const t = e.trend;
  return { v: t?.slope ?? null, grey: !t || t.slope === null || !t.sig };
}

export function AtlasPage() {
  const { language } = useApp();
  const fr = language === 'fr';
  const [atlas, setAtlas] = useState<Atlas | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState<Level>('prefecture');
  const [ind, setInd] = useState<Ind>('rainfall');
  const [season, setSeason] = useState<Season>('annual');
  const [measure, setMeasure] = useState<Measure>('base');
  const [selected, setSelected] = useState<string | null>(null);
  const [geo, setGeo] = useState<Partial<Record<Level, any>>>({});
  const [series, setSeries] = useState<Record<string, Record<string, [number, number | null, number | null][]>> | null>(null);
  const [summary, setSummary] = useState<any>(null);

  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    fetch(`${BASE}/values.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`values.json ${r.status}`))))
      .then(setAtlas)
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    if (geo[level]) return;
    fetch(`${BASE}/units/${level}.geojson`)
      .then((r) => r.json())
      .then((g) => setGeo((prev) => ({ ...prev, [level]: g })))
      .catch(() => {});
  }, [level, geo]);

  // Unit sheet: annual/seasonal series + published summary (regions, prefectures, sites)
  useEffect(() => {
    setSeries(null);
    setSummary(null);
    if (!selected) return;
    fetch(`${BASE}/series/${selected}.json`).then((r) => (r.ok ? r.json() : null)).then(setSeries).catch(() => {});
    fetch(`${BASE}/summaries/${selected}.json`).then((r) => (r.ok ? r.json() : null)).then(setSummary).catch(() => {});
  }, [selected]);

  // Map creation
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const map = L.map(mapEl.current, { center: [8.6, 0.9], zoom: 7, minZoom: 6, maxZoom: 12 });
    const esri = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas';
    L.tileLayer(`${esri}/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`, {
      attribution: 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors · AGBÉA CLIMAT (NASA)',
      maxZoom: 16,
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  const meta = atlas?.indicators[ind];
  const decimals = measure === 'anom' && (ind === 'rainfall' || ind === 'ndvi') ? 1 : (meta?.decimals ?? 1) + (measure === 'trend' ? 1 : 0);
  const unitLabel =
    measure === 'anom' && (ind === 'rainfall' || ind === 'ndvi') ? '%' : measure === 'trend' ? `${meta?.unit || ''}/${fr ? 'décennie' : 'decade'}` : meta?.unit || '';

  // Colour classes for the units of the current level
  const scale = useMemo(() => {
    const g = geo[level];
    if (!atlas || !g) return null;
    const vals: number[] = [];
    for (const f of g.features) {
      const { v, grey } = pick(atlas.data[f.properties.id]?.[ind]?.[season], measure, ind);
      if (v !== null && !grey) vals.push(v);
    }
    if (!vals.length) return { breaks: [] as number[], colors: [] as string[], diverging: false };
    const diverging = measure === 'anom' || measure === 'trend';
    if (diverging) {
      const m = Math.max(...vals.map(Math.abs)) || 1;
      const colors = ind === 'rainfall' ? DIV_WET : ind === 'ndvi' ? DIV_GREEN : DIV_WARM;
      return { breaks: [-0.6 * m, -0.2 * m, 0.2 * m, 0.6 * m], colors, diverging };
    }
    const sorted = [...vals].sort((a, b) => a - b);
    const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
    return { breaks: [q(1 / 6), q(2 / 6), q(3 / 6), q(4 / 6), q(5 / 6)], colors: SEQ[ind], diverging };
  }, [atlas, geo, level, ind, season, measure]);

  const colorOf = (v: number | null, grey: boolean) => {
    if (v === null || grey || !scale || !scale.colors.length) return GREY;
    let i = 0;
    while (i < scale.breaks.length && v > scale.breaks[i]) i++;
    return scale.colors[i];
  };

  // Choropleth layer
  useEffect(() => {
    const map = mapRef.current;
    const g = geo[level];
    if (!map || !g || !atlas) return;
    if (layerRef.current) map.removeLayer(layerRef.current);
    const layer = L.geoJSON(g, {
      style: (f: any) => {
        const { v, grey } = pick(atlas.data[f.properties.id]?.[ind]?.[season], measure, ind);
        const sel = f.properties.id === selected;
        return { color: sel ? '#0F2942' : '#64748B', weight: sel ? 3 : level === 'canton' ? 0.5 : 1, fillColor: colorOf(v, grey), fillOpacity: 0.78 };
      },
      onEachFeature: (f: any, fl) => {
        const e = atlas.data[f.properties.id]?.[ind]?.[season];
        const { v, grey } = pick(e, measure, ind);
        const extra = measure === 'trend' && e?.trend && !e.trend.sig ? (fr ? ' (non significatif)' : ' (not significant)') : '';
        const when = measure === 'value' && e?.year ? ` · ${e.year}` : '';
        fl.bindTooltip(
          `<strong>${f.properties.name}</strong><br/>${v === null ? (fr ? 'pas de donnée' : 'no data') : `${fmt(v, decimals, language, measure !== 'base' && measure !== 'value')} ${unitLabel}`}${when}${extra}`,
          { sticky: true }
        );
        fl.on('click', () => setSelected(f.properties.id));
        if (grey) (fl as L.Path).setStyle({ fillOpacity: 0.55 });
      },
    }).addTo(map);
    layerRef.current = layer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo, level, atlas, ind, season, measure, selected, scale, language]);

  const unit = selected && atlas ? atlas.units[selected] : null;
  const parent = unit?.parent && atlas ? atlas.units[unit.parent] : null;
  const entries = selected && atlas ? atlas.data[selected]?.[ind] : undefined;
  const chartData = useMemo(() => {
    const s = series?.[ind]?.[season];
    const e = entries?.[season];
    if (!s) return [];
    // Sen line: published slope per decade; intercept = median of (value − slope·year) over the tested years
    let sen: ((y: number) => number) | null = null;
    if (e?.trend?.sig && e.trend.slope !== null) {
      const b = e.trend.slope / 10;
      const pts = s.filter(([y, v]) => v !== null && y >= e.trend!.first && y <= e.trend!.last);
      const ints = pts.map(([y, v]) => (v as number) - b * y).sort((a, c) => a - c);
      if (ints.length) {
        const mid = ints[Math.floor(ints.length / 2)];
        sen = (y) => mid + b * y;
      }
    }
    return s.map(([year, value]) => ({
      year,
      value,
      sen: sen && e?.trend && year >= e.trend.first && year <= e.trend.last ? Number(sen(year).toFixed(3)) : null,
    }));
  }, [series, entries, ind, season]);

  const selectCls = 'h-9 px-2.5 text-sm bg-white border border-[#CBD5E1] rounded text-[#0F2942]';
  const levelName = (l: string) => LEVELS.find((x) => x.id === l)?.[fr ? 'fr' : 'en'] || (l === 'country' ? (fr ? 'Pays' : 'Country') : l);

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-8 space-y-5">
      <div className="pb-4 border-b border-[#DCE3E1]">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0F2942] tracking-tight">{fr ? 'Atlas des données' : 'Data atlas'}</h1>
        <p className="text-sm text-[#475569] mt-1">
          {fr
            ? "Les données satellites de la NASA traitées par AGBÉA CLIMAT, par région, préfecture, canton ou site pilote. Cliquez sur une zone pour voir sa fiche."
            : 'NASA satellite data processed by AGBÉA CLIMAT, by region, prefecture, canton or pilot site. Click an area to see its sheet.'}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="text-xs font-semibold text-[#475569]">
          {fr ? 'Niveau' : 'Level'}
          <select className={`${selectCls} w-full mt-1`} value={level} onChange={(e) => { setLevel(e.target.value as Level); setSelected(null); }}>
            {LEVELS.map((l) => <option key={l.id} value={l.id}>{fr ? l.fr : l.en}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-[#475569]">
          {fr ? 'Indicateur' : 'Indicator'}
          <select className={`${selectCls} w-full mt-1`} value={ind} onChange={(e) => setInd(e.target.value as Ind)}>
            {atlas && (Object.keys(atlas.indicators) as Ind[]).map((k) => <option key={k} value={k}>{fr ? atlas.indicators[k].label_fr : atlas.indicators[k].label_en}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-[#475569]">
          {fr ? 'Saison' : 'Season'}
          <select className={`${selectCls} w-full mt-1`} value={season} onChange={(e) => setSeason(e.target.value as Season)}>
            {atlas && (Object.keys(atlas.seasons) as Season[]).map((k) => <option key={k} value={k}>{fr ? atlas.seasons[k].label_fr : atlas.seasons[k].label_en}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold text-[#475569]">
          {fr ? 'Mesure' : 'Measure'}
          <select className={`${selectCls} w-full mt-1`} value={measure} onChange={(e) => setMeasure(e.target.value as Measure)}>
            {MEASURES.map((m) => <option key={m.id} value={m.id}>{fr ? m.fr : m.en}</option>)}
          </select>
        </label>
      </div>

      {error && <div className="p-3 text-sm bg-[#FEF2F2] border border-[#FCA5A5] rounded text-[#991B1B]">{fr ? 'Atlas indisponible' : 'Atlas unavailable'} : {error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-3">
          <div ref={mapEl} className="relative z-0 isolate w-full h-[520px] border border-[#DCE3E1] rounded overflow-hidden" aria-label="Atlas map" />
          {scale && scale.colors.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#334155]">
              <span className="font-semibold">{(fr ? meta?.label_fr : meta?.label_en)} · {MEASURES.find((m) => m.id === measure)?.[fr ? 'fr' : 'en']} {unitLabel && `(${unitLabel})`}</span>
              {scale.colors.map((c, i) => {
                const lo = i === 0 ? null : scale.breaks[i - 1];
                const hi = i < scale.breaks.length ? scale.breaks[i] : null;
                const signed = scale.diverging;
                const label = lo === null ? `< ${fmt(hi, decimals, language, signed)}` : hi === null ? `> ${fmt(lo, decimals, language, signed)}` : `${fmt(lo, decimals, language, signed)} – ${fmt(hi, decimals, language, signed)}`;
                return (
                  <span key={c} className="flex items-center gap-1">
                    <span className="w-3.5 h-3.5 rounded-sm border border-[#94A3B8]" style={{ backgroundColor: c }} />
                    <span className="font-mono">{label}</span>
                  </span>
                );
              })}
              <span className="flex items-center gap-1">
                <span className="w-3.5 h-3.5 rounded-sm border border-[#94A3B8]" style={{ backgroundColor: GREY }} />
                {measure === 'trend' ? (fr ? 'non significative' : 'not significant') : fr ? 'pas de donnée' : 'no data'}
              </span>
            </div>
          )}
          {atlas && (
            <ul className="text-xs text-[#475569] list-disc pl-5 space-y-0.5">
              {atlas.notes_fr.map((n) => <li key={n}>{n}</li>)}
            </ul>
          )}
        </div>

        <aside className="lg:col-span-5 bg-white border border-[#DCE3E1] rounded p-5 space-y-4">
          {!unit ? (
            <p className="text-sm text-[#475569]">{fr ? 'Cliquez sur une zone de la carte pour afficher sa fiche.' : 'Click an area on the map to show its sheet.'}</p>
          ) : (
            <>
              <div>
                <div className="text-xs font-semibold text-[#1A5E36]">{levelName(unit.level)}{parent ? ` · ${parent.name}` : ''}</div>
                <h2 className="text-xl font-bold text-[#0F2942]">{unit.name}</h2>
                <p className="text-xs text-[#475569] mt-1">
                  {unit.area_km2 ? `${fmt(unit.area_km2, 0, language)} km²` : ''}
                  {unit.elevation ? ` · ${fr ? 'altitude moyenne' : 'mean elevation'} ${fmt(unit.elevation.mean, 0, language)} m (${fmt(unit.elevation.min, 0, language)} – ${fmt(unit.elevation.max, 0, language)} m), ${fmt(unit.elevation.pct_below_10m, 1, language)} % ${fr ? 'sous 10 m' : 'below 10 m'}` : ''}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[#0F2942]">{fr ? meta?.label_fr : meta?.label_en} · {fr ? atlas?.seasons[season].label_fr : atlas?.seasons[season].label_en}</h3>
                <div className="h-56 mt-2">
                  {chartData.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} width={48} domain={['auto', 'auto']} />
                        <Tooltip formatter={(v: any) => (v === null ? '—' : fmt(Number(v), meta?.decimals ?? 1, language))} />
                        <Bar dataKey="value" name={fr ? 'Valeur' : 'Value'} fill="#0E7490" fillOpacity={0.75} isAnimationActive={false} />
                        {entries?.[season]?.base !== null && entries?.[season]?.base !== undefined && (
                          <ReferenceLine y={entries[season]!.base as number} stroke="#0F2942" strokeDasharray="4 4" label={{ value: fr ? 'normale 2001-2020' : '2001-2020 normal', fontSize: 10, position: 'insideTopLeft' }} />
                        )}
                        <Line dataKey="sen" name={fr ? 'Tendance (Sen)' : 'Trend (Sen)'} stroke="#DC2626" strokeWidth={2.5} dot={false} connectNulls isAnimationActive={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-xs text-[#475569]">{fr ? 'Chargement…' : 'Loading…'}</p>
                  )}
                </div>
                <p className="text-[11px] text-[#64748B] mt-1">
                  {fr ? "Barres vides : année incomplète. Ligne rouge : tendance, seulement si elle est significative." : 'Missing bars: incomplete year. Red line: trend, only when significant.'}
                </p>
              </div>

              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-[#475569] border-b border-[#DCE3E1]">
                    <th className="py-1">{fr ? 'Saison' : 'Season'}</th>
                    <th>{fr ? 'Normale' : 'Normal'}</th>
                    <th>{fr ? 'Dernière année' : 'Latest year'}</th>
                    <th>{fr ? 'Tendance / décennie' : 'Trend / decade'}</th>
                  </tr>
                </thead>
                <tbody>
                  {(['annual', 'jfm', 'mjjaso'] as Season[]).map((s) => {
                    const e = entries?.[s];
                    const t = e?.trend;
                    const d = meta?.decimals ?? 1;
                    return (
                      <tr key={s} className="border-b border-[#F1F5F9]">
                        <td className="py-1.5">{fr ? atlas?.seasons[s].label_fr : atlas?.seasons[s].label_en}</td>
                        <td>{fmt(e?.base, d, language)} {meta?.unit}</td>
                        <td>{e?.year ? `${fmt(e.value, d, language)} ${meta?.unit} (${e.year})` : '—'}</td>
                        <td className={t?.sig ? 'font-semibold text-[#0F2942]' : 'text-[#94A3B8]'}>
                          {t ? `${fmt(t.slope, d + 1, language, true)} ${meta?.unit} (${t.first}-${t.last})${t.sig ? '' : fr ? ', non significatif' : ', not significant'}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {summary?.latest && (
                <div className="text-xs text-[#334155] space-y-1">
                  <div className="font-semibold text-[#0F2942]">{fr ? 'Dernières observations fiables' : 'Latest reliable observations'}</div>
                  {(['rainfall', 'ndvi', 'lst_day'] as const).map((k) => {
                    const o = summary.latest[k];
                    if (!o || o.value === null) return null;
                    const d = atlas?.indicators[k].decimals ?? 1;
                    return (
                      <div key={k}>
                        {fr ? atlas?.indicators[k].label_fr : atlas?.indicators[k].label_en} ({o.date}) : {fmt(o.value, d + (k === 'rainfall' ? 1 : 0), language)} {atlas?.indicators[k].unit}
                        {' '}({fr ? 'normale' : 'normal'} {fmt(o.clim_mean, d + (k === 'rainfall' ? 1 : 0), language)})
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
