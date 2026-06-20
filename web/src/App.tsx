import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from './auth';
import { Spinner } from './components/ui';
import { Layout } from './components/Layout';
import { Admin } from './screens/Admin';

const Textbook = lazy(() => import('./screens/Textbook').then((m) => ({ default: m.Textbook })));
import { Login } from './screens/Login';
import { Home } from './screens/Home';
import { Lessons } from './screens/Lessons';
import { LessonScreen } from './screens/Lesson';
import { Grammar } from './screens/Grammar';
import { GrammarCardScreen } from './screens/GrammarCard';
import { Vocab } from './screens/Vocab';
import { Review } from './screens/Review';
import { Translator } from './screens/Translator';
import { Errors } from './screens/Errors';
import { ProgressScreen } from './screens/Progress';
import { Warmup } from './screens/Warmup';
import { Me } from './screens/Me';
import { Settings } from './screens/Settings';

export function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-full place-items-center"><Spinner /></div>;
  if (!user) return <Login />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/lessons" element={<Lessons />} />
        <Route path="/lessons/:id" element={<LessonScreen />} />
        <Route path="/grammar" element={<Grammar />} />
        <Route path="/grammar/:id" element={<GrammarCardScreen />} />
        <Route path="/vocab" element={<Vocab />} />
        <Route path="/review" element={<Review />} />
        <Route path="/translator" element={<Translator />} />
        <Route path="/errors" element={<Errors />} />
        <Route path="/progress" element={<ProgressScreen />} />
        <Route path="/warmup" element={<Warmup />} />
        <Route path="/me" element={<Me />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/textbook" element={<Suspense fallback={<Spinner label="Открываю учебник…" />}><Textbook /></Suspense>} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  );
}
