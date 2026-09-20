# Sofa and articulated TV in the main planner

Open **http://127.0.0.1:5173/**. The compact L sofa and 50-inch TV appear alongside the existing office, including for existing saved layouts. Room and workstation dimensions and transforms remain unchanged.

The left panel's Lounge controls offer **Store TV near wall**, **TV toward sofa**, and **Move TV for window access**. Each animates the same articulated assembly along a guided path, with fixed link lengths. The final position persists and participates in undo/redo. The sofa's closed/sleeping and hide/show controls remain available. Walk Mode collision obstacles follow the moving TV.

## Dimensions and mounting

- TV housing: **1.12 x 0.65 x 0.07 m**, center height **1.82 m**. It is no longer parked low beneath the window.
- Wall plate: **0.16 x 0.28 m**, centered at **(1.30, 1.82, -1.27) m**, on the south/window wall. Its left edge is 45 mm beyond the window opening's east edge, on the modeled solid wall strip.
- Arm: two rigid links, **0.70 + 0.35 m**, giving **1.05 m maximum reach**. Paired bars, hinges, a VESA plate and a moving service cable are modeled. Long mounts in this size class exist: [Mount-It lists a 43-100-inch mount with 42.5-inch extension](https://www.mount-it.com/products/full-motion-tv-wall-mount-with-extra-long-extension-for-43-100-tvs). Our assembly is a configurable spatial concept, not that product's exact CAD or a verified fixing specification.
- Stored: TV center **(0.943, 1.82, -1.145) m**, parallel to the wall; front projects approximately **19 cm** into the room.
- Viewing: center **(0.55, 1.82, -0.60) m**, facing the sofa. Arm anchor-to-VESA reach is approximately **0.97 m**.
- Window access: center **(0.75, 1.82, -0.74) m**, rotated **45 degrees**. Moving and angling the screen leaves an approach behind it. Some overlap remains in a front elevation; the window does not need to remain permanently uncovered.

The compact sofa remains **2.00 m wide**, with **0.90 m** straight depth and **1.30 m** chaise depth. Its provisional sleeping envelope is described in the [sofa study](../lounge-study/README.md).

## Verification and limits

The guided motion is sampled at 901 positions against both hypothetical inward door handings, each sampled through 90 degrees at 0.25-degree increments. The TV housing and links clear those door sweeps with an additional 10 mm footprint margin. The actual door handing remains unconfirmed. Fixed office obstacles, fixed arm lengths and arm-to-screen clearance are also checked throughout the path; 91 poses are checked against the actual Babylon window meshes.

In window-access position with the sofa closed, the modeled route to the window has approximately **60 cm** available width for either tested open-door handing. This is an access check, not an 80 cm circulation claim. The earlier sofa-only circulation figures do not include the TV's movement envelope.

Controls use the tested guided path rather than unconstrained dragging. There is no vertical tilt control. The room, desk, six external monitors, laptop, monitor arms, chair, tower and sofa are not moved by any TV control. Automated interaction checks cover animation, saved position and undo. Browser interaction could not be inspected in this environment; previews below use actual scene meshes with simplified software shading.

Configuration: `src/config/lounge.ts` contains TV size, anchor and link lengths; `src/furniture/tvMotion.ts` contains the guided poses and inverse kinematics. Additive saved state lives in optional `PlannerConfig.lounge.tvProgress`.

[Daily / viewing](daily.png) - [Stored](tv-stored.png) - [Window access](tv-window-access.png) - [Sleeping sofa / viewing](sleeping.png).

Regenerate these previews with `npm run lounge:views`.
