# Game Plan: Last Z - Survival Shooter

## Risk Tasks

### 1. Vertical Scrolling Shooter with Touch/Mouse Input
- **Why isolated:** Smooth scrolling, collision detection, and responsive input on both mobile and desktop require careful frame-rate management and input abstraction.
- **Approach:** Use Babylon.js 2D mode (orthographic camera), sprite-based rendering. Player movement via pointer/touch drag. Auto-fire with cooldown. Collision via AABB. Scrolling background via tiling texture offset.
- **Verify:** Player moves smoothly following input. Bullets fire automatically. Enemies spawn from top and move down. Collisions register correctly. No frame drops below 30fps on mid-range devices.

### 2. Game State Machine (Shooting ↔ Base ↔ Heroes ↔ Research)
- **Why isolated:** Multiple game modes sharing state (resources, progression) with seamless transitions. Scene disposal and recreation must not leak memory.
- **Approach:** Central GameStateManager with enum states. Each mode has its own scene setup/teardown. Shared PlayerData persisted to localStorage. React overlay for base/heroes/research UI (HTML over canvas).
- **Verify:** Transitions between all modes work without errors. State persists across transitions. No memory leaks on repeated transitions.

## Main Build

### Core Systems
- Player character with movement and auto-fire
- Enemy spawning system (waves, types, boss)
- Projectile system (player bullets, enemy attacks)
- Collision detection and damage
- Resource drops and collection
- Wave progression and difficulty scaling
- Score and XP tracking

### Meta Systems (React UI overlay)
- Base building: HQ upgrade, buildings (barracks, lab, armory, storage)
- Research tree: unlock upgrades via time + resources
- Hero roster: collect, level up, equip to squad
- Resource management: gold, food, steel, biofuel
- Daily missions and offline progress simulation

### UI/UX
- Title screen with play button
- Bottom navigation tabs (Shoot / Base / Heroes / Research / Missions)
- In-game HUD (health, wave, score, resources)
- Upgrade/purchase confirmation dialogs
- Progress bars and timers

- **Assets needed:**
  - Player sprite (hazmat soldier, top-down)
  - Zombie sprites (3 types: basic, fast, tank)
  - Bullet/projectile sprites
  - Background tiles (road, ruins)
  - Building icons for base
  - Hero portrait cards
  - UI elements (buttons, bars, frames)
  - Logo/brand mark

- **Verify:**
  - Player input → character response feels correct
  - Enemies path toward player, take damage, die with effects
  - Resources accumulate and persist between sessions
  - Base upgrades consume resources and provide benefits
  - Hero leveling works and affects shooting stats
  - Research unlocks are gated by prerequisites
  - UI is readable, no overflow or overlap
  - No browser console errors during gameplay
  - reference.png consistency: dark teal + neon green palette, biopunk aesthetic
  - Game loads and runs on mobile viewport (375px width)

*** Add File: /home/ubuntu/last-z-survival/STRUCTURE.md
# Project Structure: Last Z - Survival Shooter

## Architecture Overview

The game uses a hybrid architecture:
- **Babylon.js** handles the shooting gameplay (canvas-based, 60fps)
- **React** handles all meta-game UI (base, heroes, research, navigation)
- **Shared state** via a singleton GameData class persisted to localStorage

## File Layout

```
client/src/
├── components/
│   ├── GameCanvas.tsx          # Babylon.js host component
│   ├── ui/                     # shadcn/ui components
│   └── game/                   # Game-specific React UI
│       ├── BaseView.tsx        # Base building interface
│       ├── HeroPanel.tsx       # Hero roster and management
│       ├── ResearchTree.tsx    # Research/upgrade tree
│       ├── MissionPanel.tsx    # Daily missions
│       ├── GameHUD.tsx         # In-shooting overlay HUD
│       ├── NavBar.tsx          # Bottom tab navigation
│       └── ResourceBar.tsx     # Top resource display
├── game/                       # Pure TS game logic (no React)
│   ├── scene.ts               # createGameScene entry point
│   ├── GameWorld.ts            # Main game world orchestrator
│   ├── Player.ts              # Player entity
│   ├── Enemy.ts               # Enemy entities and spawning
│   ├── Projectile.ts          # Bullet/projectile system
│   ├── WaveManager.ts         # Wave progression logic
│   ├── CollisionSystem.ts     # AABB collision detection
│   ├── Background.ts          # Scrolling background
│   ├── InputManager.ts        # Touch/mouse input abstraction
│   ├── ParticleEffects.ts     # Death/hit effects
│   └── constants.ts           # Game balance constants
├── data/
│   ├── GameData.ts            # Singleton state manager + localStorage
│   ├── buildings.ts           # Building definitions and costs
│   ├── heroes.ts              # Hero definitions and stats
│   ├── research.ts            # Research tree definitions
│   ├── enemies.ts             # Enemy type definitions
│   └── missions.ts            # Daily mission definitions
├── pages/
│   └── Home.tsx               # Main game page (routes all views)
└── App.tsx                     # Router setup
```

## Key Design Decisions

1. **React for meta, Babylon for action:** The shooting mode runs entirely in Babylon.js for performance. All strategy/management UI is React with Tailwind for rapid iteration.

2. **Single page, multiple views:** No page navigation. A state machine controls which view is active (shooting, base, heroes, research, missions). The Babylon canvas is hidden (not destroyed) when in meta views.

3. **localStorage persistence:** All player progress saves to localStorage. No backend required for the prototype. Data includes resources, building levels, hero roster, research progress, wave progress.

4. **Event-driven communication:** GameCanvas dispatches custom events (wave-complete, resource-gained, player-died) that React listens to for UI updates.

*** Add File: /home/ubuntu/last-z-survival/ASSETS.md
# Assets

**Art direction:** Biopunk/toxic aesthetic. Dark teal (#0A2E36) backgrounds with neon green (#39FF14) accents. Mutated organic elements contrast with clean scientific UI. Floating spore particles. Hexagonal patterns. Magenta (#FF006E) for danger/boss indicators.

## Generated Assets

| Asset | URL | Purpose |
|-------|-----|---------|
| Visual Reference | /manus-storage/reference-screenshot_8f11cd17.png | Art direction target for shooting mode |
| Logo Icon | /manus-storage/logo-icon_5f8f41cc.png | Brand mark (Z + biohazard) |
| Base View | /manus-storage/base-view_b18c0c94.png | Base building mode reference |
| Hero Card | /manus-storage/hero-card_68173000.png | Hero portrait card style reference |
| Title Screen | /manus-storage/title-screen_2820ef3e.png | Title/splash screen background |

## Procedural Assets (Babylon.js runtime)

| Asset | Method | Description |
|-------|--------|-------------|
| Player | Colored rectangle + glow | Green-visored hazmat soldier silhouette |
| Zombies | Colored rectangles + particles | 3 types differentiated by size/color |
| Bullets | Small bright rectangles | Green player bullets, magenta enemy projectiles |
| Background | Tiling dark texture | Scrolling road/ground |
| Particles | Babylon particle system | Spore float, death splatter, hit flash |
| Buildings | React UI cards | Icon-based building representation |

*** Add File: /home/ubuntu/last-z-survival/MEMORY.md
# Memory: Last Z - Survival Shooter

## Decisions
- Using Babylon.js for shooting mode only (2D orthographic)
- React overlay for all meta-game UI (base, heroes, research)
- localStorage for persistence (no backend needed)
- Procedural sprites (colored shapes + particles) for shooting mode entities
- Generated images for UI backgrounds and hero cards

## Quirks Found
- Babylon.js Engine must be initialized once (React StrictMode guard)
- Canvas must be hidden not destroyed when switching to meta views
- Touch input needs touchAction: none on canvas

## What Works
- (to be filled during implementation)

## What Failed
- (to be filled during implementation)
