/** Separate feasibility scenarios. Never saved into the validated office layout. Meters. */
export type StudyState = 'daily' | 'seating' | 'sleeping';
export type StudyWall = 'north' | 'east';
export interface SleeperSpec {
  id: string; name: string; width: number; depth: number; height: number;
  chaiseDepth: number; chaiseWidth: number; openDepth: number;
  bedLength: number; bedWidth: number; seatHeight: number;
  mechanism: 'dl' | 'forward-fold'; source: string; qualification: string;
}
export const SLEEPERS: SleeperSpec[] = [
  { id:'mini', name:'Sofy24 Mini · compact L', width:2, depth:.90, height:.85,
    chaiseDepth:1.30, chaiseWidth:.72, openDepth:1.50, bedLength:1.90, bedWidth:1.40, seatHeight:.45,
    mechanism:'dl', source:'https://sofy24.pl/narozniki/421-mini-naroznik.html',
    qualification:'Published 200 × 130 cm option; 190 × 140 cm bed; DL pull-forward seat / fold-down back; storage. Open outer depth 150 cm includes a provisional 10 cm frame allowance. Chaise width 72 cm and internal mechanism geometry require supplier confirmation.' },
  { id:'tornsborg', name:'IKEA TORNSBORG · smaller straight sleeper', width:1.54, depth:.95, height:.82,
    chaiseDepth:.95, chaiseWidth:0, openDepth:1.95, bedLength:1.95, bedWidth:1.40, seatHeight:.38,
    mechanism:'forward-fold', source:'https://www.ikea.com/gb/en/p/tornsborg-2-seat-sofa-bed-naggen-beige-pine-40586103/',
    qualification:'Published 154 × 95 cm closed and 195 cm total unfolded depth; 140 × 195 cm bed. Straight sofa, not an L. Detailed moving linkage is schematic.' },
  { id:'lycksele', name:'IKEA LYCKSELE · smaller straight sleeper', width:1.42, depth:1, height:.87,
    chaiseDepth:1, chaiseWidth:0, openDepth:1.98, bedLength:1.88, bedWidth:1.40, seatHeight:.39,
    mechanism:'forward-fold', source:'https://www.ikea.com/de/en/p/lycksele-two-seat-sofa-bed-frame-black-90032681/',
    qualification:'Published 142 × 100 cm closed; 140 × 188 cm bed. Open outer depth 198 cm includes a provisional 10 cm frame allowance. Straight sofa, not an L.' },
];
export const STUDY = {
  wallGap:.03, state:'daily' as StudyState, wall:'north' as StudyWall,
  wallConfirmed:false, doorHandingConfirmed:false, gridStep:.02,
  // A planning criterion, not a building-code or accessibility certification.
  desiredRouteWidth:.60,
};
