# The Fractured Sphere — Build Status

**Date:** January 3, 2026
**Status:** Sessions 1-4 Complete - Ready for Deployment

---

## What's Been Built

### Session 1: Core Foundation ✅
- `useGameState.js` — Complete 3-phase state machine
- `useChronicle.js` — Narrative log with voice synthesis
- `Chronicle.jsx` — Scrollable narrative display
- `PhasePrompt.jsx` — Always-visible action guidance
- `PhaseBar.jsx` — Phase indicators and buttons (in PhasePrompt.jsx)
- `GameBoard.jsx` — Main game layout with iOS compatibility

### Session 2: Production System ✅
- `BuildMenu.jsx` — Building construction popup
- `TrainMenu.jsx` — Unit training popup
- Queue processing in useGameState reducer

### Session 3: Combat System ✅
- `CombatModal.jsx` — Doctrine selection and combat preview
- `combatResolver.js` — Full combat resolution with doctrine modifiers
- Combat initiation via hex selection in conflict phase

### Session 4: AI & Polish ✅
- `useAI.js` — Complete AI decision-making for all phases
- AI evaluates building priorities based on faction traits
- AI evaluates attack targets with risk assessment
- AI movement toward strategic objectives
- Voice narration integration

---

## Complete File Structure

```
fractured-sphere/
├── index.html
├── package.json
├── vite.config.js
├── postcss.config.js
├── tailwind.config.js
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── components/
│   │   ├── FactionSelect.jsx
│   │   ├── GameBoard.jsx
│   │   ├── HexMap.jsx
│   │   ├── HexTile.jsx
│   │   ├── HexInfoPanel.jsx
│   │   ├── ResourceBar.jsx
│   │   ├── Chronicle.jsx
│   │   ├── PhasePrompt.jsx (includes PhaseBar)
│   │   ├── BuildMenu.jsx
│   │   ├── TrainMenu.jsx
│   │   └── CombatModal.jsx
│   ├── hooks/
│   │   ├── useGameState.js
│   │   ├── useChronicle.js
│   │   └── useAI.js
│   ├── utils/
│   │   ├── hexMath.js
│   │   └── combatResolver.js
│   ├── data/
│   │   ├── factions.js
│   │   ├── units.js
│   │   ├── terrain.js
│   │   └── mapData.js
│   └── styles/
│       └── index.css
```

---

## Deployment Instructions

### Local Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
```

### Deploy to Vercel
1. Push to GitHub repository
2. Connect repository to Vercel
3. Auto-deploys on push to main

---

## Game Features

### 4 Factions
- **Continuity** — Preservation-focused, defensive
- **Ascendant** — Aggressive expansionists
- **Collective** — Tech-focused, balanced
- **Reclaimers** — Resource-focused, adaptive

### 3-Phase Turn System
1. **Command** — Build structures, train units
2. **Conflict** — Declare attacks, resolve combat
3. **Maneuver** — Move units, collect income

### 9 Unit Types
- Ground: Shock Troopers, Garrison, Strike Cavalry
- Air: Interceptors, Bombers, Recon Drones
- Armor: Tanks, Walkers, Artillery

### 6 Combat Doctrines
- Assault, Defensive, Flanking, Siege, Blitz, Attrition

### Victory Conditions
- Domination (75% territory)
- Elimination (all enemy capitals)
- Economic (1000 gold + 50% map)

---

## iOS Compatibility

- Uses `onPointerUp` instead of `onClick`
- `touchAction: 'manipulation'` on all interactive elements
- `-webkit-overflow-scrolling: touch` for scroll areas
- Safe area insets for notch devices
- Dynamic viewport height (100dvh)

---

## Known Issues / Future Enhancements

1. AI movement in Maneuver phase needs refinement
2. Multi-unit combat (stacking) not fully implemented
3. Sound effects not added
4. Victory detection edge cases
5. Save/load functionality not implemented

---

## To Continue Development

Copy this entire folder to your GitHub repo and deploy. The game is fully playable as-is.

For enhancements, focus on:
1. Polish AI movement logic
2. Add sound effects
3. Implement save/load
4. Add tutorial overlay
