import { Suspense, lazy, useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from './auth';
import { Spinner } from './components/ui';
import { Splash } from './components/Splash';
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
import { Library } from './screens/Library';
import { Practice } from './screens/Practice';
import { Writing } from './screens/Writing';
import { Speaking } from './screens/Speaking';
import { Exceptions } from './screens/Exceptions';
import { Everyday } from './screens/Everyday';
import { Plan } from './screens/Plan';
import { Body } from './screens/Body';
import { Reading } from './screens/Reading';
import { Today } from './screens/Today';
import { Listening } from './screens/Listening';
const LibraryBook = lazy(() => import('./screens/LibraryBook').then((m) => ({ default: m.LibraryBook })));

export function App() {
  const { user, loading } = useAuth();
  const [minElapsed, setMinElapsed] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMinElapsed(true), 750); return () => clearTimeout(t); }, []);
  if (loading || !minElapsed) return <Splash />;
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
        <Route path="/practice" element={<Practice />} />
        <Route path="/writing" element={<Writing />} />
        <Route path="/speaking" element={<Speaking />} />
        <Route path="/exceptions" element={<Exceptions />} />
        <Route path="/everyday" element={<Everyday />} />
        <Route path="/plan" element={<Plan />} />
        <Route path="/body" element={<Body />} />
        <Route path="/reading" element={<Reading />} />
        <Route path="/today" element={<Today />} />
        <Route path="/listening" element={<Listening />} />
        <Route path="/library" element={<Library />} />
        <Route path="/library/:level/:file" element={<Suspense fallback={<Spinner label="Открываю книгу…" />}><LibraryBook /></Suspense>} />
        <Route path="/textbook" element={<Suspense fallback={<Spinner label="Открываю учебник…" />}><Textbook /></Suspense>} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  );
}
