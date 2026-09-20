/** Main-scene additions. Meters. Existing room and workstation are never rewritten. */
export const LOUNGE = {
  sofaId:'mini', wallGap:.03,
  tv:{width:1.12,height:.65,depth:.07,center:{x:1.28,y:.74,z:-1.17},
    anchor:{x:1.28,y:.74,z:-1.27},plateWidth:.16,plateHeight:.28,linkLength:.31,
    color:'#303936',screenColor:'#294b52'},
};
export type LoungeState = {visible:boolean;state:'daily'|'sleeping'};
export const freshLounge = ():LoungeState=>({visible:true,state:'daily'});
