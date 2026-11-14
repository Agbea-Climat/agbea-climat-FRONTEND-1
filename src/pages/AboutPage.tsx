import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { getDatasets } from '../services/climateApi.ts';
import type { DatasetInfo } from '../types/apiContract.ts';
import { LoadingPanel } from '../components/StatusStates.tsx';

export function AboutPage() {
  const { language } = useApp();
  const [datasets, setDatasets] = useState<DatasetInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDatasets()
      .then((res) => setDatasets(res.datasets))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-[1160px] mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="pb-5 border-b border-[#DCE3E1]">
        <p className="text-xs font-semibold text-[#1A5E36]">
          {language === 'fr' ? 'Sources & À propos' : 'Data sources & About'}
        </p>
        <h1 className="text-3xl font-bold text-[#0F2942] mt-1">
          {language === 'fr'
            ? 'Sources satellitaires officielles de la NASA'
            : 'Official NASA Earth Observation Sources'}
        </h1>
        <p className="text-sm text-[#475569] mt-2 max-w-2xl leading-relaxed">
          {language === 'fr'
            ? 'AGBÉA CLIMAT rend accessibles les archives publiques d’observation de la Terre de la NASA pour les cinq régions du Togo.'
            : 'AGBÉA CLIMAT makes public NASA Earth observation archives accessible across the five regions of Togo.'}
        </p>
      </div>

      {loading ? (
        <LoadingPanel rows={3} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {datasets.map((ds) => (
            <div key={ds.id} className="bg-white border border-[#DCE3E1] rounded p-6 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold text-[#0F2942]">{ds.name}</h2>
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
              <div className="space-y-1 text-xs text-[#334155]">
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
              <p className="text-xs text-[#475569] pt-3 border-t border-[#DCE3E1] leading-relaxed">
                {language === 'fr' ? ds.limitations_fr : ds.limitations_en}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
