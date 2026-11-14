import { useEffect, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { getDataset } from '../services/climateApi.ts';
import type { DatasetInfo } from '../types/apiContract.ts';
import { ErrorPanel, LoadingPanel } from './StatusStates.tsx';

export function DatasetInfoModal() {
  const { activeDatasetId, closeDatasetDialog, language } = useApp();
  const [dataset, setDataset] = useState<DatasetInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeDatasetId) {
      setDataset(null);
      return;
    }
    setLoading(true);
    setError(null);
    getDataset(activeDatasetId)
      .then(setDataset)
      .catch((err) => setError(err?.message || 'Dataset not found'))
      .finally(() => setLoading(false));
  }, [activeDatasetId]);

  if (!activeDatasetId) return null;

  return (
    <div
      className="fixed inset-0 z-[1200] bg-[#0F2942]/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dataset-modal-title"
    >
      <div className="bg-white border border-[#DCE3E1] rounded max-w-lg w-full p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-[#DCE3E1]">
          <div>
            <p className="text-xs font-mono text-[#0E7490]">{activeDatasetId}</p>
            <h2 id="dataset-modal-title" className="text-lg font-bold text-[#0F2942] mt-0.5">
              {dataset?.name || (language === 'fr' ? 'Source des données' : 'Data source')}
            </h2>
          </div>
          <button
            type="button"
            onClick={closeDatasetDialog}
            className="w-9 h-9 inline-flex items-center justify-center rounded border border-[#CBD5E1] text-[#334155] hover:bg-[#F7F9F8] cursor-pointer"
            aria-label={language === 'fr' ? 'Fermer' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <LoadingPanel rows={2} />
        ) : error ? (
          <ErrorPanel message={error} />
        ) : dataset ? (
          <div className="space-y-3 text-sm text-[#334155]">
            <div>
              <span className="font-semibold text-[#0F2942]">
                {language === 'fr' ? 'Variable :' : 'Variable:'}
              </span>{' '}
              {dataset.variable}
            </div>
            <div>
              <span className="font-semibold text-[#0F2942]">
                {language === 'fr' ? 'Résolution :' : 'Resolution:'}
              </span>{' '}
              <span className="font-mono text-xs">{dataset.resolution}</span>
            </div>
            <div>
              <span className="font-semibold text-[#0F2942]">
                {language === 'fr' ? 'Unités :' : 'Units:'}
              </span>{' '}
              <span className="font-mono text-xs">{dataset.units}</span>
            </div>
            <div>
              <span className="font-semibold text-[#0F2942]">
                {language === 'fr' ? 'Période :' : 'Period:'}
              </span>{' '}
              {dataset.period}
            </div>
            <div className="p-3 bg-[#F7F9F8] border border-[#DCE3E1] rounded text-xs text-[#475569] leading-relaxed">
              {language === 'fr' ? dataset.limitations_fr : dataset.limitations_en}
            </div>
            <div className="pt-2 flex items-center justify-between">
              <a
                href={dataset.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0E7490] hover:underline"
              >
                <span>
                  {language === 'fr' ? 'Documentation NASA officielle' : 'Official NASA documentation'}
                </span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
              <button
                type="button"
                onClick={closeDatasetDialog}
                className="px-4 py-2 text-xs font-semibold bg-[#0F2942] text-white rounded hover:bg-[#163656] cursor-pointer"
              >
                {language === 'fr' ? 'Fermer' : 'Close'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
