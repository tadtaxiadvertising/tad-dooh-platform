"use strict";

// Historical diagnostic, not an application test or a PostgreSQL integration.
// Run in a trusted checkout only: this evaluates two methods from the pinned
// repository source. No DB/client/provider/environment/network is used.
// RED is expected on the original blob. No CI registration or production fix.
// Re-run the actual service regression suite and PostgreSQL integration on a
// separate candidate; do not generalize this baseline-only simulator.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const source = fs.readFileSync(path.resolve(__dirname, "../../../../../apps/api/src/modules/wallet/wallet.service.ts"));
const blob = crypto.createHash("sha1").update("blob "+source.length+"\0").update(source).digest("hex");
if (blob !== "ca2619282c25484bed900737f6b1c1adb0747b9b") {
  console.error("BASELINE_BLOB_MISMATCH; use original SHA, not candidate");
  process.exit(2);
}
async function reproduce(source) {
  const methods=[...source.matchAll(/^  async (?:confirmWithdrawal|refundFailedWithdrawal)\([^\n]+\n[\s\S]*?^  \}/gm)].map(m=>m[0]);
  if(methods.length!==2) throw Error("Expected exactly two baseline methods");
  const js=methods.join("\n").replace("transactionId: string, reason?: string","transactionId, reason").replace("transactionId: string","transactionId");
  const Service=Function("BadRequestException","return class WalletService {"+js+"}")(Error);
  const scenarios=[
    {name:"double_refund",ops:["reject","reject"],wallet:true},
    {name:"double_confirm",ops:["confirm","confirm"],wallet:true},
    {name:"confirm_then_reject",ops:["confirm","reject"],wallet:true},
    {name:"reject_then_confirm",ops:["reject","confirm"],wallet:true},
    {name:"missing_wallet",ops:["reject"],wallet:false},
    {name:"single_confirm_control",ops:["confirm"],wallet:true},
    {name:"single_refund_control",ops:["reject"],wallet:true}
  ];
  const results=[];
  for(const scenario of scenarios){
    let row={id:"synthetic-withdrawal",type:"WITHDRAWAL",status:"PENDING",entityId:"synthetic-driver",amount:5000};
    let balance=1000,credits=0,updates=0,reads=0,next=0,release;
    const barrier=new Promise(r=>release=r);
    const gates=scenario.ops.map(()=>{let open;const p=new Promise(r=>open=r);return {p,open};});
    gates[0].open();
    const svc=new Service();svc.logger={log(){}};
    svc.prisma={$transaction:async callback=>{
      const i=next++, snapshot={...row};
      let pendingRow=null,pendingCredit=0;
      const tx={
        financialTransaction:{
          findUnique:async()=>{if(++reads===scenario.ops.length)release();await barrier;await gates[i].p;return {...snapshot};},
          update:async({where,data})=>{if(where.id!==row.id)throw Error("Unexpected ID");pendingRow=data;return {...row,...data};}
        },
        $executeRaw:async(_sql,amount,driverId)=>{if(driverId!==row.entityId)throw Error("Unexpected driver");if(!scenario.wallet)return 0;pendingCredit=amount;return 1;}
      };
      try{
        const result=await callback(tx);
        if(pendingRow){row={...row,...pendingRow};updates++;}
        if(pendingCredit){balance+=pendingCredit;credits++;}
        return result;
      }finally{gates[i+1]?.open();}
    }};
    const settled=await Promise.allSettled(scenario.ops.map(op=>op==="confirm"?svc.confirmWithdrawal(row.id):svc.refundFailedWithdrawal(row.id)));
    const applied=settled.filter(x=>x.status==="fulfilled"&&!x.value.idempotent).length;
    let pass;
    if(!scenario.wallet){pass=row.status==="PENDING"&&credits===0&&settled[0].status==="rejected";}
    else if(scenario.ops.length===1){const expected=scenario.ops[0]==="confirm"?"COMPLETED":"FAILED";pass=applied===1&&row.status===expected&&credits===(expected==="FAILED"?1:0)&&balance===(expected==="FAILED"?6000:1000);}
    else if(scenario.ops[0]===scenario.ops[1]){const expected=scenario.ops[0]==="confirm"?"COMPLETED":"FAILED";pass=applied===1&&row.status===expected&&credits===(expected==="FAILED"?1:0)&&settled.every(x=>x.status==="fulfilled")&&settled.filter(x=>x.status==="fulfilled"&&x.value.idempotent).length===1;}
    else{pass=applied===1&&settled.filter(x=>x.status==="rejected").length===1&&credits===(row.status==="FAILED"?1:0);}
    results.push({case:scenario.name,finalStatus:row.status,balance,credits,updates,applied,replies:settled.map(x=>x.status==="fulfilled"?{status:x.value.status,idempotent:x.value.idempotent}:{status:"rejected"}),invariant:pass?"PASS":"FAIL"});
  }
  return results;
}
reproduce(source.toString("utf8")).then(results=>{
  console.log(JSON.stringify({blob,scope:"synthetic baseline only",results},null,2));
  process.exitCode=results.some(x=>x.invariant==="FAIL")?1:0;
}).catch(error=>{console.error("Diagnostic failed:",error.name);process.exitCode=2;});
