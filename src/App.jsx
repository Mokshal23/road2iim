import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Mentor from './pages/Mentor';

export default function App() {
  return (
    <BrowserRouter>
      <header className="app-header">
        <Link to="/" className="app-header__title">Road2IIM</Link>
        <span className="app-header__sub">VARC · LRDI · QA tracker</span>
      </header>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/mentor" element={<Mentor />} />
      </Routes>
    </BrowserRouter>
  );
}
