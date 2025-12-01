import React from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import GameSelection from "./components/GameSelection";
import HostScreen from './components/HostScreen'; // 🚀 KRİTİK: HostScreen import edildi

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/game-selection" element={<GameSelection />} />
        
        {/* 🚀 KRİTİK: OYUN HOST EKRANI ROTASI EKLENDİ */}
        {/* Bu rota, GameSelection'dan gelen /play/game1, /play/game2 vb. isteklerini karşılar. */}
        <Route path="/play/:gameId" element={<HostScreen />} /> 
      </Routes>
    </Router>
  );
}

export default App;