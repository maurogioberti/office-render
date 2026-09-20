> Historical preflight. Superseded for the sofa by [the completed conditional study](README.md). TV research remains unapplied.

# TV and sofa-bed feasibility — preflight

Status: **not an approved layout; operational states are not yet verified**. No TV, sofa, alternate furniture, or moving door has been added to the office planner. All validated workstation and architecture configuration remains untouched.

[Dimensioned top-down constraint plan](preflight-plan.svg) · [Machine-readable measurements](preflight.json)

Reproduce with `npx tsx scripts/lounge-preflight.ts`. The plan's red rectangle is only a minimum-size trial on the door wall, showing why that interpretation fails. It is not a selected sleeper sofa and is not part of the office scene.

## Measurements established from the locked model

| Constraint | Measurement | Consequence |
| --- | ---: | --- |
| Room | 3.80 x 2.60 m | Unchanged |
| Solid strip left when facing the window from inside (east/entrance side) | 0.725 m | A 1.12 m TV is 0.395 m wider |
| TV case used for preflight | 1.12 x 0.65 x 0.07 m | Full requested scale; not resized |
| Highest TV center below the window, allowing a 50 mm gap | 0.745 m above floor | A low parked screen could extend beneath the opening; width alone does not rule this out |
| Longest uninterrupted run of the east/door wall | 1.550 m | A minimum 1.900 m sofa overlaps the doorway by at least 0.350 m if backed onto this wall |
| Other side of the door | 0.230 m | Cannot accommodate that sofa |
| Nominal door opening | 0.820 m | This is not the clear passage width |
| Rendered clear width between the 65 mm jambs | 0.690 m | The existing doorway already falls below the requested 0.80 m circulation target |
| Rendered closed leaf | 0.720 m wide, 0.045 m thick | No opening direction, hinge pivot, or maximum angle exists in the current configuration |

The TV result concerns parking wholly within the solid strip at window-overlapping height. It is **not** a proof that every possible 50-inch installation is impossible. Parking below the sill, parking obliquely, or folding around a corner requires a separate arm/window/door movement study; none of these changes has been applied. A 43-inch 16:9 active panel alone is approximately **0.952 m wide**, so reducing to 43 inches would not solve the 0.725 m strip constraint at the same height.

The sofa result is conditional on “front wall” meaning the **east wall containing the door**. It rules out the entire requested 1.90–2.05 m width range on that wall, even before adding the chaise, conversion mechanism, sleeping footprint, or clearances. It does not establish a failure on a different wall. Wall terminology must be confirmed before selecting a genuine sleeper product or assigning sofa coordinates.

## Information needed to complete the three-state study

1. Identify the sofa's “front wall”: is it the short door wall opposite the desk, or the long wall opposite the window? “Left of the window” is provisionally interpreted from inside, facing the window.
2. Confirm the door motion: inward with hinges on the window side, inward with the opposite handing, or outward. The handle suggests a handing but a closed placeholder cannot establish the opening direction. No new swing is treated as existing architecture.

The fiber remains horizontally referenced to the AC center; its previously contradictory vertical description remains unresolved. This study does not move or invent the fiber entry.

## Operational-state report

| Required state | Result at this stage |
| --- | --- |
| Daily office: sofa closed, TV parked | Unverified. Door-wall sofa interpretation fails; TV flat parking within the strip fails. Alternative wall/low parking needs confirmation and analysis. |
| TV: sofa closed, TV extended | Unverified. No fabricated swivel/tilt, swept envelope, cable allowance, viewing distance or maximum door angle is reported without valid endpoint locations and actual door motion. |
| Sleep: bed open, TV parked | Unverified. No sofa product or sleeping mechanism has been selected; no sleeping surface or emergency route is claimed. Chair stays at its validated coordinates until a valid study warrants testing the requested sleep-state exception. |

Accordingly, three “successful” perspective scenes, measured routes and movement envelopes have not been fabricated. They would falsely imply that the unresolved arrangement has passed. The diagnostic plan documents the dimensional blockers while keeping the actual planner unchanged.

## Hardware research, not an applied alternative

A real mount in the requested reach class exists: Vogel's TVM 3645 lists a **0.67 m reach**, up to **180 degrees swivel**, **20 degrees tilt**, a **35 kg rating**, and support for **40–77-inch televisions**. Those ratings do not establish wall-plate fit, compatibility with an unidentified TV, or clearance in this room. Exact plate dimensions, kinematics, VESA, TV weight and wall substrate still need checking before selecting an installation. [Manufacturer specifications](https://www.vogels.com/es-es/c/tvm-3645-soporte-tv-giratorio-negro).

A compact **straight** sleeper such as IKEA ASARUM illustrates a possible later alternative: manufacturer dimensions **1.91 x 0.84 m**, sleeping surface **1.91 x 1.30 m**. It is not the requested L-shaped sofa and still cannot fit the 1.55 m door-wall run. It has not been selected, purchased, modeled, or substituted. [Manufacturer dimensions](https://www.ikea.com.tr/en/p50284647).

No alternative will be applied without approval. No current mount or sofa product is claimed to meet all the requested constraints.
