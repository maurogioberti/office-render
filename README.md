# Roomwork — local 3D office planner

A real-time Babylon.js application built with Vite and TypeScript. Geometry, lights, shadows, cameras, picking, and transform gizmos run live in the browser. No rendered-image backdrop, remote model service, or backend is used. Fonts and textures are local.

## Run

Requires a current Node.js LTS release (Node 22+ recommended) and a desktop browser with WebGL/hardware acceleration.

```sh
npm install
npm run dev
```

Open **http://127.0.0.1:5173/**. `npm run build` type-checks and builds the production application; `npm run preview` serves that build. `npm test` checks metric geometry, actual wall openings, collision behavior, parent transforms, import validation, and undo/redo.

## Controls

| Task | Control |
| --- | --- |
| Edit / Walk | Header mode buttons |
| Orbit / pan / zoom | Left drag / right drag / mouse wheel |
| Select | Click furniture or its scene-list row |
| Move / rotate | Gizmos; `G` / `R` switches the tool |
| Precise changes | Object properties: dimensions, position, rotation |
| Nudge furniture | Arrow keys: 5 cm; Shift + arrow: 1 cm |
| Focus selection | `F` |
| Undo / redo | Ctrl/Cmd Z / Ctrl/Cmd Shift Z; toolbar buttons |
| Perspective / top | View button above the scene |
| Floor grid / dimensions / cutaway | Buttons at the lower right of the viewport |
| Walk | Click **Start walking** or the canvas to capture the mouse; WASD moves, mouse looks |
| Release the mouse | Escape |
| Walking speed | Walk-mode inspector: 0.4–2.4 m/s |

The walking camera stays at **1.70 m**. A 0.20 m body radius collides with room boundaries, rotated furniture footprints, and enabled architectural features. Movement uses small swept steps to prevent tunneling through thin obstacles. The L-shaped desk uses two collision rectangles matching its worktops, leaving its inner chair bay open. The existing door is modeled closed. Edit-mode cutaway visibility does not remove collision boundaries in Walk mode.

## Measurements and uncertainty

- Interior footprint: **3.80 m along X × 2.60 m along Z**, following the supplied approximate measurements. Floor area: 9.88 m².
- One Babylon world unit equals one meter. Y is up. The origin is at the center of the finished floor. North is +Z, east is +X.
- The door remains on the **east short wall**. The corrected window is on the **south long wall**, opposite its original north-wall placement, with an initial **+0.80 m X offset** toward the door side. Wall assignment and offset are editable in Room measurements.
- Ceiling height **2.65 m** is a provisional starting value. Opening widths, heights, sills, and offsets are also provisional.
- The approximately **20 cm corner protrusion** and **40 cm beam/soffit** are configured but **disabled**. There is no perimeter beam. A beam record applies only to its explicitly selected wall and length. The corner record represents an inward solid protrusion; if the survey identifies an outward recess instead, its geometry should be specified before enabling it.
- No photographs were accessible in this workspace. Appearance uses the described light textured plaster, beige marbled tile, wood door, and a placeholder window. The architecture is not claimed to be a verified photographic reconstruction.

Change room measurements, opening positions, or individual features in **Room measurements**, or edit `src/config/office.ts`. Openings cut actual holes in the wall geometry. Floor tile divisions use a 0.60 m module. Geometry uses the configured interior dimensions; wall thickness extends outward from them.

## Furniture and configuration

`src/config/office.ts` is the centralized starting configuration. Every furniture item specifies its identifier, kind, width/height/depth, bottom-center position, Y rotation in **degrees**, finish color, visibility, and optional parent.

The current layout has seven furniture objects: an L-shaped corner desk, ergonomic chair, desktop PC, and four monitors. The privacy screen and movable drawer unit have been removed. “Left corner” is interpreted as the **southwest corner in plan view**. The desk runs **1.80 m along the west wall** and returns **1.50 m along the south window wall**, with **0.72 m worktop depth** and **0.76 m height**. Select the desk to change either run and its worktop depth. `dimensions.width/depth` define the outer L envelope; `cornerDesk.worktopDepth` defines both worktop strips. The L occupies the local -X and -Z sides.

The workstation uses **three landscape Samsung 27-inch monitors side by side**, slightly angled along the west run, and **one portrait monitor on the return**, on individual placeholder arms. Active display size is derived from a **27-inch, 16:9 diagonal** (about 0.598 × 0.336 m, swapped for portrait). No exact Samsung model was specified: bezels, casing, arm design, and mount height remain provisional. The outer `dimensions` contain the screen and arm; `monitor` config holds brand, diagonal, orientation, bezel, and arm/stand choice. Envelope edits are rejected if too small to contain the screen.

Monitors and PC are separate configurable objects parented to the desk. Their positions are relative to the desk's bottom center; moving or rotating the desk also moves them. Changing desk height keeps all four monitors on its top.

Placement is rejected if it extends outside the room. Furniture-to-furniture overlaps are allowed during editing to accommodate desk accessories and experimentation; inspect clearances in Walk mode. The generic storage and divider model types remain available for explicitly imported configurations or future iterations.

## Baseboard LEDs and neutral walls

In **Room measurements → Baseboard LEDs**, change color, light intensity, glow, or enabled state. Defaults are subtle red (`#ff3030`, intensity `0.18`, glow `0.30`). Emissive strips follow actual skirting spans and stop at the doorway; a restricted bloom effect and low-range point lights provide soft color spill. Hidden cutaway walls also hide their LEDs and spill; Walk mode restores them. Settings are in `room.baseboardLED` and participate in save/export and undo/redo.

Walls remain neutral. `room.wallFinishes` provides independent north/south/east/west color, plaster/plain texture, and sheen. The per-wall material factory in `src/materials/index.ts` is the extension point for future finishes; future panels/decorations belong in `src/architecture/`. No decorative wall styling is finalized.

UI edits are automatically saved to this browser's local storage, and survive refreshes. **Export layout** downloads all room and furniture configuration as JSON. The upload icon imports a validated layout. Undo/redo keeps up to 60 edits for the current session. Nothing is sent to a server.

**Saved local layouts take precedence over `office.ts`.** The current scene revision saves under `roomwork.office.v3` and still uses JSON schema version 2. Existing v2 browser layouts migrate by removing the privacy screen and drawer (and attached contents), retaining all other edits. Older v1 saves receive the corrected corner workstation without those two objects. Prior storage entries remain intact as backups. Later edits persist normally. Explicitly importing an old JSON preserves that file's arrangement, so previous layouts can still be restored. Reset this object restores its source defaults. The UI does not rewrite source files.

## Structure

```text
src/
  config/         starting measurements, types, validation, storage, history
  room/           room shell, openings, floor grid and dimension annotations
  architecture/   window, door, individually configured beam/corner features
  furniture/      metric placeholder meshes and parent relationships
  materials/      plaster grain, marble tile, wood, metal and furniture finishes
  lighting/       window-directed daylight, shadows, configurable baseboard LEDs
  navigation/     orbit/first-person cameras, pointer lock, swept collisions
  ui/             panels, icons, property fields and room settings
  planner.ts      scene lifecycle and synchronized editing state
  main.ts         startup and WebGL failure feedback
tests/            geometry, layout and collision checks using Babylon NullEngine
```

The layout adapts to narrow screens, but desktop mouse and keyboard are required for the full pointer-lock walking experience. Shadows use a 2048 px shadow map; display resolution is capped at 1.75× device scaling to keep this small scene practical on integrated graphics.
