import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from './context/AppContext.tsx';
import { MainLayout } from './layouts/MainLayout.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { MapPage } from './pages/MapPage.tsx';
import { ComparePage } from './pages/ComparePage.tsx';
import { PublicModePage } from './pages/PublicModePage.tsx';
import { AssistantPage } from './pages/AssistantPage.tsx';
import { ScientificModePage } from './pages/ScientificModePage.tsx';
import { AboutPage } from './pages/AboutPage.tsx';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <MainLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/carte" element={<MapPage />} />
            <Route path="/comparer" element={<ComparePage />} />
            <Route path="/grand-public" element={<PublicModePage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/scientifique" element={<ScientificModePage />} />
            <Route path="/a-propos" element={<AboutPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </AppProvider>
  );
}
