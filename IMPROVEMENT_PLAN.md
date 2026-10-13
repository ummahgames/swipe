# Swipe Game Improvement Plan

Rebuild Swipe around satisfying cuts, readable waves, and short harvest challenges. Preserve the immediate swipe interaction and the fruit theme, but replace the endless random orbital spawning with a campaign that teaches a skill, tests it, and rewards mastery. Keep the entire game in HTML, CSS, and JavaScript, with Canvas rendering and local saves.

This is an implementation proposal. Gameplay values below are starting points for tuning. The first release should prove one polished chapter before expanding to the full campaign.

## Current game assessment

The current game consists of a 1,253 line JavaScript file, a full screen canvas, a score label, and basic CSS. It includes 15 procedurally drawn fruits, swipe effects, synthesized audio, orbital motion, and an elapsed time difficulty increase. There are no external assets or runtime dependencies. The simplicity of deployment and the variety of fruit are worth preserving.

### Confirmed defects

| Priority | Problem and evidence | Required change |
| --- | --- | --- |
| P0 | Score initializes to zero but never changes; `scoreValue` is never updated. A successful cut leaves the score at zero. | Emit a slice event, award points exactly once per original fruit, and update the HUD. |
| P0 | `resize` scales rendering to CSS pixels, while `updateCenterPoint` and `spawnObject` use backing buffer dimensions. A code fixture for a 390 by 844 viewport at DPR 3 produces a center at 585, 1266 and a right edge spawn at x 1220. | Store logical viewport dimensions separately. Use those dimensions for all gameplay and pointer coordinates; reserve DPR for rendering. |
| P0 | `breakIntoPieces` constructs a random fruit and then overwrites its type without rebuilding `fruitData`. A grape child can have null data and throw when drawing its grapes. An exception in drawing prevents the next animation frame from being scheduled. | Create fragments from the parent's immutable visual data. Remove random fruit construction from fragmentation. |
| P0 | Gravity divides by distance with no protection at the center. A center position fixture produces nonfinite coordinates. | Replace normal play with bounded toss physics. Any optional orbit implementation must clamp denominators and enforce a lifetime. |
| P1 | Position, fading, rotation, and particle life advance per frame. Particle life lasts 0.833 seconds at 60 updates per second and 0.417 seconds at 120. | Use a fixed simulation timestep, velocities in pixels per second, and durations in seconds. |
| P1 | `checkSlice` breaks after one collision. A stroke crossing two overlapping fruits slices only the last one in the array. | Collect all eligible intersections, resolve in stroke order, and count each target once. |
| P1 | Rectangle collision tests only rectangle edges. A segment from 95, 100 to 105, 100 entirely inside a fruit centered at 100, 100 returns false. Parallel and degenerate cases are also poorly handled. | Use segment distance to circular or elliptical fruit hit regions, including containment and a small blade thickness. |
| P1 | Culling uses twice the randomized orbit center as the screen boundary. This can remove targets before they enter even at DPR 1. Center changes also affect only newly constructed objects. | Cull against the actual viewport, with explicit entering, active, and exiting states. |
| P1 | A sliced parent is also fading, so the fading branch prevents its separation animation from progressing. Drawing draws two whole fruits; generated children are smaller whole fruits that remain sliceable. | Remove the original target and create two clipped, noninteractive halves aligned with the cut. |
| P1 | Input handles separate touch and mouse events, without pointer capture, cancellation, or release outside the canvas. | Use a single Pointer Events implementation and explicit gesture cleanup. |
| P1 | Audio constructs sample buffers and convolution impulses on every movement or hit; audio support is assumed during game construction. | Initialize audio after interaction, cache sounds, limit voices, and tolerate unavailable audio. |
| P2 | Particle fading modifies an RGB string, but fruit colors are hex strings, so opacity never changes through that expression. Some drawing details use random values every frame, such as pineapple leaves. | Use `globalAlpha` for particles and stable per fruit visual data. |
| P2 | There is no pause, restart, result screen, persistence, tutorial, or meaningful success or failure. Difficulty changes primarily by time survived. | Introduce a run lifecycle, authored goals, deliberate pacing, and saved chapter progress. |

Source locations: [fruit construction and fragmentation](/Users/muhammad/Documents/GitHub/ummah-games/swipe/game.js:42), [movement and culling](/Users/muhammad/Documents/GitHub/ummah-games/swipe/game.js:156), [fruit rendering](/Users/muhammad/Documents/GitHub/ummah-games/swipe/game.js:266), [particles](/Users/muhammad/Documents/GitHub/ummah-games/swipe/game.js:691), [audio](/Users/muhammad/Documents/GitHub/ummah-games/swipe/game.js:797), [viewport and input](/Users/muhammad/Documents/GitHub/ummah-games/swipe/game.js:949), [spawning and collision](/Users/muhammad/Documents/GitHub/ummah-games/swipe/game.js:1092), [difficulty and game loop](/Users/muhammad/Documents/GitHub/ummah-games/swipe/game.js:1193).

The reproduced failures come from isolated Node execution of the existing classes with canvas and audio stubs. Visual polish, actual input latency, and physical device performance require later measurement; they are not established by these fixtures.

## Game direction

Use the working theme **Swipe Harvest**: bright fruit, expressive cut interiors, a dusk orchard, baskets, and a journey through increasingly unusual gardens. The player should understand the action immediately, enjoy a single cut, then discover the benefit of cutting several fruits together.

Design around four goals:

1. A visible blade passing through a fruit should produce a reliable cut.
2. Targets should give players enough time and space to choose a useful stroke.
3. Each round should contain anticipation, a satisfying burst, and a brief recovery.
4. Progress should unlock new patterns and places while preserving readable rules.

First visits should open directly into a safe playable introduction with the instruction “Swipe through the fruit.” Start its timeline on the first deliberate interaction. Returning players should see their next challenge with one clear Play action. Provide a direct Quick Play action for players who want immediate slicing. Keep menus small and out of active play.

## Swipe feel and physics

### Input and collision

- Accept touch, pen, and primary mouse dragging through Pointer Events. Capture the active pointer; clear the gesture on up, cancel, lost capture, blur, pause, and resize. Ignore secondary pointers during a stroke.
- Convert positions using the canvas bounding rectangle and logical viewport dimensions. Refresh geometry after layout changes, rather than querying layout for every sample.
- Process coalesced pointer samples when available, with a fallback to ordinary move events. Retain each actual segment; never connect across separate gestures or a cancelled stroke.
- Use swept blade segments against fruit hit regions, with roughly 6 CSS pixels of forgiveness initially. Include segments starting or ending inside a fruit. Reject stationary input as a cut, and use a small movement threshold rather than a high speed requirement.
- Track original fruit IDs and award each once. Order hits along the swipe so a hazard encountered first can interrupt later scoring predictably. Fragments, particles, and UI elements never enter target collision queries.
- Include fruit motion between simulation steps in collision calculations so a moving target cannot slip through a slow input stream. Test relative segment motion rather than relying only on its latest position.
- Keep visual trail smoothing separate from collision geometry. A curved display trail must not cut targets that the measured stroke missed.

### Readable movement

Make bottom launched parabolic tosses the default. Solve launch velocity from a desired apex and flight time so waves can be designed around the visible play area. Reserve the upper HUD area and bottom controls when placing apexes and useful collision windows.

Start with targets about 56 to 76 CSS pixels across, scaled within sensible limits for viewport size. In introductory waves, aim for 1.2 to 1.8 seconds of useful visibility and generous spacing. Target sizes and dwell times should remain fair in landscape and on wide desktops; adapt the play area instead of stretching difficulty with screen size.

Build a small reusable pattern library: single toss, paired arc, three fruit fan, staggered ladder, crossing pair, side sweep, and finale fan. Each pattern specifies count, timing, apex region, spacing, and allowable variation. Randomness varies a recognizable pattern rather than determining whether the wave is playable.

Preserve the original orbit idea as a late campaign signature: a short, telegraphed “orbit ring” with a fixed path, clear entry and exit, and a maximum lifetime. Avoid invisible attractive forces in ordinary waves.

### Genuine cut halves

Represent intact fruit, fragment, particle, and hazard as separate entity types. At a successful cut, preserve fruit type, texture seed, rotation, position, and momentum. Transform the cut into the fruit's local coordinates, clip complementary portions of its visual, and send them apart along the cut normal. Add the existing velocity, a small separation impulse, angular motion, gravity, and a 0.6 to 0.9 second fade.

Render a contrasting cut interior for each fruit family, with recognizable seeds or segments. Begin with complementary clipping through the fruit center, then support the actual offset of the blade once that foundation is stable. Two halves should account for the original silhouette, and each original target should disappear immediately when cut.

## Rounds and scoring

### Run structure

Use explicit states: introduction, ready, playing, paused, resolving, results, and chapter selection. A typical campaign challenge lasts 30 to 60 active seconds, with a short opening, a skill focus, a mixed section, and a finale. Stop spawning at the deadline and resolve targets already in flight before finalizing the score. Pause freezes simulation, objectives, effects, and run timers.

Use fruit quota and score goals for early campaign levels. Add combo objectives and avoidance requirements gradually. Early failures should come from missing the goal, with a useful retry prompt. Introduce a three heart limit only in later avoidance and survival challenges. In those challenges, a missed required fruit or a hazard costs one heart; separate misses do not become multiple penalties for a single fruit.

Resolve the last heart loss once, transition out of play, and disable further collision rewards. Tutorial levels have no failure penalties. Clearly mark bonus fruit so missing it never counts as a mistake.

### Proposed score rules

| Event | Initial reward |
| --- | --- |
| Ordinary original fruit | 10 points |
| Clearly marked golden bonus fruit | 25 points |
| Two fruit combo | 10 bonus points |
| Three fruit combo | 25 bonus points |
| Four or more fruit combo | 25 plus 15 for each fruit beyond three |
| Three consecutive clean waves | Increase flow multiplier by 0.5, up to 3 |
| Missed required fruit or hazard | Reset flow multiplier to 1 |

Score a combo as one stroke burst: different eligible fruits hit within 450 milliseconds of the first hit during the same gesture. Close the burst when that window ends or the pointer is released. A long held stroke creates new bursts, which prevents players from chaining an entire round into one combo. Apply the multiplier captured when the burst begins to its base points and combo bonus; update the HUD immediately and add the combo bonus when the burst closes.

A clean wave means all its required fruit was cut and no hazard was hit during its active window. Keep a short visible flow indicator, with labels such as “3 fruit combo” and “Perfect wave.” Show only one prominent feedback message at a time.

Add a harvest meter after the first chapter is proven: clean waves and larger combos fill it. At full charge, the next planned fruit burst triggers a six second Harvest Rush with richer effects and more fruit. Rush must respect the same maximum target density and hazard spacing. Avoid adding a second scoring multiplier in the first release.

## Campaign and leveling

### Proposed full campaign

Build five chapters of five challenges. Passing a challenge opens the next; completing a chapter opens the next environment. Award optional second and third stars for mastery, without requiring perfect scores to continue.

| Chapter | Visual setting | Five challenge blueprints | New skill |
| --- | --- | --- | --- |
| Orchard | Warm dusk, leaves, wooden baskets | First Cut; Paired Harvest; Three in a Row; Full Basket; Orchard Finale | Single cuts, paired combos, wave completion |
| Citrus Grove | Terracotta, teal foliage, orange light | Crossing Paths; Rising Ladder; Golden Opportunity; Grove Mix; Citrus Finale | Timing crossing arcs, staggered targets, bonus fruit |
| Moon Garden | Indigo night, pale lanterns, restrained glow | Mind the Pot; Safe Route; Split Decision; Garden Guard; Moon Finale | Avoiding hazards, routing around them, optional hearts |
| Tropical Canopy | Jade leaves, turquoise shadows, bold interiors | Heavy Harvest; Fan Dance; Sideways Sweep; Canopy Rhythm; Tropical Finale | Larger silhouettes, wide fans, side launches, mixed tempo |
| Star Orchard | Violet sky, geometric constellations, luminous trees | First Orbit; Ring Break; Orbit and Arc; Master Harvest; Star Finale | Brief orbit patterns combined with mastered tosses |

Each chapter follows a teaching sequence: introduce a mechanic safely, rehearse it, combine it with one existing mechanic, offer a harder focused test, then finish with a mixed showcase. Increase demands through pattern complexity and decision making. Keep speed increases modest and bounded.

### First chapter prototype

| Challenge | Initial length | Wave content | Pass goal | Mastery goals |
| --- | --- | --- | --- | --- |
| First Cut | About 20 seconds | Eight slow singles, one at a time | Cut five fruit | Cut seven; cut all eight |
| Paired Harvest | About 30 seconds | Six pairs separated by recovery beats | Cut eight of twelve | Make three pair combos; clear all pairs |
| Three in a Row | About 35 seconds | Four singles and five fans of three | Cut twelve of nineteen | Make two three fruit combos; cut at least seventeen |
| Full Basket | About 40 seconds | Singles, pairs, and fans; 24 required fruit | Cut eighteen | Reach a calibrated combo score; cut at least twenty two |
| Orchard Finale | About 45 seconds | Authored mix ending in a four fruit fan; 30 required fruit | Cut twenty two | Make three combos of at least three; cut at least twenty seven |

Wave timing must fit each scheduled flight and recovery interval. These counts, durations, and thresholds need adjustment together. Validate that every mastery goal is achievable from the authored waves before accepting a level configuration.

For stars, store independent earned mastery badges alongside the pass star, so replaying a level can add a badge without replacing previous achievements. Avoid a score threshold in the first tutorial. Add score goals only after perfect scripted strokes establish a reference maximum and real play establishes a reasonable pass threshold.

### Progress and rewards

- Save unlocked levels, earned stars, personal bests, chosen cosmetic blade, selected environment, and settings locally.
- Award a blade trail or background variation when a chapter is completed. All cosmetics should preserve target contrast and collision behavior.
- Show the next attainable reward and one relevant replay target. Avoid currencies, upgrade trees, or repeated grinding to make basic play comfortable.
- Separate campaign progress from challenge statistics. Changing a balance version should preserve unlocked content while treating incompatible scores as a different rules version.
- Include a local fruit collection showing fruit discovered and total original fruit sliced. Treat it as a small completion reward, not a menu prerequisite.

### Additional modes after the campaign foundation

| Mode | Purpose and rules |
| --- | --- |
| Quick Play | A 60 second score chase using unlocked patterns; immediate retry and personal best |
| Zen | Continuous low pressure waves; optional hazards off; no failure screen or forced speed escalation |
| Daily Harvest | A date seeded authored challenge, local best, and explicit local device scoring |
| Survival | Three hearts, bounded difficulty tiers, short recovery between tiers |

Ship Quick Play and Zen before Daily Harvest and Survival. Daily challenges use a local calendar date and a versioned seed; they do not imply shared rankings, trusted scores, or a server clock. Defer multiplayer, accounts, leaderboards, and cloud saves because the game must remain client side.

## Mechanics and fairness

Begin with ordinary fruit, golden bonus fruit, and one hazard family. Fifteen visuals can share these simple rules. Avoid assigning a different behavior to every fruit.

Use a cracked ceramic pot as the first hazard: a distinct angular silhouette, a clear danger symbol, a contrasting outline, and a brief warning before entering. Hitting it breaks the flow and costs a heart only in levels using hearts. It should never explode into a large screen flash or hide nearby fruit.

Introduce the first pot by itself, then place it near fruit with a clearly usable alternate stroke. Do not place hazards on top of required targets or require a swipe through a hazard to earn a mandatory combo. During introductory avoidance waves, maintain an initial gap of roughly one fruit diameter plus blade forgiveness between hazard and target hit regions.

Later experimentation can include a larger melon silhouette, a brief slow motion bonus, or marked directional cuts. These are separate prototypes gated on a strong core. Do not add shrinking hitboxes, recursive cutting, surprise hazards, or mandatory directional precision to the first chapter.

## Visual design and art

### Art direction

Use crisp illustrated fruit with soft volume, strong silhouettes, a consistent highlight direction, and textured interiors. Replace abrupt cycling pink fills with a layered environment tied to the current chapter. Put saturated fruit against a quieter background, with dark outlines or shadows that work across all environments.

Create a reusable palette and lighting treatment before drawing all 15 fruits. Start with apple, orange, grape, watermelon, kiwi, and pineapple. Make their intact appearances distinct from their cut interiors; the current intact watermelon and orange already resemble cut sections.

Use code drawn shapes or local SVG artwork rasterized into a canvas cache. This fits the existing procedural approach and keeps assets editable. Reserve decorative detail for large silhouettes and static backgrounds. Generate stable texture data once, then reuse it for both intact fruit and halves.

### Asset specification

| Asset group | Deliverables |
| --- | --- |
| Fruit | Six initial fruit families, then nine more; whole skin and cut interior; shared palette and scale rules |
| Fragments | Complementary clipping masks derived from the blade, visible flesh edges, matching texture seeds |
| Hazard | Ceramic pot, danger icon, warning state, broken fragments |
| Environments | One finished orchard initially; background layers and palette for each later chapter |
| Blade | A bright core, tapered trail, subtle edge glow, and a reduced motion variant |
| Effects | Colored juice drops, small pulp pieces, score popups, combo accent, restrained reward burst |
| Interface | Pause, sound, settings, hearts, stars, basket progress, and chapter nodes in one icon style |

Make effects communicate the event: a clean cut separates halves, a combo gets a stronger short accent, a missed fruit gets a small edge cue, and a hazard gets a distinct muted response. Optional screen shake should last about 80 to 120 milliseconds with only a few pixels of displacement. Reduced motion disables shake, pulsing scenery, and large celebratory motion while retaining clear cut feedback.

### Interface layout

Use an HTML and CSS HUD over the canvas so labels and controls remain sharp and keyboard accessible. Place score and flow at the upper left, the objective and timer in the upper center when space permits, and pause and sound at the upper right. On narrow screens, use a compact second row for the objective. Keep safe area insets around all controls.

Results should show the pass outcome, stars earned, score, original fruit cut, best combo, and one reason to replay. Provide large Next and Retry buttons. On failure, give a concrete prompt such as “Cut three more fruit to fill the basket.” Show a chapter map with five visible nodes, the next unlocked challenge, and clear rewards; keep selection to one screen per chapter.

## Sound and feedback

- Start or resume Web Audio after a deliberate input. Handle rejected resume attempts and unsupported audio without interrupting play.
- Cache a small set of synthesized swishes, juicy impacts, combo tones, hazard thuds, and result chords. Reuse one shared effects chain with a dry path rather than rebuilding a convolution effect for every movement.
- Rate limit swish sounds by gesture distance and elapsed time. Limit simultaneous voices and use a master gain to keep large combos from clipping.
- Match combo pitch to the combo tier, with a cap. Use distinct failure and success sounds that remain short.
- Offer independent sound and optional music controls. Begin with effects only; add a local looping music track later if it improves the chapter atmosphere.
- Offer optional brief vibration only when supported and enabled. All feedback also needs a visual equivalent.

## Accessibility and responsive play

Keep instructions short, persistent enough to read, and dismissible through action. Use shapes and labels as well as color for fruit, bonus fruit, and hazards. Offer high contrast, reduced motion, a larger target assist, and a slower practice setting. Record assisted scores separately while allowing campaign progress to remain accessible.

Support mouse dragging and pen without changing rules. Make menus usable with Tab, Enter, and Escape, and use a clearly described pause shortcut. Provide a keyboard slicing option with a movable blade cursor and a hold action, or retain a separately labeled practice mode if it cannot match the primary interaction. Do not describe an unlabeled canvas as fully accessible. Provide a canvas fallback message and an accessible game instruction region; announce round outcomes rather than every score change.

Allow browser zoom for instructions and menus instead of disabling it globally. Apply `touch-action: none` to the active play surface; let settings and menus scroll where needed. Use viewport safe areas and dynamic viewport sizing. On orientation change or viewport resize, pause and rebuild wave geometry before resuming, with no miss penalty from targets displaced by the change.

## Client side implementation

### Rendering and runtime

Keep Canvas 2D as the first renderer. The current game already uses it, and the planned illustrated art and clipping fit it directly. Consider WebGL only after profiling proves the target density or visual treatment needs it. WebGL would require more asset and context lifecycle work without resolving the current game logic failures.

Use a fixed step such as 1/120 second with a bounded accumulator and a small maximum number of catch up steps per frame. Drive it from `requestAnimationFrame` timestamps. Interpolate rendering if necessary. After a large gap, pause rather than running missed waves in a burst. Keep real active run time separate from any deliberate slow motion applied to entities.

Maintain logical CSS pixel width and height separately from the DPR scaled backing buffer. Initially cap rendering DPR at 2, with a quality setting and measured adjustment. Rendering quality may reduce particles, glow, and background detail, but must never change hitboxes, target counts, timing, or scoring.

### Suggested code responsibilities

Keep plain browser scripts with explicit ordering and a single game namespace, or migrate consistently to modules if static HTTP hosting is the chosen development entry point. Plain scripts preserve the existing direct file opening behavior. Avoid introducing a package manager or framework merely to separate responsibilities.

| File or group | Responsibility |
| --- | --- |
| `game.js` | Bootstrap, lifecycle, fixed timestep, system coordination |
| `input.js` | Pointer capture, sample queue, gesture identity, keyboard input |
| `physics.js` | Launch calculations, movement, collision helpers, viewport bounds |
| `entities.js` | Fruit, fragment, hazard, particle data and lifecycle |
| `renderer.js` | Draw order, art caches, clipping, trail and visual effects |
| `waves.js` | Pattern library, seeded variation, scheduled spawn events |
| `levels.js` | Chapter definitions, goals, stars, introduction rules |
| `scoring.js` | Exactly once awards, combo bursts, flow, result statistics |
| `audio.js` | Audio unlock, cached sounds, shared gain and voice limits |
| `storage.js` | Versioned local save validation, migrations, fallback |
| `ui.js` | HUD, pause, results, chapter selection, settings |
| `styles.css` and `index.html` | Responsive DOM interface, accessibility, script loading |
| `tests` | Pure JavaScript fixtures and deterministic simulations |

Prefer small data driven definitions and explicit events such as fruit sliced, required fruit missed, combo closed, wave completed, and run finished. Separate simulation RNG from cosmetic RNG so particle counts or quality settings cannot alter gameplay waves.

### Saves and offline behavior

Use a versioned localStorage record with validation, sane limits, and defaults. Wrap reads and writes in error handling. If storage is blocked, full, or corrupt, keep an in memory session and show a quiet explanation in settings. Write after results and settings changes, rather than per frame.

Provide optional JSON export and import for progress, validating imported data before replacing the save. Put reset progress behind a clear confirmation inside settings. No network is required to generate levels, play, score, or save.

After the core is stable, add an optional service worker and manifest for installation and offline reloads on supported static hosting. Cache only local game resources and version the cache. Keep direct file use functional without registering a worker. Offline first load still requires obtaining the files, and private or cleared storage cannot promise durable progress.

### Performance targets

Aim for smooth 60 FPS on representative mobile hardware, then measure. Keep simulation and collision work bounded, with an initial cap of eight simultaneously active gameplay targets and roughly 200 decorative particles. These are tuning budgets, not measured capabilities of the existing game.

Cache fruit drawing, stable backgrounds, and reusable sounds. Batch score label updates, reuse particle storage where profiling justifies it, and avoid allocations on every pointer sample. Quality fallback should reduce decorative effects before reducing render resolution. End long session checks with stable entity counts, audio voice counts, and memory usage.

## Implementation sequence and acceptance gates

| Stage | Deliverable | Acceptance gate |
| --- | --- | --- |
| 1 Foundation | Coordinate repair, fixed timing, robust input and collision, exactly once scoring, safe audio, pause and restart | Deterministic code fixtures pass; DPR 1 through 3 and 60 through 144 Hz do not alter gameplay; no nonfinite state or fragment drawing exceptions |
| 2 Playable first challenge | Toss physics, a few authored waves, real halves, clean HUD, result flow, saved best | A complete start to results to retry cycle; multi-fruit cuts work; all spawned required targets have a usable visible path |
| 3 First chapter polish | Six fruit visuals, finished orchard, five challenges, local progress, settings, combo and flow feedback | First chapter goals are achievable; saves recover from invalid data; difficulty comes from deliberate patterns; art and input feel have a separate review when allowed |
| 4 Campaign expansion | Chapters two through five, ceramic hazards, bonus fruit, bounded orbit patterns, rewards | Each chapter introduces one clear skill; authored challenge simulations pass across aspect ratios; no required target is blocked by a hazard |
| 5 Replay and delivery | Quick Play, Zen, then daily and survival; optional installation and offline cache | Scores are separated by mode and rules version; all runtime resources are local; long runs and lifecycle interruptions remain bounded |

Treat stages 1 through 3 as the first release. Avoid expanding to 25 challenges until the first five establish the right feel and score balance. The largest uncertainty is art and play tuning, so schedule those reviews at the first chapter gate rather than assuming logic tests establish enjoyment.

## Verification plan

Continue working through code and terminal fixtures under the current constraint. No web interface access is needed to build the plan, implement pure logic, or run deterministic simulations. Physical input feel and rendered layout remain separate release checks if interface testing is later authorized.

### Automated code checks

1. Collision fixtures: stationary segments, containment, grazing hits, diagonal cuts, rapid strokes, multiple fruit, hazard ordering, moving targets, cancellation, and pointer ID changes.
2. Entity fixtures: all 15 fruit types fragment safely; halves preserve visual data; fragments cannot score; every effect expires; viewport culling never depends on a random center.
3. Timing fixtures: the same seed and recorded input timestamps at 30, 60, 90, 120, and 144 render FPS produce equivalent score, spawn events, objectives, and active run durations. Simulation comparison tolerances must be explicit.
4. Viewport fixtures: representative portrait, landscape, and desktop layouts at DPR 1, 2, and 3 produce matching logical hit regions and safe targets. Rotation does not create misses.
5. State fixtures: pause, blur, hidden tab, resume, restart, final heart loss, and deadline resolution award no duplicate points and never spawn catch up waves.
6. Scoring fixtures: burst grouping is independent of event count; bonuses close once; best scores and stars merge correctly; local import cannot create invalid configuration references.
7. Content simulations: validate level data, maximum concurrency, target dwell time, achievable quotas and combos, and hazard clearance. Use scripted ideal strokes to check attainability, plus deliberately imperfect strokes to tune early goals.
8. Save and audio fixtures: unavailable localStorage, malformed JSON, old versions, rejected audio unlock, missing Web Audio, and voice limits keep gameplay operational.

### Later visual and device checks

Check iPhone and Android portrait and landscape behavior, mouse and pen strokes, release outside the play surface, notches and browser bars, sound interruption, returning from another app, reduced motion, and keyboard menus. Compare whole fruit and both halves in every environment. Measure frame times and touch responsiveness during the busiest planned wave.

A code-only implementation can pass the logic gates without claiming those device checks passed. Before calling the complete redesign finished, review a real first chapter for readable targets, satisfying cuts, balanced goals, and comfortable retries.

## First concrete implementation target

Start with one 30 second orchard challenge: apple, orange, and watermelon; singles, pairs, and a three fruit fan; accurate swipes; true halves; score and combo feedback; pause, retry, and a local best. This exercises the architecture and the essential feel with a small asset set. Expand that proven loop into the five challenge chapter, then the campaign.
