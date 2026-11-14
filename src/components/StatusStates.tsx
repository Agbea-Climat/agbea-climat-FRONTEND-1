import { AlertTriangle, Database, RefreshCw } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

export function LoadingPanel({ rows = 3 }: { rows?: number }) {
  return (
    <div
      className="bg-[#F7F9F8] border border-[#DCE3E1] rounded p-6 space-y-3"
      role="status"
      aria-label="Loading"
    >
      <div className="h-4 w-40 bg-[#E2E8F0] rounded animate-pulse" />
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="h-10 w-full bg-[#E2E8F0] rounded animate-pulse" />
      ))}
    </div>
  );
}

export function ErrorPanel({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  const { language } = useApp();
  return (
    <div
      className="bg-[#FEF2F2] border border-[#FECACA] rounded p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-[#B91C1C] shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <h3 className="text-sm font-semibold text-[#7F1D1D]">
            {language === 'fr' ? 'Erreur de chargement' : 'Error'}
          </h3>
          <p className="text-sm text-[#991B1B] mt-1">
            {message || 'Service error'}
          </p>
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-white text-[#7F1D1D] border border-[#FCA5A5] rounded hover:bg-[#FEE2E2] transition-colors shrink-0 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{language === 'fr' ? 'Réessayer' : 'Retry'}</span>
        </button>
      )}
    </div>
  );
}

export function EmptyDataPanel({
  title,
  description,
}: {
  title?: string;
  description?: string;
}) {
  const { language } = useApp();
  return (
    <div className="bg-[#F7F9F8] border border-[#DCE3E1] rounded p-8 text-center flex flex-col items-center justify-center min-h-[180px]">
      <Database className="w-6 h-6 text-[#64748B] mb-2.5" aria-hidden="true" />
      <h3 className="text-sm font-semibold text-[#0F2942]">
        {title || (language === 'fr' ? 'Aucune donnée pour cette période' : 'No data for this period')}
      </h3>
      {description && (
        <p className="text-sm text-[#475569] mt-1.5 max-w-md leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
