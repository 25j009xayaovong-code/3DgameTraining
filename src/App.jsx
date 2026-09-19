import { useEffect } from 'react';
import GameInterface from './components/GameInterface.jsx';
import { startGameEngine } from './game/startGameEngine.js';

export default function App() {
  useEffect(() => {
    startGameEngine();
  }, []);

  return <GameInterface />;
}
