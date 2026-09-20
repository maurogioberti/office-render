# Compact sleeper study — fixed office

**Result: conditional geometric fit for a 2.00 m compact L on the NORTH wall, opposite the window.** Its chaise follows the east/door wall (the seated person's left). The same sofa **does not fit on the short door wall**. Both interpretations are available because “front wall” has not been confirmed.

Run `npm run dev`, then open **http://127.0.0.1:5173/sofa-study.html**. Select a candidate, wall and daily/seating/sleeping state. Orbit the Babylon scene, use the overhead view, or open the dimensioned plan. This separate study neither reads nor overwrites the planner's saved layout. The validated office from commit **6967b8e** remains unchanged in every state.

## Views

| State | Dimensioned top-down plan | Perspective |
| --- | --- | --- |
| Daily, closed | [PNG](mini-north-daily.png) / [SVG](mini-north-daily.svg) | [Daily perspective](perspective-daily.png) |
| Seating | [PNG](mini-north-seating.png) / [SVG](mini-north-seating.svg) | Same closed geometry as daily |
| Sleeping, extended | [PNG](mini-north-sleeping.png) / [SVG](mini-north-sleeping.svg) | [Sleeping perspective](perspective-sleeping.png) |

Perspectives share a camera and show actual meshes with north/east walls cut away. They use simplified software shading; they are **not browser screenshots**. In-app views use Babylon lighting/shadows. Closed outlines and complete open planning envelopes appear in every plan. This directory contains 18 plans: three candidates × two walls × three states.

## Candidate dimensions and evidence

| Candidate | Closed width × straight depth | Chaise | Usable bed | Open outer depth used |
| --- | --- | --- | --- | --- |
| Sofy24 Mini L | 2.00 × 0.90 m | 1.30 m | 1.90 × 1.40 m | **1.50 m, provisional** |
| IKEA TORNSBORG straight sleeper | 1.54 × 0.95 m | None | 1.40 × 1.95 m | 1.95 m, published total |
| IKEA LYCKSELE straight sleeper | 1.42 × 1.00 m | None | 1.40 × 1.88 m | **1.98 m, provisional** |

The [Mini manufacturer](https://sofy24.pl/narozniki/421-mini-naroznik.html) lists a 200 × 130 cm option, 190 × 140 cm bed, storage and a DL mechanism: pull the seat forward, then fold down the back. The model uses 90 cm straight depth and 45 cm seat height. Chaise width 72 cm is provisional. The full-bed planning envelope adds 10 cm to the 140 cm sleeping depth for unknown frame projections: **an explicit allowance, not a verified overall dimension or manufacturer motion CAD**. Upholstery and linkage geometry are schematic.

[TORNSBORG specifications](https://www.ikea.com/gb/en/p/tornsborg-2-seat-sofa-bed-naggen-beige-pine-40586103/) give 195 cm total folded-out depth. [LYCKSELE specifications](https://www.ikea.com/de/en/p/lycksele-two-seat-sofa-bed-frame-black-90032681/) give 188 cm bed length but not its full operating envelope; this study adds 10 cm. Both alternatives are genuine sleepers but **straight sofas, not alternatives meeting the L-shaped requirement**. These are dimensional comparisons, not local availability claims.

## Exact clearances within the modeled Mini trial

Furniture back edges: **Z = 1.27 m / X = 1.87 m**, allowing **3 cm** to each wall. Long section X = **−0.13…1.87 m**, Z = **0.37…1.27 m**. Chaise extends to **Z = −0.03 m**. Complete open envelope X = **−0.13…1.87 m**, Z = **−0.23…1.27 m**. No chair tucking is applied.

| Check | Daily | Seating | Sleeping |
| --- | ---: | ---: | ---: |
| Sofa/bed to nearest desk edge | 43.0 cm | 43.0 cm | 43.0 cm |
| Sofa/bed to chair footprint, shortest distance | 22.7 cm | 22.7 cm | 17.0 cm |
| Sofa/bed to nominal door opening | 22.0 cm | 22.0 cm | **2.0 cm** |
| South aisle, sofa envelope to window wall | 127.0 cm | 127.0 cm | 107.0 cm |
| Door-to-sofa/bed landing route, either inward hinge trial | 67.5 cm | 67.5 cm | 67.5 cm |
| Door-to-window approach route, either hinge trial | 67.5 cm | 67.5 cm | 67.5 cm |
| Normal chair approach target | 67.5 cm route | 67.5 cm route | **Blocked by bed** |
| Rearward chair translation tested, without changing its saved position | At least 60 cm | At least 60 cm | 17 cm |

The 43 cm gap beside the desk is **not** the exit route. Circulation uses the south aisle. Route figures are minimum clear widths along computed paths, not the aisle's full width or globally optimal routes. A 20 mm grid finds paths; continuous segment-to-edge distances measure those paths. The 60 cm planning criterion is not a building-code or accessibility certification.

The existing nominal doorway is 82 cm, but its rendered jambs leave **69 cm**. Both assumed inward handings were checked in 0.25° increments through 90° against the sofa. Neither intersects the Mini. Minimum sampled sofa-to-leaf clearance is 27.37 / 24.75 cm closed, and **7.48 / 4.75 cm sleeping**, for south/north hinge trials. Actual handing remains unconfirmed; the static door model is unchanged. Plans explicitly overlay a south-hinged trial leaf. A hypothetical route through a collided-open door in a failed scenario does not override the conflict verdict.

**Daily:** door, workstation and window approach remain usable in this model. **Seating:** the north-wall sofa faces the window wall; at least 60 cm rearward chair travel is available in the diagnostic sweep. The future TV location is unknown, so viewing distance and sightlines remain unverified; no TV is added. **Sleeping:** the modeled bed has an exit landing and window approach, but blocks normal chair access. Comfortable simultaneous desk use is not claimed. The chair stays fixed.

## Requested size conflict and two smaller trials

The east/door wall has **1.55 m** above the doorway. A 1.90 m sofa exceeds that by 35 cm before wall clearance. The 2.00 m trial with 3 cm wall allowance overlaps the opening by **48 cm**. See [failed L trial](mini-east-daily.png).

| Smaller real sleeper | North wall, sleeping | East wall, sleeping |
| --- | --- | --- |
| TORNSBORG 1.54 m | **Fails:** its 1.95 m projection enters the doorway and intersects either leaf sweep. | **Fails:** 2 cm into nominal doorway after wall allowance. Normal chair approach also blocked. |
| LYCKSELE 1.42 m | **Fails:** provisional 1.98 m projection enters the doorway and leaf sweep. | **Conditional:** 10 cm to doorway, 45 cm to desk, 19 cm to chair, 67.5 cm exit via the exposed south side. Chair approach blocked. Not L-shaped. |

Plans: [TORNSBORG north](tornsborg-north-sleeping.png), [TORNSBORG east](tornsborg-east-sleeping.png), [LYCKSELE north](lycksele-north-sleeping.png), [LYCKSELE east](lycksele-east-sleeping.png). Narrower sofas can project much farther when opened; width alone does not determine fit.

## Limits and reproduction

The Mini's **2 cm doorway margin** leaves little tolerance for an unverified frame or mechanism excursion. Confirm the wall, actual door swing and supplier's complete opening/swept dimensions before treating the real installation as validated. An extra 2 cm of projection consumes that entire margin. Storage-lid operation and cushion stowage are not certified; no workstation surface is repurposed to hide them.

- `src/study/config.ts`: candidates, sources and explicit allowances.
- `src/study/analysis.ts`: collisions, door sweeps, chair sweep and routes.
- `src/study/geometry.ts`: meter-scale closed/open Babylon meshes.
- `src/study/plan.ts`: dimensioned plans shared by app and exports.
- `npm run study`: regenerate views and [full measurements](study.json), including the locked office hash.
- `npm test`: 72 tests passed, including unchanged-office snapshots, sofa mesh scale and conflict regressions.
- `npm run build`: passed; existing Babylon bundle-size warning remains.

No connected browser was available for interactive QA. Mesh previews were inspected locally; geometry tests and the production build completed. [Historical preflight notes](preflight-notes.md) are retained, superseded for the sofa by this study.
