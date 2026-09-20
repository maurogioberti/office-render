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

The main view includes the **compact L sofa and articulated 50-inch TV**. Use **Lounge / Sofa + TV** in the left panel for **Store TV near wall**, **TV toward sofa**, and **Move TV for window access**. The arm animates between checked positions; window overlap is intentional. Sofa controls remain separate. [Placement details and views](docs/main-lounge/README.md).

The separate **[sofa-bed feasibility study](http://127.0.0.1:5173/sofa-study.html)** provides daily, seating and sleeping states, real product dimensions, two smaller alternatives, door-swing trials and dimensioned plans. It keeps the validated office fixed and does not overwrite saved layouts. See [findings and exported views](docs/lounge-study/README.md). Regenerate artifacts with `npm run study`.

| Task | Control |
| --- | --- |
| Edit / Walk | Header mode buttons |
| Orbit / pan / zoom | Left drag / right drag / mouse wheel |
| Select | Click furniture or its scene-list row |
| Move / rotate | Gizmos; `G` / `R` switches the tool |
| Precise changes | Object properties: dimensions, position, rotation |
| Move the work monitor pair | Select its shared-arm group, then use the move/rotate gizmo |
| Show / hide the work pair | **Show/Hide work monitor pair** below the scene list |
| Add / remove the work pair | **Add/Remove work monitor pair** below the scene list; the laptop remains |
| Test chair position | Monitor-pair inspector: **Chair at work setup** / **Chair at personal setup** |
| Nudge furniture | Arrow keys: 5 cm; Shift + arrow: 1 cm |
| Focus selection | `F` |
| Undo / redo | Ctrl/Cmd Z / Ctrl/Cmd Shift Z; toolbar buttons |
| Perspective / top | View button above the scene |
| Floor grid / dimensions / cutaway | Buttons at the lower right of the viewport |
| Walk | Click **Start walking** or the canvas to capture the mouse; WASD moves, mouse looks |
| Release the mouse | Escape |
| Walking speed | Walk-mode inspector: 0.4–2.4 m/s |

The walking camera stays at **1.70 m**. A 0.20 m body radius collides with room boundaries, rotated furniture footprints, and enabled architectural features. Movement uses small swept steps to prevent tunneling through thin obstacles. The squared C desk uses collision rectangles matching its straight main run, short returns, and corner relief; its chair bay remains open. The existing door is modeled closed. Edit-mode cutaway visibility does not remove collision boundaries in Walk mode.

## Measurements and uncertainty

- Interior footprint: **3.80 m along X × 2.60 m along Z**, following the supplied approximate measurements. Floor area: 9.88 m².
- One Babylon world unit equals one meter. Y is up. The origin is at the center of the finished floor. North is +Z, east is +X.
- The door remains on the **east short wall**. The window is on the **south long wall**, with a **+0.70 m X offset** toward the door side. Its default opening is **0.95 m wide × 1.35 m high**, including the upper shutter housing, with a **1.12 m sill**. A dark bronze frame surrounds the sliding sections and visible roller-shutter slats. Wall assignment, opening measurements, frame dimensions/color, housing height, and shutter appearance are editable in Room measurements.
- Ceiling height **2.65 m** is provisional. The window top starts at 2.47 m, just below the 2.49 m underside of the south soffit. Check this relationship when changing the ceiling, sill, opening height, or soffit drop.
- The reference photos support soffits on the **south window wall** and **west short wall opposite the door**. Only those two wall records are enabled. Starting **projection into the room is 0.40 m** and **vertical drop is 0.16 m**, configured separately. Neither the north wall nor the east door wall receives a soffit.
- A provisional **southwest vertical corner step** occupies **0.24 m along X × 0.20 m along Z**, rising **2.49 m** to the soffit underside. Its exact profile and measurements still need confirmation; every dimension and its corner assignment remain configurable.
- The real room photos are the architectural reference. The former planner screenshot showed a wide pale window without shutter details, missing soffits/corner geometry, and desk-mounted monitors; it was used to identify those mismatches. Photo perspective is insufficient to establish exact dimensions. Opening, ceiling, soffit, and step values remain provisional until measured.

Change room measurements, opening positions, or individual features in **Room measurements**, or edit `src/config/office.ts`. Openings cut actual holes in the wall geometry. Floor tile divisions use a 0.60 m module. Geometry uses the configured interior dimensions; wall thickness extends outward from them.

The optional **window-style air conditioner** is a classic box unit passing through its own wall opening. Its provisional placement is on the **south window wall**, on the desk side of the window, with a **−0.30 m wall-center offset** and its bottom **1.85 m above the floor**. Starting dimensions are **0.66 m wide × 0.43 m high × 0.60 m total depth**: **0.18 m indoors**, **0.12 m through the wall**, and **0.30 m outdoors**. The casing clears the window by **0.195 m** and the soffit underside by **0.21 m**. The neutral case starts at `#d8d5c8`, with the outlet vanes turned **15° toward the room center**. In **Room measurements → Window-style air conditioner**, edit visibility, wall assignment, offset, bottom height, size, indoor projection, case color, and grille direction (−30° to +30°). These values live in optional `room.airConditioner`; `trimWidth` is configurable in JSON/source. This is an approximate model for visual placement, with adjustable louvers; it does not simulate airflow or room temperature. Imported layouts without this optional record remain without an air conditioner.

## Furniture and configuration

`src/config/office.ts` is the centralized starting configuration. Every furniture item specifies its identifier, kind, width/height/depth, bottom-center position, Y rotation in **degrees**, finish color, visibility, and optional parent.

The default layout has **11 visible furniture objects**: one floating wraparound desk, chair, PC, four personal wall-mounted monitors, and a work zone with two monitors on a shared desktop arm plus an independent laptop. The privacy screen and drawer remain removed. Architecture, AC, and the comparison camera are unchanged.

The desk follows the west wall from the southwest corner with a **2.50 m main span**, **0.72 m main surface depth**, **1.30 m overall depth**, and **0.76 m height**. Each end has a short straight return **0.62 m wide**, projecting **0.58 m beyond the main front edge**. The single, plain wood top is a rectilinear C, open toward the chair and room center; every edge is straight, with no horseshoe curves or decorative seams. Discreet wall ledgers and cantilever brackets support the top; there are **no desk legs**. The rear corner remains **(-1.86, 0, -1.26) m** and its **0.23 by 0.19 m relief** clears the existing step. The return tips stop at X = -0.56 m, leaving the east side and doorway open for circulation.

Select the desk to edit **Main span**, **Overall depth**, **Main surface depth**, **Return width**, height, and the corner relief. `cornerDesk.shape: 'rect-c'` selects the squared C profile and `floating: true` selects wall supports. Width/depth define its outer envelope; `worktopDepth` controls main surface depth and `returnWidth` controls the width of each end surface along the west wall. The mesh, selection outline, and collision rectangles agree on the same profile. Resizing preserves the rear corner and attached objects' world positions when they still fit. Legacy imported L-shaped desks retain their original profile.

**Zone A** starts at the outer tip of the short AC-side return: one portrait followed by three landscape screens curving onto the west main span. The portrait is 7.5 cm inward from that return tip. Its first two wall plates are on the south wall, the other two on the west wall, with actual reach between 6.0 and 25.5 cm against the unchanged 65 cm limit. **Zone B**, its shared arm and the laptop remain exactly at their audited positions on the north/right return. All six center heights remain 1.295 m. Verified housings stay **0.612 x 0.360 x 0.052 m** (portrait **0.360 x 0.612 x 0.052 m**). The personal screens retain 22-24 mm nearest-case gaps; the work pair has a 25 mm gap. The independent laptop opens to 120 degrees in the inside corner, clear of both arm systems. The unchanged PC tower remains beneath the left/south return, outside the AC's vertical footprint.

See the [position correction and front/top views](docs/workstation-position/README.md). `npm run views` regenerates the geometry previews from the actual scene.

Run **`npm run audit`** for the reproducible dimensional checks and measurements. See [the workstation audit](docs/workstation-dimensional-audit.md) for all clearances, reference dimensions and limitations. This correction changes no desk geometry or room measurements.

Each personal monitor is an independent room object: moving, rotating, or changing the height of the desk does not move its screen or wall attachment. The PC remains a desk child. Monitor `position.y` is the bottom of its screen enclosure; `dimensions` describe that enclosure, excluding the arm. `monitor.wallMount` stores the anchor wall, offset from that wall's center, height above the floor, and maximum arm reach. Moving a screen updates the arm while its wall attachment stays fixed. The inspector exposes anchor offset, height, and reach; wall assignment is also editable in the central config or exported JSON. Screen position and yaw remain individually configurable. Screen enclosure edits must still contain the specified display panel.

**Turn work setup off/on** controls the laptop and its two external displays together. Powered-off screens remain visible as dark, non-emissive panels; the personal four stay on. Power changes support save, export/import, and undo/redo. The laptop's `laptop.poweredOn` value drives displays whose `monitor.sourceId` points to that laptop; the first four point to `pc`. This is a visual planner control, not a connection to physical devices.

The **work monitor pair is visible by default**. Its `work-zone` root belongs to the desk with `onDesktop: true`; both work screens are children of that root. Select the group to move or rotate its one clamp, column, and two arm branches together. Select a screen to adjust it independently. Arm height/reach, screen positions, and laptop opening angle remain editable. The laptop is an independent desk child, so it stays on the desk if you explicitly hide or remove the monitor pair.

**Show/Hide work monitor pair** and **Add/Remove work monitor pair** remain available for deliberate user changes, with undo/redo. The correction restores previously missing or hidden work screens automatically once; subsequent user edits persist. Both zones share the movable chair; use the group's two chair-position buttons to compare seating positions.

Placement is rejected if it extends outside the room or intersects solid architectural features. Wall-mounted screens must remain within arm reach, with anchors on solid wall. The work-zone clamp must grip a desktop edge, the laptop must rest fully on the worktop, and visible work screens/laptops must clear other visible furniture. Other furniture-to-furniture overlaps remain available for desk accessories and experimentation; inspect clearances in Walk mode. The generic storage and divider model types remain available for explicitly imported configurations or future iterations.

## Baseboard LEDs and neutral walls

In **Room measurements → Baseboard LEDs**, change color, light intensity, glow, or enabled state. Defaults are subtle red (`#ff3030`, intensity `0.18`, glow `0.30`). Emissive strips follow actual skirting spans and stop at the doorway; a restricted bloom effect and low-range point lights provide soft color spill. Hidden cutaway walls also hide their LEDs and spill; Walk mode restores them. Settings are in `room.baseboardLED` and participate in save/export and undo/redo.

Walls remain neutral. `room.wallFinishes` provides independent north/south/east/west color, plaster/plain texture, and sheen. The per-wall material factory in `src/materials/index.ts` is the extension point for future finishes; future panels/decorations belong in `src/architecture/`. No decorative wall styling is finalized.

UI edits are automatically saved to this browser's local storage, and survive refreshes. **Export layout** downloads all room and furniture configuration as JSON. The upload icon imports a validated layout. Undo/redo keeps up to 60 edits for the current session. Nothing is sent to a server.

**Saved local layouts take precedence over `office.ts`.** The current scene revision saves under `roomwork.office.v14` and still uses JSON schema version 2. Existing v13 browser layouts receive only the two work-screen poses, a 19 cm shift of their existing desktop clamp, and the far-right laptop pose. The main four screens and all unrelated objects remain unchanged; v13 remains backed up. Customized placements that do not match the validated reference are retained with a notice. Existing v12 browser layouts receive only the four personal-screen poses and relocated wall anchors; all dimensions, heights, other furniture and architecture remain untouched, and v12 remains backed up. Existing v11 browser layouts receive the full-size 4+2 correction and left-side tower relocation, retaining the exact desk geometry, room, chair, finishes, case size, arm specifications, and laptop power state. The v11 entry remains intact as a backup. A customized desk is kept unchanged with a notice instead of forcing the audited layout to fit. Existing v10, v9 and v8 browser layouts receive only the monitor, arm, and laptop placement correction; their room, desk, chair, PC, finishes, and dimensions stay unchanged, and their v8 save remains backed up. Existing v7 and v6 browser layouts receive the corrected floating desk and both complete workstation zones while preserving their **room dimensions, walls, window, door, soffits, corner step, and air conditioner**. Their previous entry remains as a backup. If the revised furniture cannot fit a customized room, the original layout is kept with a notice. Earlier local revisions also pass through the applicable prior migrations, including the optional air conditioner and photo-based architectural corrections. The privacy screen and drawer remain removed. Later edits persist normally. Explicitly importing an old JSON preserves that file's arrangement, subject to validation, so previous layouts can still be restored. Reset this object restores its source defaults; the work-zone clamp resets to the edge of the current desk. The UI does not rewrite source files.

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
