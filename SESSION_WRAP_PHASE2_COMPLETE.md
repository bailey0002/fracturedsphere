# The Fractured Sphere — Phase 2 Complete Session Wrap

**Date:** December 31, 2024  
**Version:** 0.2.0 (Phase 2 Complete)  
**Status:** ✅ Combat System + AI Integration Complete

---

## Project Structure

```
fractured-sphere/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.jsx              (10 lines)
    ├── App.jsx               (105 lines)
    ├── components/
    │   ├── CombatModal.jsx   (447 lines) — Battle UI with doctrine selection
    │   ├── FactionSelect.jsx (159 lines) — Faction picker screen
    │   ├── GameBoard.jsx     (275 lines) — Main game layout + AI integration
    │   ├── HexInfoPanel.jsx  (198 lines) — Selected hex details
    │   ├── HexMap.jsx        (209 lines) — SVG hex grid renderer
    │   ├── HexTile.jsx       (187 lines) — Individual hex component
    │   ├── ResourceBar.jsx   (48 lines)  — Resource display
    │   └── TurnBar.jsx       (95 lines)  — Turn/phase controls
    ├── data/
    │   ├── factions.js       (163 lines) — 4 factions + AI traits + diplomacy
    │   ├── mapData.js        (312 lines) — Hex generation + seasons
    │   ├── terrain.js        (249 lines) — Terrain types + buildings
    │   └── units.js          (293 lines) — Unit types + doctrines + veterancy
    ├── hooks/
    │   ├── useGameState.js   (673 lines) — Core state + combat actions
    │   └── useAI.js          (402 lines) — AI decision making
    ├── utils/
    │   ├── hexMath.js        (227 lines) — Hex coordinate math
    │   └── combatResolver.js (341 lines) — Combat calculations
    └── styles/
        └── index.css         (250+ lines) — Tailwind + custom styles
```

**Total:** ~4,300 lines of source code

---

## What's Working (Phase 2)

### Core Systems ✅
- Hex map generation with 4 faction starting positions
- Unit movement with pathfinding
- Terrain effects on combat
- Resource collection per turn
- Turn phases (Production → Diplomacy → Movement → Combat)

### Combat System ✅
- Doctrine selection (Assault, Defensive, Flanking, Siege, Blitz, Attrition)
- Rock-paper-scissors doctrine advantages (±20%)
- Lanchester-style damage calculation
- Combat preview with win probability
- Veterancy progression (Green → Trained → Veteran → Elite → Legendary)
- XP gain (5 per combat, 15 for kills)
- Territory capture on defender destruction

### AI System ✅
- Processes all non-player factions during movement phase
- Evaluates hex strategic value
- Weighs move options by faction personality
- Selects attack targets based on risk tolerance
- Uses recommended doctrines
- Faction personalities:
  - Continuity: Defensive (aggression 0.3)
  - Ascendant: Aggressive (aggression 0.8)
  - Collective: Balanced (aggression 0.5)
  - Reclaimers: Opportunistic (aggression 0.6)

---

## Key Data Structures (for Phase 3)

### BUILDINGS (terrain.js)
```javascript
BUILDINGS = {
  farm:     { cost: { gold: 60, iron: 20 }, buildTime: 2, production: { grain: 3 } },
  mine:     { cost: { gold: 80, iron: 30 }, buildTime: 2, production: { iron: 3 } },
  market:   { cost: { gold: 100, iron: 40 }, buildTime: 2, production: { gold: 5 } },
  fortress: { cost: { gold: 150, iron: 100 }, buildTime: 3, effects: { defenseBonus: 0.3 } },
  academy:  { cost: { gold: 120, iron: 50 }, buildTime: 3, effects: { xpBonus: 0.2 } },
  port:     { cost: { gold: 90, iron: 60 }, buildTime: 2, effects: { movementBonus: 1 } },
  relay:    { cost: { gold: 70, iron: 40 }, buildTime: 2, effects: { visionRange: 2 } },
}
```

### DIPLOMATIC_ACTIONS (factions.js)
```javascript
DIPLOMATIC_ACTIONS = {
  DECLARE_WAR:       { cost: { influence: 0 }, resultRelation: 'war' },
  PROPOSE_CEASEFIRE: { cost: { influence: 20, gold: 100 }, successChance: 0.4 },
  IMPROVE_RELATIONS: { cost: { influence: 15, gold: 50 }, successChance: 0.6 },
  PROPOSE_ALLIANCE:  { cost: { influence: 50, gold: 200 }, successChance: 0.3 },
}

RELATIONS = ['allied', 'cordial', 'neutral', 'hostile', 'war']
```

### State Shape (useGameState.js)
```javascript
state = {
  turn, phase, phaseIndex,
  playerFaction,
  mapData: { [hexId]: { q, r, terrain, owner, buildings: [], resources } },
  units: [{ id, type, owner, q, r, health, experience, veterancy, movedThisTurn, attackedThisTurn }],
  factionResources: { [factionId]: { gold, iron, grain, influence } },
  relations: { [factionId]: { [otherId]: 'neutral' | 'war' | ... } },
  selectedHex, selectedUnit, validMoves, validAttacks,
  pendingCombat: { attacker, defender, terrain } | null,
  // Phase 3 additions needed:
  // buildingQueue: [{ hexId, buildingType, turnsRemaining }]
  // trainingQueue: [{ hexId, unitType, turnsRemaining }]
}
```

---

## How to Run

```bash
unzip fractured-sphere-phase2.zip
cd fractured-sphere
npm install
npm run dev
# Opens at http://localhost:5173
```

---

## Phase 3 Continuation Prompt

**IMPORTANT:** Copy and use this prompt in a new session. Upload the zip file as an attachment (not to the project directory, which flattens the structure).

---

```
# The Fractured Sphere — Phase 3: Building & Diplomacy

## CRITICAL: File Upload Instructions
I'm attaching the Phase 2 zip file. Please EXTRACT it to /home/claude/ to preserve the directory structure. The project files should be at /home/claude/fractured-sphere/src/...

## Current State (Phase 2 Complete — v0.2.0)
- ✅ Hex map with 4 factions, unit movement, territory capture
- ✅ Combat system with doctrine selection, damage preview, veterancy
- ✅ AI moves and attacks for all non-player factions
- ✅ ~4,300 lines across 18 source files

## Phase 3 Goals

### Goal 1: Building System
**New file:** `src/components/BuildMenu.jsx`
- Show when hex selected during production phase
- Display available buildings (from BUILDINGS in terrain.js)
- Check resource costs against factionResources
- Terrain restrictions (e.g., port only on coast)

**State additions to useGameState.js:**
```javascript
// Add to initial state:
buildingQueue: []  // [{ hexId, buildingType, turnsRemaining, owner }]

// Add actions:
case 'START_BUILDING': {
  // Deduct resources, add to buildingQueue
}
case 'COMPLETE_BUILDING': {
  // Add building to hex.buildings array
}
// Modify END_TURN to decrement buildingQueue timers
```

**Integration:** Show BuildMenu in GameBoard when hex selected + production phase

### Goal 2: Unit Training
**New file:** `src/components/TrainMenu.jsx`
- Show available units (from UNITS in units.js)
- Require specific buildings (e.g., academy for elite units)
- Check resource costs

**State additions:**
```javascript
trainingQueue: []  // [{ hexId, unitType, turnsRemaining, owner }]

case 'START_TRAINING': { ... }
case 'COMPLETE_TRAINING': { 
  // Spawn new unit at hex
}
```

### Goal 3: Diplomacy
**New file:** `src/components/DiplomacyPanel.jsx`
- Show all factions with current relations
- Available actions based on DIPLOMATIC_ACTIONS
- Success/fail feedback

**State additions:**
```javascript
case 'DIPLOMATIC_ACTION': {
  // Check costs, roll for success, update relations
}
```

**AI diplomacy:** Add to useAI.js — AI decides whether to declare war, propose peace, etc.

## Token Limit Strategy

Phase 3 has 3 major features. If we hit token limits, prioritize in this order:

**Session 3A — Buildings (Priority 1)**
1. BuildMenu.jsx component
2. useGameState building actions
3. GameBoard integration
4. End turn queue processing

**Session 3B — Unit Training (Priority 2)**
1. TrainMenu.jsx component
2. useGameState training actions
3. Building requirements check

**Session 3C — Diplomacy (Priority 3)**
1. DiplomacyPanel.jsx component
2. useGameState diplomacy actions
3. AI diplomatic decisions
4. Relation effects on combat/movement

Each sub-session should be independently testable. Create a SESSION_WRAP at natural stopping points.

## Key Integration Points

1. **Production Phase Start:**
   - Process buildingQueue (decrement timers, complete buildings)
   - Process trainingQueue (decrement timers, spawn units)
   - Collect resources (existing)

2. **Production Phase UI:**
   - If hex selected with owned territory → show BuildMenu
   - If hex has training buildings → show TrainMenu

3. **Diplomacy Phase:**
   - Show DiplomacyPanel
   - AI makes diplomatic decisions

4. **Combat Modifiers:**
   - Check relations before allowing attacks (can't attack allied)
   - Fortress building adds defense bonus

## Let's Start

Please extract the zip and verify the structure, then begin with the Building System (Goal 1). Create BuildMenu.jsx first, then add the state actions.
```

---

## Uploading Files to Future Sessions

**Best approach:** Upload the `.zip` file as a chat attachment (not to Project files). Then ask Claude to extract it:

```
unzip /mnt/user-data/uploads/fractured-sphere-phase2.zip -d /home/claude/
```

This preserves the directory structure. The Project file upload flattens everything, which breaks imports.

---

## Technical Notes

- Combat uses Lanchester square law
- Doctrine advantage: ±20% force modifier
- First strike (Blitz): 15% pre-combat damage
- Units gain 5 XP per combat, 15 XP for kills
- Veterancy thresholds: 20/50/100/200 XP
- AI processes sequentially with 300-500ms delays for visibility

---

**End of Phase 2 Session Wrap**
