# AC-side return position correction

This revision relocates only the four personal screens and their wall anchors. The existing verified housings, heights, materials and 65 cm arm limits are unchanged. The desk, room, architecture, chair, laptop, work pair, shared arm and PC tower remain identical to the v12 checkpoint.

- [Centered front view](front.png)
- [Top-down view](top.png)
- [Exact scene configuration used for both previews](layout.json)

The portrait's outside edge is at X = **-0.635 m**, **7.5 cm** inward from the short AC-side return tip at X = **-0.560 m**. This measures the intended short-return endpoint, not the end of the 2.50 m main span.

| Personal screen | World X | World Z | Yaw | Wall plate | Anchor offset | Required reach |
| --- | ---: | ---: | ---: | --- | ---: | ---: |
| Portrait | -0.8150 | -1.1700 | -180° | South | -0.8150 | 0.0600 m |
| First landscape | -1.2838 | -0.9825 | -145° | South | -1.2838 | 0.2547 m |
| Center landscape | -1.6366 | -0.4786 | -105° | West | -0.4786 | 0.1948 m |
| Last landscape | -1.5830 | 0.1341 | -65° | West | 0.1341 | 0.2507 m |

All plate centers remain at Y = **1.295 m**. They attach to solid modeled wall, clear of the window, AC opening, soffits and corner step. The model does not establish the physical wall substrate or fastening capacity.

Nearest casing gaps are **24.36, 22.21 and 22.21 mm** along the personal array. Screen-edge center spacing is 40 mm; the curved cases' 52 mm thickness accounts for the smaller actual gaps. This is a coherent corner arc with relocated anchors, not an 85 cm translation from the previous anchors.

The unchanged laptop remains at **(-1.40, 0.76, 0.885) m**, yaw **-35°**, lid **120°**. Its **0.467 x 0.452 m** rotated envelope fits the available **0.720 x 0.501 m** inside corner, without crossing an arm/clamp footprint. Its conservative top remains **105 mm** below the landscape cases. The two work screens remain on the right return. The tower stays at **(-0.92, 0, -0.94) m**, with all previously verified ventilation clearances intact.

Revision **v13** upgrades the saved v12 scene without resizing anything or moving any other equipment. The original v12 storage entry remains as a backup. Placement fails with an explanatory notice if the saved desk differs, an arm cannot reach, a plate hits an architectural feature/opening, or the new array obstructs other equipment. It does not silently stretch an arm or replace the room.

Run `npm run audit` for geometric checks and `npm run views` to regenerate both PNGs from the actual Babylon meshes. The browser connection was unavailable during this pass, so the PNGs are deterministic software-rasterized geometry previews, not browser screenshots. They use simplified flat shading and omit the production textures/shadows; no alternative object models or AI-generated image edits are used. The application itself remains the interactive Babylon scene, with its existing camera, materials and lighting unchanged.
