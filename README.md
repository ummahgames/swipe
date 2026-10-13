# Swipe Harvest

A fully client side fruit slicing game, built with plain HTML, CSS, and JavaScript. Travel through five illustrated gardens, find a rhythm in authored waves, and turn clean strokes into combos and golden Harvest Rushes.

## Play

Open `index.html` directly, or serve this directory with any static web server. For example:

```sh
python3 -m http.server 8080
```

The game needs a modern browser with Canvas 2D and Pointer Events. Audio is optional and unlocks after interaction. There is no build step, package installation, backend, remote font, external image, service worker, or installation manifest.

A fresh save starts with a safe apple introduction. Swipe through it to begin the first timed challenge. The home screen, chapter map, modes, journal, and settings are available through the pause menu and after rounds.

## Controls

| Input | Action |
| --- | --- |
| Finger or pen | Swipe across fruit |
| Mouse | Hold the primary button and drag |
| Arrow keys | Move the keyboard blade |
| Space | Hold to slice with the keyboard blade |
| Shift | Hold for faster keyboard movement |
| Escape | Pause or resume; close settings |
| Tab and Enter | Navigate menus and activate controls |

Lifting the blade ends a gesture. Pointer cancellation, lost capture, pausing, switching tabs, and resizing clear the blade safely. Viewport changes pause and rebase active targets without adding misses.

## The journey

Twenty five challenges are divided across The Orchard, Citrus Grove, Moon Garden, Tropical Canopy, and Star Orchard. Each garden introduces a skill, develops it, and finishes with a mixed harvest.

- The Orchard teaches singles, pairs, fans, and clean waves.
- Citrus Grove adds crossing arcs, staggered ladders, and golden fruit.
- Moon Garden introduces marked ceramic pots and careful routes.
- Tropical Canopy adds side sweeps and larger mixed fans.
- Star Orchard combines tosses with short constellation orbits.

Fill the required fruit basket to pass. One pass opens the next challenge; complete a chapter to unlock its blade trail. Misses break flow but do not cost hearts in the campaign. In later chapters, hitting a pot costs one of three hearts.

Each challenge offers three stars. The first is for passing. Later challenges award a combo star for the stroke size shown on the map and a precision star for cutting at least 93% of required fruit without a pot hit. First Cut instead awards its extra stars for seven and eight required cuts. Replays merge earned stars and preserve previous bests.

## More ways to play

| Mode | Rules |
| --- | --- |
| Quick Play | Sixty seconds of scoring in an unlocked garden |
| Zen Garden | Endless gentle waves, no hearts, no deadline, optional pots |
| Daily Harvest | Sixty seconds in Star Orchard with a versioned seed based on the device's local calendar date |
| Survival | Three hearts, misses and pot hits cost a heart, increasingly complex waves through all five gardens |

Choose a favorite unlocked environment for Quick Play and Zen in Settings. Replay modes can finish early from the pause menu and bank the score. Zen also has a Finish Session control during play. Campaign rounds must complete normally to earn progress.

Daily layouts repeat on retries. All best scores are local to this browser; the game does not maintain shared rankings or trust a remote clock.

## Scoring and creative mechanics

Ordinary fruit is worth 10 points; marked golden fruit is worth 25 and can be missed without a penalty. Original fruit scores once, and cut halves are decorative.

Two fruit in a burst earn a 10 point combo bonus. Three earn 25, with another 15 for each additional fruit. A burst groups hits during the same gesture within 450 milliseconds of its first hit; holding a blade through an entire round cannot turn it into one unlimited combo.

Three consecutive clean waves raise the flow multiplier by 0.5, up to 3. A clean wave means all required fruit was cut and no pot was hit. A miss or pot hit resets flow. Each burst captures its starting multiplier for consistent base and bonus scoring.

From Three in a Row onward, clean waves and combos charge Harvest Rush. A full meter triggers six seconds of golden bonus fruit on the next planned wave. The extra fruit is optional and does not change the basket quota. Constellation rings and pot entries show brief visual warnings before appearing.

## Art and sound

All fifteen fruits, their interiors, the ceramic pots, five backgrounds, decorative foliage, orbit guides, blade trails, and effects are drawn locally with Canvas. Whole and cut fruit sprites are cached. Halves retain the original fruit and split along the measured blade's direction and offset; there is no recursive cutting of fragments.

Sound effects and the optional garden melody are synthesized locally. Audio buffers are cached, simultaneous voices are capped, and unavailable or denied Web Audio leaves the game playable.

## Comfort and progress

Settings include reduced motion, high contrast, larger targets, slower practice, independent effects and melody controls, volume, three effects quality levels, blade cosmetics, garden selection, and optional pots in Zen.

Larger targets and slower practice apply to the next run. Their scores are stored separately, while campaign progress remains available. Reduced motion follows the system preference on a fresh save and can be changed. Automatic quality reduces decorative detail and render resolution when frame times slow; it never changes gameplay waves or hit regions.

Progress, stars, discoveries, lifetime fruit totals, personal bests, and settings use a versioned localStorage save. Finishing a run records it exactly once. Import and export JSON saves from Settings to back up progress or move it to another browser. Imports validate content and reconstruct unlocks. Reset requires an explicit confirmation in the game.

If storage is blocked, corrupt, or full, the game uses an in memory session and explains how to export a save. Browser data clearing can remove local progress. Direct file storage behavior varies by browser; static HTTP hosting gives the game a consistent origin.

## Code layout

| File | Responsibility |
| --- | --- |
| `core.js` | Content, seeded randomness, fixed step simulation, trajectories, moving target collision, scoring, run lifecycle, save validation |
| `art.js` | Procedural sprites, backgrounds, complementary fragment clipping, trails, warnings, adaptive rendering |
| `audio.js` | Audio unlock, cached synthesis, voice limits, optional melody |
| `game.js` | Application flow, HTML menus, pointer and keyboard input, HUD, settings, save actions |
| `index.html` and `styles.css` | Accessible controls, responsive layout, local script loading |
| `tests/core.test.js` | Gameplay, content, timing, persistence, and long session simulations |
| `tests/app.test.js` | Application integration through DOM, Canvas, and Web Audio stubs |

The core also exports through CommonJS for terminal tests. Browser scripts load in order and do not require JavaScript modules or a development server. Gameplay and decorative random streams are separate. The simulation uses a 1/120 second step and pauses after large frame gaps rather than catching up in a burst. Endless modes discard resolved wave history; effect pools, signals, and sound voices are bounded.

## Code verification

Run the complete suite with Node.js 18 or later:

```sh
node --test tests/*.test.js
```

The suite uses code only. It checks collision containment and grazing, multi-target cuts, moving targets, pot ordering, exactly once rewards and saves, burst timing, dense and sparse input sampling, frame rates from 30 through 144 FPS, DPR separation, resize and pause behavior, all campaign goals and mastery stars, assisted play, useful target visibility, daily seeds, quality independence, storage failures, audio denial, menu integration, and long endless sessions.

Canvas and DOM tests exercise API calls and application flow with stubs. They do not establish visual layout, physical touch feel, or actual device performance.

## Browser review handoff

Browser testing is left to the project owner. Suggested review points:

1. Try the first apple introduction, then complete and replay the first harvest.
2. Check cuts and combos with touch, mouse, and keyboard; cancel or release outside the play surface.
3. Review whole fruit, cut interiors, and halves in each environment, including the constellation rings.
4. Try narrow portrait and landscape layouts, safe areas, pause/resume, and orientation changes.
5. Review effects, melody, reduced motion, contrast, quality controls, and practice settings.
6. Complete a chapter, choose its blade, reload saved progress, and round trip an exported save.
7. Play the four replay modes, including ending a Zen or Survival session from pause.

No browser review or pixel inspection was performed during implementation.
