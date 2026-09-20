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
| Move the optional monitor pair | Select its shared-arm group, then use the move/rotate gizmo |
| Show / hide the optional pair | **Show/Hide optional monitor pair** below the scene list |
| Add / remove the optional pair | **Add/Remove optional monitor pair** below the scene list; the laptop remains |
| Test chair position | Monitor-pair inspector: **Chair at work setup** / **Chair at personal setup** |
| Nudge furniture | Arrow keys: 5 cm; Shift + arrow: 1 cm |
| Focus selection | `F` |
| Undo / redo | Ctrl/Cmd Z / Ctrl/Cmd Shift Z; toolbar buttons |
| Perspective / top | View button above the scene |
| Floor grid / dimensions / cutaway | Buttons at the lower right of the viewport |
| Walk | Click **Start walking** or the canvas to capture the mouse; WASD moves, mouse looks |
| Release the mouse | Escape |
| Walking speed | Walk-mode inspector: 0.4–2.4 m/s |

The walking camera stays at **1.70 m**. A 0.20 m body radius collides with room boundaries, rotated furniture footprints, and enabled architectural features. Movement uses small swept steps to prevent tunneling through thin obstacles. The L-shaped desk uses collision rectangles matching its worktops and corner cutout, leaving its inner chair bay open. The existing door is modeled closed. Edit-mode cutaway visibility does not remove collision boundaries in Walk mode.

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

The default layout has **11 furniture objects**: an L-shaped desk, one ergonomic chair, desktop PC, four personal monitors, a separate laptop, and a hidden optional pair of work monitors on one shared arm. The privacy screen and movable drawer unit remain removed. The desk occupies the **southwest corner in plan view**, with a **2.20 m main run along the west wall** (the right-side desk wall in the comparison view), a shorter **1.45 m return along the south window wall**, **0.72 m worktop depth**, and **0.76 m height**. Its outer rear corner is **(-1.86, 0, -1.26) m**. A **0.23 × 0.19 m corner cutout** wraps around the fixed vertical wall step with approximately 3 cm clearance. The window-side end stops 0.635 m before the window opening, keeping that area visually open.

Select the desk to change **Main run**, **Return run**, height, worktop depth, or the corner cutout. `dimensions.width/depth` define the outer L envelope; `cornerDesk.mainRun: 'depth'` identifies the main working run in this layout, and `cornerDesk.worktopDepth` defines both worktop strips. `cornerDesk.cornerNotch` stores the cutout dimensions. The L occupies the local -X and -Z sides. Changing either run preserves the rear corner and existing desk attachments' room positions where they still fit.

The personal setup uses **three landscape Samsung 27-inch monitors**, with angled outer screens, plus **one nearby portrait Samsung 27-inch monitor**. The array is positioned primarily over the west-wall main run, with articulated **wall-mounted arms** keeping the desk surface available. The shorter window-side return holds the laptop. Active display size follows a **27-inch, 16:9 diagonal** (about 0.598 × 0.336 m, swapped for portrait). No exact Samsung model was specified; casing, bezel, and arm details remain placeholders.

Each personal monitor is an independent room object: moving, rotating, or changing the height of the desk does not move its screen or wall attachment. The PC remains a desk child. Monitor `position.y` is the bottom of its screen enclosure; `dimensions` describe that enclosure, excluding the arm. `monitor.wallMount` stores the anchor wall, offset from that wall's center, height above the floor, and maximum arm reach. Moving a screen updates the arm while its wall attachment stays fixed. The inspector exposes anchor offset, height, and reach; wall assignment is also editable in the central config or exported JSON. Screen position and yaw remain individually configurable. Screen enclosure edits must still contain the specified display panel.

The provisional **optional monitor pair** retains two 27-inch landscape screens on **one shared desktop clamp and dual-monitor arm**, hidden by default to keep the shortened return clear. The `work-zone` object is attached to the desk with `onDesktop: true`; both `work-monitor-*` screens are its children. Select this group to move, rotate, show, or hide the pair together, or select an individual screen for local adjustments. Its `workZone` configuration separates the surface offset, column height, and arm reach; the inspector exposes column height and reach. The open `work-laptop` is a separate desk child with `onDesktop: true`, so it follows desk movement and height changes independently of the optional pair. Its `openingAngle` is editable from 85° to 120°. All dimensions and positions remain configurable.

**Show/Hide optional monitor pair** previews the extra pair; **Add/Remove optional monitor pair** removes or restores its group without removing the laptop or changing the personal monitors. Group removal and other edits support undo/redo, save, and export. Scene-list groups distinguish shared furniture, the personal array, and the optional pair; indented monitor rows belong to the group. Hiding a parent also hides its children. Both work areas use the same chair: move it manually or use the monitor-pair inspector's two chair-position buttons to test each station. The optional pair remains an experiment for checking desk space and circulation, not a confirmation that both workstations will suit every user.

Placement is rejected if it extends outside the room or intersects solid architectural features. Wall-mounted screens must remain within arm reach, with anchors on solid wall. The work-zone clamp must grip a desktop edge, the laptop must rest fully on the worktop, and visible work screens/laptops must clear other visible furniture. Other furniture-to-furniture overlaps remain available for desk accessories and experimentation; inspect clearances in Walk mode. The generic storage and divider model types remain available for explicitly imported configurations or future iterations.

## Baseboard LEDs and neutral walls

In **Room measurements → Baseboard LEDs**, change color, light intensity, glow, or enabled state. Defaults are subtle red (`#ff3030`, intensity `0.18`, glow `0.30`). Emissive strips follow actual skirting spans and stop at the doorway; a restricted bloom effect and low-range point lights provide soft color spill. Hidden cutaway walls also hide their LEDs and spill; Walk mode restores them. Settings are in `room.baseboardLED` and participate in save/export and undo/redo.

Walls remain neutral. `room.wallFinishes` provides independent north/south/east/west color, plaster/plain texture, and sheen. The per-wall material factory in `src/materials/index.ts` is the extension point for future finishes; future panels/decorations belong in `src/architecture/`. No decorative wall styling is finalized.

UI edits are automatically saved to this browser's local storage, and survive refreshes. **Export layout** downloads all room and furniture configuration as JSON. The upload icon imports a validated layout. Undo/redo keeps up to 60 edits for the current session. Nothing is sent to a server.

**Saved local layouts take precedence over `office.ts`.** The current scene revision saves under `roomwork.office.v7` and still uses JSON schema version 2. Existing v6 browser layouts receive the revised desk and workstation arrangement while preserving their **room dimensions, walls, window, door, soffits, corner step, and air conditioner**. Their v6 entry remains as a backup. If the revised furniture cannot fit a customized room, the original layout is kept with a notice. Earlier local revisions also pass through the applicable prior migrations, including the optional air conditioner and photo-based architectural corrections. The privacy screen and drawer remain removed. Later edits persist normally. Explicitly importing an old JSON preserves that file's arrangement, subject to validation, so previous layouts can still be restored. Reset this object restores its source defaults; the work-zone clamp resets to the edge of the current desk. The UI does not rewrite source files.

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
