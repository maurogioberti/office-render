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
| Move the second setup together | Select **Work zone · dual monitor arm**, then use the move/rotate gizmo |
| Add / remove the second setup | **Add/Remove second work setup** below the scene list |
| Test chair position | Work setup inspector: **Chair at work setup** / **Chair at personal setup** |
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
- The door remains on the **east short wall**. The window is on the **south long wall**, with a **+0.70 m X offset** toward the door side. Its default opening is **0.95 m wide × 1.35 m high**, including the upper shutter housing, with a **1.12 m sill**. A dark bronze frame surrounds the sliding sections and visible roller-shutter slats. Wall assignment, opening measurements, frame dimensions/color, housing height, and shutter appearance are editable in Room measurements.
- Ceiling height **2.65 m** is provisional. The window top starts at 2.47 m, just below the 2.49 m underside of the south soffit. Check this relationship when changing the ceiling, sill, opening height, or soffit drop.
- The reference photos support soffits on the **south window wall** and **west short wall opposite the door**. Only those two wall records are enabled. Starting **projection into the room is 0.40 m** and **vertical drop is 0.16 m**, configured separately. Neither the north wall nor the east door wall receives a soffit.
- A provisional **southwest vertical corner step** occupies **0.24 m along X × 0.20 m along Z**, rising **2.49 m** to the soffit underside. Its exact profile and measurements still need confirmation; every dimension and its corner assignment remain configurable.
- The real room photos are the architectural reference. The former planner screenshot showed a wide pale window without shutter details, missing soffits/corner geometry, and desk-mounted monitors; it was used to identify those mismatches. Photo perspective is insufficient to establish exact dimensions. Opening, ceiling, soffit, and step values remain provisional until measured.

Change room measurements, opening positions, or individual features in **Room measurements**, or edit `src/config/office.ts`. Openings cut actual holes in the wall geometry. Floor tile divisions use a 0.60 m module. Geometry uses the configured interior dimensions; wall thickness extends outward from them.

## Furniture and configuration

`src/config/office.ts` is the centralized starting configuration. Every furniture item specifies its identifier, kind, width/height/depth, bottom-center position, Y rotation in **degrees**, finish color, visibility, and optional parent.

The default layout has **11 furniture objects**: an L-shaped desk, one ergonomic chair, desktop PC, four personal monitors, and a removable work setup consisting of one shared arm, two work monitors, and a laptop. The privacy screen and movable drawer unit remain removed. The desk occupies the **southwest corner in plan view**, with a **2.40 m main run along the south window wall**, a **1.90 m return along the west wall**, **0.72 m worktop depth**, and **0.76 m height**. Its bottom-center position, **(-0.57, 0, -0.12) m**, preserves clearance around the corner step. Select the desk to change either run and its worktop depth. `dimensions.width/depth` define the outer L envelope; `cornerDesk.worktopDepth` defines both worktop strips. The L occupies the local -X and -Z sides.

The personal setup uses **three landscape Samsung 27-inch monitors wrapping around the corner**, with inward-angled side screens, plus **one portrait Samsung 27-inch monitor close to the west end of the array**. These four screens and their articulated **wall-mounted arms** retain their previous positions. Active display size follows a **27-inch, 16:9 diagonal** (about 0.598 × 0.336 m, swapped for portrait). No exact Samsung model was specified; casing, bezel, and arm details remain placeholders.

Each personal monitor is an independent room object: moving, rotating, or changing the height of the desk does not move its screen or wall attachment. The PC remains a desk child. Monitor `position.y` is the bottom of its screen enclosure; `dimensions` describe that enclosure, excluding the arm. `monitor.wallMount` stores the anchor wall, offset from that wall's center, height above the floor, and maximum arm reach. Moving a screen updates the arm while its wall attachment stays fixed. The inspector exposes anchor offset, height, and reach; wall assignment is also editable in the central config or exported JSON. Screen position and yaw remain individually configurable. Screen enclosure edits must still contain the specified display panel.

The provisional **second work setup** tests two 27-inch landscape screens on **one shared desktop clamp and dual-monitor arm**, with an open laptop below. The `work-zone` object is attached to the desk with `onDesktop: true`; both `work-monitor-*` screens and `work-laptop` are its children. Select the group to move, rotate, or hide all of them together, or select an individual screen/laptop for local adjustments. The work group follows desk movement, rotation, and height changes. Its `workZone` configuration separates the surface offset, column height, and arm reach; the inspector exposes column height and reach. The laptop's `openingAngle` is editable from 85° to 120°. All dimensions and positions remain configurable.

**Add/Remove second work setup** removes or restores this entire group without changing the personal monitors. Group removal and other edits support undo/redo, save, and export. Scene-list groups distinguish shared furniture, the personal array, and the work setup; indented work rows belong to the group. Hiding a parent also hides its children. Both work areas use the same chair: move it manually or use the work setup inspector's two chair-position buttons to test each station. The second setup is an experiment for checking desk space and circulation.

Placement is rejected if it extends outside the room or intersects solid architectural features. Wall-mounted screens must remain within arm reach, with anchors on solid wall. The work-zone clamp must grip a desktop edge, its laptop must rest fully on the worktop, and the work screens/laptop must clear other visible furniture. Other furniture-to-furniture overlaps remain available for desk accessories and experimentation; inspect clearances in Walk mode. The generic storage and divider model types remain available for explicitly imported configurations or future iterations.

## Baseboard LEDs and neutral walls

In **Room measurements → Baseboard LEDs**, change color, light intensity, glow, or enabled state. Defaults are subtle red (`#ff3030`, intensity `0.18`, glow `0.30`). Emissive strips follow actual skirting spans and stop at the doorway; a restricted bloom effect and low-range point lights provide soft color spill. Hidden cutaway walls also hide their LEDs and spill; Walk mode restores them. Settings are in `room.baseboardLED` and participate in save/export and undo/redo.

Walls remain neutral. `room.wallFinishes` provides independent north/south/east/west color, plaster/plain texture, and sheen. The per-wall material factory in `src/materials/index.ts` is the extension point for future finishes; future panels/decorations belong in `src/architecture/`. No decorative wall styling is finalized.

UI edits are automatically saved to this browser's local storage, and survive refreshes. **Export layout** downloads all room and furniture configuration as JSON. The upload icon imports a validated layout. Undo/redo keeps up to 60 edits for the current session. Nothing is sent to a server.

**Saved local layouts take precedence over `office.ts`.** The current scene revision saves under `roomwork.office.v5` and still uses JSON schema version 2. Existing v4 browser layouts receive the larger desk and removable work setup while preserving their room architecture and personal monitor configuration. The prior v4 entry remains intact as a backup. If the larger setup conflicts with a customized saved arrangement, the original layout is kept and a notice explains the fit issue. Older v3, v2, and v1 browser layouts also pass through the photo-based architecture migration. The privacy screen and drawer remain removed. Later edits persist normally. Explicitly importing an old JSON preserves that file's arrangement, subject to validation, so previous layouts can still be restored. Reset this object restores its source defaults; the work-zone clamp resets to the edge of the current desk. The UI does not rewrite source files.

## Structure

```text
src/
  config/         starting measurements, types, validation, storage, history
  room/           room shell, openings, floor grid and dimension annotations
  architecture/   bronze window/shutter, door, individual soffits and corner steps
  furniture/      metric meshes, wall/shared arms, laptops and grouped attachments
  materials/      plaster grain, marble tile, wood, metal and furniture finishes
  lighting/       window-directed daylight, shadows, configurable baseboard LEDs
  navigation/     orbit/first-person cameras, pointer lock, swept collisions
  ui/             panels, icons, property fields and room settings
  planner.ts      scene lifecycle and synchronized editing state
  main.ts         startup and WebGL failure feedback
tests/            geometry, layout and collision checks using Babylon NullEngine
```

The layout adapts to narrow screens, but desktop mouse and keyboard are required for the full pointer-lock walking experience. Shadows use a 2048 px shadow map; display resolution is capped at 1.75× device scaling to keep this small scene practical on integrated graphics.
