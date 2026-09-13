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

The walking camera stays at **1.70 m**. A 0.20 m body radius collides with room boundaries, rotated furniture footprints, and enabled architectural features. Movement uses small swept steps to prevent tunneling through the divider. Furniture collision envelopes are deliberately conservative: the full desk footprint blocks walking, including the open leg area. The existing door is modeled closed. Edit-mode cutaway visibility does not remove collision boundaries in Walk mode.

## Measurements and uncertainty

- Interior footprint: **3.80 m along X × 2.60 m along Z**, following the supplied approximate measurements. Floor area: 9.88 m².
- One Babylon world unit equals one meter. Y is up. The origin is at the center of the finished floor. North is +Z, east is +X.
- The door is on the **east short wall**, with the window on the adjacent **north long wall**: the window is on the right when entering.
- Ceiling height **2.65 m** is a provisional starting value. Opening widths, heights, sills, and offsets are also provisional.
- The approximately **20 cm corner protrusion** and **40 cm beam/soffit** are configured but **disabled**. There is no perimeter beam. A beam record applies only to its explicitly selected wall and length. The corner record represents an inward solid protrusion; if the survey identifies an outward recess instead, its geometry should be specified before enabling it.
- No photographs were accessible in this workspace. Appearance uses the described light textured plaster, beige marbled tile, wood door, and a placeholder window. The architecture is not claimed to be a verified photographic reconstruction.

Change room measurements, opening positions, or individual features in **Room measurements**, or edit `src/config/office.ts`. Openings cut actual holes in the wall geometry. Floor tile divisions use a 0.60 m module. Geometry uses the configured interior dimensions; wall thickness extends outward from them.

## Furniture and configuration

`src/config/office.ts` is the centralized starting configuration. Every furniture item specifies its identifier, kind, width/height/depth, bottom-center position, Y rotation in **degrees**, finish color, visibility, and optional parent.

The initial layout has a work desk, ergonomic chair, desktop PC, two monitors, storage cabinet, and a three-panel privacy screen. Monitors and PC are separate configurable objects parented to the desk. Their positions are relative to the desk's bottom center; moving or rotating the desk also moves them. Changing desk height keeps the monitors on its top.

The privacy screen starts behind the chair/desk. Select it to enter exact dimensions, move/rotate it, change its finish, or use **Place behind desk**. Placement is rejected if it extends outside the room. Furniture-to-furniture overlaps are allowed during editing to accommodate desk accessories and experimentation; inspect clearances in Walk mode.

UI edits are automatically saved to this browser's local storage, and survive refreshes. **Export layout** downloads all room and furniture configuration as JSON. The upload icon imports a validated layout. Undo/redo keeps up to 60 edits for the current session. Nothing is sent to a server.

**Saved local layouts take precedence over `office.ts`.** To use updated source defaults, remove the `roomwork.office.v1` browser-storage entry or import the desired exported JSON. Reset this object restores its source defaults. The UI does not rewrite source files.

## Structure

```text
src/
  config/         starting measurements, types, validation, storage, history
  room/           room shell, openings, floor grid and dimension annotations
  architecture/   window, door, individually configured beam/corner features
  furniture/      metric placeholder meshes and parent relationships
  materials/      plaster grain, marble tile, wood, metal and furniture finishes
  lighting/       ambient daylight, directional light, soft shadow maps
  navigation/     orbit/first-person cameras, pointer lock, swept collisions
  ui/             panels, icons, property fields and room settings
  planner.ts      scene lifecycle and synchronized editing state
  main.ts         startup and WebGL failure feedback
tests/            geometry, layout and collision checks using Babylon NullEngine
```

The layout adapts to narrow screens, but desktop mouse and keyboard are required for the full pointer-lock walking experience. Shadows use a 2048 px shadow map; display resolution is capped at 1.75× device scaling to keep this small scene practical on integrated graphics.
