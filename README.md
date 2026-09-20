# 3D Minecraft Adventure

React + Three.js version of the 3D training game.

## Run locally

```bash
npm install
npm run dev
```

Create an optimized production bundle with `npm run build`.

## Structure

- `src/components/` — React screens and HUD components.
- `src/game/startGameEngine.js` — Three.js gameplay runtime, isolated from the interface.
- `src/game/gameData.js` — skills, weapons, loot, weather, and map balancing data.
- `src/styles/game.css` — preserved game styling.

`app.html` remains as the original standalone implementation for reference while the React app starts from `index.html`.
hello