import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext.tsx';

export function Footer() {
  const { language, meta } = useApp();
  const updatedDate = meta?.data_updated_at || '31/10/2026';

  return (
    <footer className="bg-[#0F2942] text-white border-t border-[#1E3A5F] mt-16">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-[#1E3A5F]">
          <div className="space-y-3">
            <img
              src="/assets/aistudio/agbeaclimat_logo_8ca34e04.png"
              alt="AGBÉA CLIMAT"
              className="h-9 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
            <p className="text-sm text-[#CBD5E1] leading-relaxed">
              {language === 'fr'
                ? 'Plateforme d’intelligence climatique dédiée à l’accessibilité des observations satellitaires de la NASA au Togo.'
                : 'Climate intelligence platform making NASA satellite observations understandable across Togo.'}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold tracking-wider text-[#94A3B8] mb-3">
              {language === 'fr' ? 'Navigation' : 'Navigation'}
            </h3>
            <ul className="space-y-2 text-sm text-[#CBD5E1]">
              <li>
                <Link to="/" className="hover:text-white">
                  {language === 'fr' ? 'Accueil' : 'Home'}
                </Link>
              </li>
              <li>
                <Link to="/carte" className="hover:text-white">
                  {language === 'fr' ? 'Explorer la carte' : 'Explore Map'}
                </Link>
              </li>
              <li>
                <Link to="/comparer" className="hover:text-white">
                  {language === 'fr' ? 'Comparer (Avant / Après)' : 'Before / After'}
                </Link>
              </li>
              <li>
                <Link to="/a-propos" className="hover:text-white">
                  {language === 'fr' ? 'Sources de données' : 'Data sources'}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold tracking-wider text-[#94A3B8] mb-3">
              {language === 'fr' ? 'Expériences' : 'Experiences'}
            </h3>
            <ul className="space-y-2 text-sm text-[#CBD5E1]">
              <li>
                <Link to="/grand-public" className="hover:text-white">
                  {language === 'fr' ? 'Mode agriculture' : 'Agriculture mode'}
                </Link>
              </li>
              <li>
                <Link to="/scientifique" className="hover:text-white">
                  {language === 'fr' ? 'Mode scientifique' : 'Scientific mode'}
                </Link>
              </li>
              <li>
                <Link to="/assistant" className="hover:text-white">
                  {language === 'fr' ? 'Assistant IA' : 'AI Chat'}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold tracking-wider text-[#94A3B8] mb-3">
              {language === 'fr' ? 'État des données & fonctions' : 'Data & Features'}
            </h3>
            <div className="space-y-2 text-xs text-[#CBD5E1]">
              <p className="font-mono text-white">
                {language === 'fr'
                  ? `Données mises à jour le ${updatedDate}`
                  : `Data updated on ${updatedDate}`}
              </p>
              <p>
                {language === 'fr' ? 'Voix — En développement' : 'Voice — In development'}
              </p>
              <p>
                {language === 'fr' ? 'Éwé — En projet' : 'Ewe — Planned'}
              </p>
            </div>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#94A3B8]">
          <p>AGBÉA CLIMAT · NASA Space Apps Challenge 2026</p>
          <p>Lomé, Togo — contact@agbeaclimat.org</p>
        </div>
      </div>
    </footer>
  );
}
