/** Main-scene additions. Meters. Existing room and workstation are never rewritten. */
export const LOUNGE = {
  sofaId:'mini', wallGap:.03,
  tv:{width:1.12,height:.65,depth:.07,
    anchor:{x:1.30,y:1.42,z:-1.27},plateWidth:.16,plateHeight:.28,links:[.70,.35],
    color:'#303936',screenColor:'#294b52'},
};
export type LoungeState = {visible:boolean;state:'daily'|'sleeping';tvProgress?:number};
export const freshLounge = ():LoungeState=>({visible:true,state:'daily',tvProgress:7/9});
