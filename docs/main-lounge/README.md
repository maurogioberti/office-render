# Sofa and TV in the main planner

Open **http://127.0.0.1:5173/**. The compact L sofa and one **50-inch TV** now appear alongside the existing office, including for existing v13 saves. No room or workstation transform/dimension changes are applied.

The left panel's **Lounge / Sofa + TV** controls hide/show both additions and switch the sofa between closed and sleeping states. These controls persist with the office layout and participate in undo/redo. The six external workstation monitors and laptop remain separate from the new TV.

- Sofa: same 2.00 m compact L, 0.90 m straight depth, 1.30 m chaise, on the north wall opposite the window. Bed planning envelope remains provisional as detailed in the [sofa study](../lounge-study/README.md).
- TV: 1.12 × 0.65 × 0.07 m, center **(1.28, 0.74, −1.17) m**, front facing north toward the sofa.
- Wall plate: 0.16 × 0.28 m, centered X = 1.28 m, Y = 0.74 m. Its leftmost X = 1.20 m is beyond the window's east edge at 1.175 m. The plate attaches to solid wall, never the window frame.
- The available wall strip is only 0.725 m, narrower than the television. The full-size screen therefore parks **below the sill**, with its top at 1.065 m: **55 mm below the 1.12 m opening sill**. Its east edge clears the room corner by 60 mm.
- Two pairs of 0.31 m articulated links represent a robust folded dual arm. The 0.62 m reach is a geometry limit, not certification of an unidentified mount or wall substrate. The VESA plate and service cable are modeled.
- The parked TV/arm clear both hypothetical inward door handings through 90° at 0.25° increments and do not intersect the modeled window details. The actual door handing remains unconfirmed.
- **Only the parked TV pose is implemented.** A fully extended, aimed pose and its swept operating envelope have not been established. The main view does not claim that such a motion is clear of the door. The earlier study's sofa-only circulation measurements must not be treated as a completed TV movement audit.
- Walk Mode includes the sofa, chaise, TV and mount in its collision obstacles. Hiding the lounge removes those added obstacles.

Additive UI state lives in optional `PlannerConfig.lounge`. Sofa specifications remain in `src/study/config.ts`; main-view TV dimensions, coordinates and arm lengths are centralized in `src/config/lounge.ts`. They can be changed in code for subsequent placement iterations. The TV currently has no movement gizmo or extension control.

[Closed sofa + TV](daily.png) · [Sleeping sofa + TV](sleeping.png). These are previews of the actual main-scene meshes at the original camera angle, with simplified software shading, not browser screenshots. Regenerate with `npm run lounge:views`.
