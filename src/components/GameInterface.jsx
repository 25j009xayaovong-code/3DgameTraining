import GameFeedback from './GameFeedback.jsx';
import GameHud from './GameHud.jsx';
import ProgressionOverlays from './ProgressionOverlays.jsx';
import StartScreen from './StartScreen.jsx';
import TowerDungeon from './TowerDungeon.jsx';

/**
 * React owns the stable HTML interface. The Three.js engine updates the values
 * inside these elements while keeping its original gameplay code unchanged.
 */
export default function GameInterface() {
  return (
    <>
      <div id="game-canvas-host" aria-hidden="true" />
      <StartScreen />
      <GameHud />
      <GameFeedback />
      <ProgressionOverlays />
      <TowerDungeon />
    </>
  );
}
