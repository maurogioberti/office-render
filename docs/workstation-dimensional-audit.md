# Workstation dimensional audit

All distances are meters unless stated otherwise. Run `npm run audit` to recompute the measurements and reject a dimensional conflict. This audit uses actual Babylon mesh bounds, unscaled monitor housings, rotated equipment footprints, and the existing mounting-arm geometry. It is a geometric fit check, not a measurement of the unidentified physical hardware.

## Locked geometry

The desk is unchanged from the v11 checkpoint: main span **2.50**, overall depth **1.30**, height **0.76**, main surface depth **0.72**, return width **0.62**, and southwest cutout **0.23 x 0.19**. Bottom-center position remains **(-1.21, 0, -0.01)**, rotation **0 degrees**. The plain floating worktop, supports and material are unchanged.

The room remains **3.80 x 2.60**, with provisional height **2.65**. The entire architecture configuration is unchanged, including wall positions, window, door, AC, soffits, corner step, finishes and lights. Chair, camera and lighting code were not changed. Regression tests compare the complete desk, chair and room against the previous saved-layout fixture.

Coordinates: X is the 3.80 m direction, Z the 2.60 m direction, Y is height. West is negative X; the window/AC wall is south (negative Z). The main desk runs along west; its left end is south, and the right return is north.

## Six external monitors

| Monitor | Width | Height | Case depth | Source / support |
| --- | ---: | ---: | ---: | --- |
| Personal portrait, first at left | 0.360 | 0.612 | 0.052 | PC / existing wall arm |
| Personal landscape, first | 0.612 | 0.360 | 0.052 | PC / existing wall arm |
| Personal landscape, center | 0.612 | 0.360 | 0.052 | PC / existing wall arm |
| Personal landscape, last | 0.612 | 0.360 | 0.052 | PC / existing wall arm |
| Work landscape, left | 0.612 | 0.360 | 0.052 | Laptop / shared desk arm |
| Work landscape, right | 0.612 | 0.360 | 0.052 | Laptop / shared desk arm |

These conservative rounded housings reference Samsung's SR356 27-inch specification of **611.7 x 359.9 x 51.3 mm without stand**. The owned model is not yet identified. Active panels remain a true **27-inch diagonal, 16:9** (approximately 0.5977 x 0.3362); their size is never reduced to fit. The rendered cases now match the configured dimensions rather than a smaller proxy. Mounting arms are outside the casing measurements. [Samsung official dimensions](https://www.samsung.com/ca/business/monitors/flat/sr356-27-inch-ips-fhd-1080p-freesync-ls27r356fhnxza/).

All six center heights are **1.295**. The main four remain on the west main span, with yaws **-105, -100, -90, -80 degrees**: a shallow arc, in portrait/landscape/landscape/landscape order. Its nearest casing clearance to the existing southwest step is approximately **28.5 mm**. The work pair faces inward from the north return and remains physically separate from the four personal screens. Arm models, column dimensions and maximum reaches are unchanged; their joints follow the relocated monitors.

## Span and gap measurements

- Main four, if laid straight: **2.271** = 0.360 + 3 x 0.612 + 3 x 0.025. Straight-run remainder: **0.229**.
- Actual main-span occupancy, including the rotated housings' full depth: **2.2506**. Remaining on the locked 2.50 span: **0.2494**, divided into **0.0700** at the left and **0.1794** at the other end.
- Within-main nearest housing gaps: **22.73, 20.47, 20.47 mm**. Edge-center spacing is 25 mm; the angled cases' thickness accounts for the smaller nearest-edge gaps.
- Work pair: **1.249** = 2 x 0.612 + 0.025. It uses the **full 1.30 return**, including the corner overlap, leaving **25.5 mm at each end**. It does not fit solely on the 0.58 extension beyond the main strip; that is not how it is positioned.
- The two work cases remain above the return's **0.62** depth; their mutual gap is **25 mm**. Their cases clear the last personal display by at least **58 mm along Z**. This is an intentional split 4+2 layout, not the previous continuous six-screen row.

## Laptop corner

The existing corner overlap measures **0.72 x 0.62**. After reserving 20 mm beyond the rendered personal-arm and shared-clamp bounds, the conservative usable rectangle measures approximately **0.5124 x 0.5010**. No desk surface was added to obtain this space.

The single laptop keeps its **0.36 x 0.25 x 0.30** envelope. At **-35 degrees**, it occupies a conservative horizontal bounding rectangle of **0.4670 x 0.4522** and fits fully within that clear corner. Its bottom-center is **(-1.40, 0.76, 0.885)**. It faces the fixed chair, beneath and forward of the transition between the two groups, with the keyboard and webcam exposed.

The lid is set to **120 degrees**, the model's full supported opening. Even the conservative 0.25 m height envelope stays **105 mm below** the landscape cases. The complete rotated laptop envelope avoids every rendered mounting-arm/clamp footprint, so it is neither underneath an arm nor intersecting one. This includes checking the clamp jaws, not just the upper links. Its case dimensions and real hinge limits remain provisional until the laptop model is known.

## Tower and fiber reference

The unchanged **0.22 x 0.45 x 0.42** tower is now under the **left/south return**, at bottom-center **(-0.92, 0, -0.94)**, rotated **180 degrees**, front facing into the room. Its bounds are X **[-1.03, -0.81]**, Z **[-1.15, -0.73]**, Y **[0, 0.45]**. It clears the chair and remains outside the open seating bay.

| Clearance | Distance |
| --- | ---: |
| Rear to window/AC wall | 0.150 |
| West side to corner step, at overlapping case height/depth | 0.630 |
| East side toward the room, to east wall | 2.710 |
| Front to conservative current chair envelope | 0.310 |
| Top to nearest overhead cantilever support | 0.220 |
| Top to underside of wooden worktop | 0.265 |

These clear the requested provisional **10 cm rear / 5 cm sides** targets; front and top have open ventilation space. The exact case, vent locations and cables are unknown, so this does not certify cooling performance or bottom-intake clearance.

The tower's nearest side is **0.180** laterally beyond the AC casing's vertical footprint (**0.155** beyond its trim). This is geometric separation, not a guarantee about an unmeasured condensation/drain route. The provisional fiber alignment is the AC center, X = **-0.30**, on the same south wall; the tower center is **0.62** farther west, allowing a short wall-following route while avoiding the AC footprint.

**Fiber entry height remains unresolved.** The supplied description says both 40 cm above the window top and below the AC. In the unchanged model the window top is **2.47**, so adding 0.40 gives **2.87**, above the **2.65** ceiling; the AC bottom is **1.85**. No fictitious fiber hole or cable height was added. Horizontal alignment is provisional, and cable length awaits the actual entry height and connector position.

## Verification and persistence

`npm run audit` checks all six full-size rendered housings, support-free laptop space, main-span and return bounds, actual casing gaps, equipment separation, and tower clearances. The automated suite also checks both navigation modes, editing, persistence, power grouping, architecture and unchanged desk geometry. Work power still switches only the laptop and its two monitors.

Revision **v12** migrates the previous **v11** browser layout while retaining the original entry as a backup. It preserves desk geometry, room, chair, finishes, arm specifications, tower dimensions and work power state. If the saved desk differs from the audited geometry, the migration retains the existing scene and reports that it needs a separate audit instead of resizing anything to force a fit. The browser tool was unavailable during this pass; no fresh visual/browser inspection is claimed.
