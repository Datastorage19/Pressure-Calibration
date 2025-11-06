/***** Helper (กันเหนียวให้มี $/val เสมอ) *****/
function $(id){ return document.getElementById(id); }
function val(id){ return $(id)?.value ?? ""; }
function fmt(v){ return (v==null||isNaN(v))?"-":(+v).toFixed(6); }

/***** Pages *****/
const PAGES = ["dashboard","setup","entry","uncert","report","charts","help"];

/***** หน่วย *****/
const toBar = {
  "bar": v=>v,
  "kPa": v=>v/100,
  "Pa":  v=>v/100000,
  "psi": v=>v*0.0689476,
  "mmHg":v=>v*0.00133322
};

/***** State หลัก *****/
let currentJob = {
  id:null,factory:"",status:"In Progress",
  instrument:{type:"",serial:"",model:"",mfg:"",rangeMin:null,rangeMax:null,unit:"bar",medium:"",calDate:""},
  environment:{temp:null,humid:null,atm:null},
  accuracy:{cls:"",seq:"",points:[]},
  standard:{name:"",serial:"",acc:null,res:null,cert:""},
  standards_used:[],
  table:[],results:[],
  uncertainty:{ustd:0,ures:0,uzero:0,urep:0,uhyst:0,U:0},
  verdictOverall:"",
  customer:{company:"—",address:"—"},
  place:{company:"—",address:"—"}, // company = Department
  cert:{no:"—",received:"—",issue:"—"},
  signature:{tech:{name:"—",title:"—",date:"—"},rev:{name:"—",title:"—",date:"—"},app:{name:"—",title:"—",date:"—"}},
  limits:{acceptance:null,plant:null,enableCorrection:true}
};

/***** LocalStorage *****/
async function saveJob(job){
  const l = JSON.parse(localStorage.getItem("cal_jobs")||"[]");
  if(!job.id){ job.id = "local_"+Date.now(); l.push(job); }
  else{
    const i = l.findIndex(x=>x.id===job.id);
    if(i>=0) l[i] = job; else l.push(job);
  }
  localStorage.setItem("cal_jobs", JSON.stringify(l));
  return job.id;
}
async function loadJobs(){ return JSON.parse(localStorage.getItem("cal_jobs")||"[]"); }
async function deleteJob(id){
  const l = (await loadJobs()).filter(x=>x.id!==id);
  localStorage.setItem("cal_jobs", JSON.stringify(l));
  refreshDashboard();
}

/***** Navigation *****/
function switchPage(p){
  // ป้องกันผิดหน้า
  if(!PAGES.includes(p)) p = "dashboard";

  // toggle tab active
  document.querySelectorAll(".tab").forEach(b=>{
    b.classList.toggle("active", b.dataset.page===p);
  });

  // toggle section
  PAGES.forEach(id=>{
    const sec = $("page-"+id);
    if(sec) sec.classList.toggle("hidden", id!==p);
  });

  // hash
  location.hash = p;

  // lazy build
  if(p==="entry"){ autoBuildEntry(); }
  if(p==="report"){ buildReportHeader(); ensureResults(); buildResultTable(); makeAutoAnalysis(); }
  if(p==="charts"){ ensureResults(); buildCharts(); makeAICharts(); }
}

function bindTabs(){
  const nav = $("nav");
  if(!nav) return;
  nav.addEventListener("click",(e)=>{
    const btn = e.target.closest(".tab");
    if(!btn) return;
    const page = btn.dataset.page;
    switchPage(page);
  });
}

/***** Dashboard *****/
async function refreshDashboard(){
  const jobs = await loadJobs();
  const txt=(val("searchText")||"").toLowerCase(),
        df = val("filterDateFrom"),
        dt = val("filterDateTo"),
        st = val("filterStatus");

  const filtered = jobs.filter(j=>{
    const s1 = !txt
      || (j.instrument?.model||"").toLowerCase().includes(txt)
      || (j.instrument?.serial||"").toLowerCase().includes(txt);
    const d=j.instrument?.calDate||"";
    const s2=(!df||d>=df)&&(!dt||d<=dt);
    const s3=!st || j.status===st || j.verdictOverall===st;
    return s1&&s2&&s3;
  });

  // KPIs
  $("kpi-total").innerText = jobs.length;
  $("kpi-progress").innerText = jobs.filter(x=>x.status==="In Progress").length;
  $("kpi-completed").innerText = jobs.filter(x=>x.status==="Completed").length;
  $("kpi-pass").innerText = jobs.filter(x=>x.verdictOverall==="Pass").length;
  $("kpi-fail").innerText = jobs.filter(x=>x.verdictOverall==="Fail").length;

  // Table
  const tb = $("jobsBody");
  if(tb){ tb.innerHTML=""; }
  filtered.forEach(j=>{
    const tr=document.createElement("tr");
    const badge=j.verdictOverall
      ? `<span class="badge ${j.verdictOverall==='Pass'?'pass':'fail'}">${j.verdictOverall}</span>` : "-";
    tr.innerHTML=`
      <td><input type="checkbox" class="chkRow" data-id="${j.id}"></td>
      <td>${j.customer?.company||j.factory||"-"}</td>
      <td>${j.instrument?.type||"-"}</td>
      <td>${j.instrument?.serial||"-"}</td>
      <td>${j.instrument?.rangeMin}–${j.instrument?.rangeMax} ${j.instrument?.unit}</td>
      <td>${j.status||"-"}</td>
      <td>${j.instrument?.calDate||"-"}</td>
      <td>${badge}</td>
      <td class="row">
        <button class="btn" onclick='loadIntoEditor(${JSON.stringify(j).replace(/'/g,"&#39;")})'>ดู/แก้ไข</button>
        <button class="btn warn" onclick="cloneJob('${j.id}')">คัดลอก</button>
        <button class="btn fail" onclick="if(confirm('ลบงานนี้?')) deleteJob('${j.id}')">ลบ</button>
      </td>`;
    tb.appendChild(tr);
  });

  // bind header checkbox
  const chkAll = $("chkAll");
  if(chkAll){
    chkAll.onchange = (e)=>{
      document.querySelectorAll(".chkRow").forEach(c=>c.checked=e.target.checked);
    };
  }
}
function loadIntoEditor(j){
  currentJob = JSON.parse(JSON.stringify(j));
  fillSetupForm();
  switchPage("setup");
}
function cloneJob(id){
  loadJobs().then(l=>{
    const j=l.find(x=>x.id===id); if(!j) return;
    const c=JSON.parse(JSON.stringify(j));
    c.id=null; c.status="In Progress"; c.verdictOverall="";
    currentJob=c; fillSetupForm(); switchPage("setup");
  });
}

/***** Tag printing (สร้าง Tag + QR) *****/
function bindTagButtons(){
  const btnPrintTag = $("btnPrintTag");
  const btnCloseTag = $("btnCloseTag");
  if(btnPrintTag){
    btnPrintTag.addEventListener("click", async ()=>{
      const jobs=await loadJobs();
      const ids=[...document.querySelectorAll(".chkRow:checked")].map(x=>x.dataset.id);
      const sel=jobs.filter(j=>ids.includes(j.id));
      if(sel.length===0){ alert("กรุณาเลือกงานในตารางก่อน"); return; }
      const tagList=$("tagList"); tagList.innerHTML="";
      sel.forEach((j,i)=>{
        const qp="qr_"+i, U=j.uncertainty?.U??0;
        const dev0=(j.table||[]).find(r=>r.point===0)?.dev ?? (j.results||[]).find(r=>r.point===0)?.deviation ?? 0;
        const errSpan0=Math.abs(dev0)+(U||0);
        const div=document.createElement("div"); div.className="tag";
        div.innerHTML=`
          <div class="h">${j.instrument?.type||"-"}</div>
          <div class="l">Model: ${j.instrument?.model||"-"} | S/N: ${j.instrument?.serial||"-"}</div>
          <div class="l">Range: ${j.instrument?.rangeMin}–${j.instrument?.rangeMax} ${j.instrument?.unit}</div>
          <div class="l">Date: ${j.instrument?.calDate||"-"} | Verdict: ${j.verdictOverall?`<span class="badge ${j.verdictOverall==='Pass'?'pass':'fail'}">${j.verdictOverall}</span>`:"-"}</div>
          <div class="l"><b>Error@0</b>: Dev=${fmt(dev0)} | U=${fmt(U)} | Span=${fmt(errSpan0)}</div>
          <div id="${qp}" style="width:80px;height:80px;margin-top:6px"></div>`;
        tagList.appendChild(div);
        if(typeof QRCode!=="undefined"){
          new QRCode($(qp),{text:j.id||"local",width:80,height:80});
        }
      });
      $("tagArea").classList.remove("hidden");
      $("tagArea").scrollIntoView({behavior:"smooth"});
    });
  }
  if(btnCloseTag){
    btnCloseTag.addEventListener("click",()=>$("tagArea").classList.add("hidden"));
  }
}

/***** Masters (มาจาก masters.js) → เติม datalist + autofill *****/
function populateMastersIfReady(){
  if(typeof populateCompanyMaster==="function"){
    populateCompanyMaster(); // มาจาก js/masters.js
  }
}

/***** Setup form *****/
function renderPoints(){
  const box=$("pointsBox"); if(!box) return;
  box.innerHTML="";
  (currentJob.accuracy.points||[]).forEach((v,i)=>{
    const d=document.createElement("div");
    d.innerHTML=`<label>Point ${i+1} (bar)</label>
    <div class="row"><input class="input" type="number" step="0.00001" value="${v}" oninput="updatePoint(${i},this.value)">
    <button class="btn warn" onclick="removePoint(${i})">ลบ</button></div>`;
    box.appendChild(d);
  });
  const add=document.createElement("div");
  add.innerHTML=`<label>เพิ่มจุด (bar)</label>
    <div class="row"><input class="input" id="newPointVal" type="number" step="0.00001" placeholder="1.25">
    <button class="btn ghost" onclick="addPoint()">เพิ่ม</button></div>`;
  box.appendChild(add);
}
window.updatePoint=(i,v)=>currentJob.accuracy.points[i]=parseFloat(v)||0;
window.removePoint=(i)=>{currentJob.accuracy.points.splice(i,1); renderPoints();};
window.addPoint=()=>{const v=parseFloat(val("newPointVal")); if(isNaN(v))return; currentJob.accuracy.points.push(v); renderPoints();};

function fillSetupForm(){
  const i=currentJob.instrument, e=currentJob.environment, a=currentJob.accuracy, s=currentJob.signature;

  if($("custCompany")) $("custCompany").value=currentJob.customer.company||"";
  if($("custAddr")) $("custAddr").value=currentJob.customer.address||"";
  if($("placeDept")) $("placeDept").value=currentJob.place.company||"";
  if($("placeAddr")) $("placeAddr").value=currentJob.place.address||"";

  if($("certNo")) $("certNo").value=currentJob.cert.no||"";
  if($("certReceived")) $("certReceived").value=currentJob.cert.received||"";
  if($("certIssue")) $("certIssue").value=currentJob.cert.issue||"";

  if($("insType")) $("insType").value=i.type||"";
  if($("serial")) $("serial").value=i.serial||"";
  if($("model")) $("model").value=i.model||"";
  if($("mfg")) $("mfg").value=i.mfg||"";
  if($("rangeMin")) $("rangeMin").value=i.rangeMin??"";
  if($("rangeMax")) $("rangeMax").value=i.rangeMax??"";
  if($("unit")) $("unit").value=i.unit||"bar";
  if($("medium")) $("medium").value=i.medium||"";
  if($("calDate")) $("calDate").value=i.calDate||"";

  if($("envTemp")) $("envTemp").value=e.temp??"";
  if($("envHumid")) $("envHumid").value=e.humid??"";
  if($("envAtm")) $("envAtm").value=e.atm??"";

  if($("accClass")) $("accClass").value=a.cls||"";
  if($("sequence")) $("sequence").value=a.seq||"";

  if($("sigTechName")) $("sigTechName").value=s.tech.name||"";
  if($("sigTechTitle")) $("sigTechTitle").value=s.tech.title||"";
  if($("sigTechDate")) $("sigTechDate").value=s.tech.date||"";
  if($("sigRevName")) $("sigRevName").value=s.rev.name||"";
  if($("sigRevTitle")) $("sigRevTitle").value=s.rev.title||"";
  if($("sigRevDate")) $("sigRevDate").value=s.rev.date||"";
  if($("sigAppName")) $("sigAppName").value=s.app.name||"";
  if($("sigAppTitle")) $("sigAppTitle").value=s.app.title||"";
  if($("sigAppDate")) $("sigAppDate").value=s.app.date||"";

  if($("accLimitBar")) $("accLimitBar").value=currentJob.limits.acceptance??"";
  if($("plantLimitBar")) $("plantLimitBar").value=currentJob.limits.plant??"";
  if($("enableCorrection")) $("enableCorrection").value=currentJob.limits.enableCorrection?"Yes":"No";

  renderPoints(); renderStdList();
}

function bindSetupForm(){
  // Accuracy Class → Auto sequence
  const accSel = $("accClass");
  if(accSel){
    accSel.addEventListener("change",()=>{
      const v=val("accClass"); let seq="";
      if(v==="< 0.1%") seq="A (2Up+2Down, 9 pts)";
      else if(v==="0.1% - 0.6%") seq="B (2Up+1Down, 9 pts)";
      else if(v==="> 0.6%") seq="C (1Up+1Down, 5 pts)";
      currentJob.accuracy.cls=v; currentJob.accuracy.seq=seq;
      if($("sequence")) $("sequence").value=seq;
    });
  }

  // Auto points ตามช่วง
  const btnAutoPts = $("btnAutoPoints");
  if(btnAutoPts){
    btnAutoPts.addEventListener("click",()=>{
      const min=parseFloat(val("rangeMin")), max=parseFloat(val("rangeMax")), unit=val("unit");
      if(isNaN(min)||isNaN(max)||max<=min){alert("ช่วงวัดไม่ถูกต้อง");return;}
      const seq=currentJob.accuracy.seq||"",
        perc=(seq.startsWith("A")||seq.startsWith("B"))?[0,12.5,25,37.5,50,62.5,75,87.5,100]:[0,25,50,75,100];
      const minBar=(toBar[unit]||((x)=>x))(min), maxBar=(toBar[unit]||((x)=>x))(max);
      currentJob.accuracy.points=perc.map(p=>+(minBar+(maxBar-minBar)*(p/100)).toFixed(5));
      renderPoints();
    });
  }

  // Save Setup
  const btnSaveSetup = $("btnSaveSetup");
  if(btnSaveSetup){
    btnSaveSetup.addEventListener("click", async ()=>{
      currentJob.customer.company=val("custCompany")||"—";
      currentJob.customer.address=val("custAddr")||"—";
      currentJob.place.company=val("placeDept")||"—";    // Department
      currentJob.place.address=val("placeAddr")||"—";

      currentJob.cert.no=val("certNo")||"—";
      currentJob.cert.received=val("certReceived")||"—";
      currentJob.cert.issue=val("certIssue")||"—";

      const i=currentJob.instrument;
      i.type=val("insType"); i.serial=val("serial"); i.model=val("model"); i.mfg=val("mfg");
      i.rangeMin=parseFloat(val("rangeMin")); i.rangeMax=parseFloat(val("rangeMax")); i.unit=val("unit"); i.medium=val("medium"); i.calDate=val("calDate");

      const e=currentJob.environment;
      e.temp=parseFloat(val("envTemp")); e.humid=parseFloat(val("envHumid")); e.atm=parseFloat(val("envAtm"));

      const s=currentJob.signature;
      s.tech.name=val("sigTechName")||"—"; s.tech.title=val("sigTechTitle")||"—"; s.tech.date=val("sigTechDate")||"—";
      s.rev.name=val("sigRevName")||"—"; s.rev.title=val("sigRevTitle")||"—"; s.rev.date=val("sigRevDate")||"—";
      s.app.name=val("sigAppName")||"—"; s.app.title=val("sigAppTitle")||"—"; s.app.date=val("sigAppDate")||"—";

      currentJob.limits.acceptance=parseFloat(val("accLimitBar"));
      currentJob.limits.plant=parseFloat(val("plantLimitBar"));
      currentJob.limits.enableCorrection=(val("enableCorrection")==="Yes");

      if(!i.type||!i.serial||!i.model||isNaN(i.rangeMin)||isNaN(i.rangeMax)||!i.calDate||currentJob.accuracy.points.length===0){
        alert("กรอกช่องบังคับ + จุดสอบเทียบ");
        return;
      }
      await saveJob(currentJob);
      await refreshDashboard();
      switchPage("entry");
    });
  }

  // Search / New
  $("btnSearch")?.addEventListener("click", refreshDashboard);
  $("btnNew")?.addEventListener("click", ()=>{
    currentJob={...currentJob,id:null,status:"In Progress"};
    currentJob.customer={company:val("factorySelect")||"—",address:"—"};
    fillSetupForm(); switchPage("setup");
  });
}

/***** Entry *****/
function getCycles(){
  const s=currentJob.accuracy.seq||"";
  if(s.startsWith("A"))return{up:2,down:2};
  if(s.startsWith("B"))return{up:2,down:1};
  return{up:1,down:1};
}
function autoBuildEntry(){
  if($("stdName")) $("stdName").value=currentJob.standard.name||"";
  if($("stdSerial")) $("stdSerial").value=currentJob.standard.serial||"";
  if($("stdAcc")) $("stdAcc").value=currentJob.standard.acc??"";
  if($("stdRes")) $("stdRes").value=currentJob.standard.res??"";
  if($("stdCert")) $("stdCert").value=currentJob.standard.cert||"";

  const pts=currentJob.accuracy.points||[]; const cyc=getCycles();
  if(!currentJob.table || currentJob.table.length!==pts.length){
    currentJob.table=pts.map(p=>({point:p,up:Array(cyc.up).fill(null).map(()=>({STD:"",UUC:""})),
      down:Array(cyc.down).fill(null).map(()=>({STD:"",UUC:""})),avgSTD:null,avgUUC:null,dev:null,hyst:null}));
  }
  renderEntryTable(); calcTable();
}
function cell(ri,dir,idx,key){
  const v=currentJob.table[ri][dir][idx][key]||"";
  return `<td><input class="input mcell" data-ri="${ri}" data-dir="${dir}" data-idx="${idx}" data-key="${key}" type="number" step="0.00001" value="${v}"></td>`;
}
function renderEntryTable(){
  const wrap=$("entryTableWrap"); if(!wrap) return;
  const cyc=getCycles();
  let h=`<table class="table"><thead><tr><th>Point (bar)</th>`;
  for(let i=1;i<=cyc.up;i++){h+=`<th>STD (Up${i})</th><th>UUC (Up${i})</th>`}
  for(let i=1;i<=cyc.down;i++){h+=`<th>STD (Down${i})</th><th>UUC (Down${i})</th>`}
  h+=`<th>Avg STD</th><th>Avg UUC</th><th>Deviation</th><th>Hysteresis</th></tr></thead><tbody>`;
  (currentJob.table||[]).forEach((r,ri)=>{
    h+=`<tr><td>${r.point}</td>`;
    for(let i=0;i<cyc.up;i++){h+=cell(ri,'up',i,'STD')+cell(ri,'up',i,'UUC')}
    for(let i=0;i<cyc.down;i++){h+=cell(ri,'down',i,'STD')+cell(ri,'down',i,'UUC')}
    h+=`<td>${r.avgSTD??"-"}</td><td>${r.avgUUC??"-"}</td><td>${r.dev??"-"}</td><td>${r.hyst??"-"}</td></tr>`;
  });
  h+=`</tbody></table>`; wrap.innerHTML=h;

  // bind cell changes
  wrap.addEventListener("change", handleEntryEdit);
  wrap.addEventListener("blur", function(e){ handleEntryEdit(e); calcTable(); }, true);

  // single-click select
  document.addEventListener('pointerdown',(e)=>{
    if(e.target.matches('.mcell')){
      const el=e.target; if(!el.dataset.clicked){ el.focus(); el.select(); el.dataset.clicked=1; }
    }
  });
}
function handleEntryEdit(e){
  if(!e.target.classList.contains("mcell"))return;
  const ri=+e.target.dataset.ri, dir=e.target.dataset.dir, idx=+e.target.dataset.idx, key=e.target.dataset.key;
  const v=e.target.value;
  currentJob.table[ri][dir][idx][key]=(v===""? "": (isNaN(parseFloat(v))? "": parseFloat(v)));
}
function calcTable(){
  const cyc=getCycles();
  (currentJob.table||[]).forEach(r=>{
    const upsSTD=r.up.map(x=>parseFloat(x.STD)).filter(n=>!isNaN(n));
    const upsUUC=r.up.map(x=>parseFloat(x.UUC)).filter(n=>!isNaN(n));
    const dnsSTD=r.down.map(x=>parseFloat(x.STD)).filter(n=>!isNaN(n));
    const dnsUUC=r.down.map(x=>parseFloat(x.UUC)).filter(n=>!isNaN(n));
    let avgSTD=null, avgUUC=null;
    if(cyc.up===2&&cyc.down===1){
      if(upsSTD.length===2&&dnsSTD.length===1) avgSTD=((upsSTD[0]+upsSTD[1])/2 + dnsSTD[0])/2;
      if(upsUUC.length===2&&dnsUUC.length===1) avgUUC=((upsUUC[0]+upsUUC[1])/2 + dnsUUC[0])/2;
    }else{
      const allSTD=upsSTD.concat(dnsSTD), allUUC=upsUUC.concat(dnsUUC);
      if(allSTD.length>0) avgSTD=allSTD.reduce((a,b)=>a+b,0)/allSTD.length;
      if(allUUC.length>0) avgUUC=allUUC.reduce((a,b)=>a+b,0)/allUUC.length;
    }
    const dev=(avgUUC!=null&&avgSTD!=null)? +(avgUUC-avgSTD).toFixed(6):null;
    let hyst=null; if(upsUUC.length>0&&dnsUUC.length>0){
      const upAvg=upsUUC.reduce((a,b)=>a+b,0)/upsUUC.length; const dnAvg=dnsUUC.reduce((a,b)=>a+b,0)/dnsUUC.length; hyst=+(upAvg-dnAvg).toFixed(6);
    }
    r.avgSTD=avgSTD!=null? +avgSTD.toFixed(6):null; r.avgUUC=avgUUC!=null? +avgUUC.toFixed(6):null; r.dev=dev; r.hyst=hyst;
  });
  renderEntryTable();
}
$("btnSaveEntry")?.addEventListener("click",async()=>{
  currentJob.standard.name=val("stdName");
  currentJob.standard.serial=val("stdSerial");
  currentJob.standard.acc=parseFloat(val("stdAcc"));
  currentJob.standard.res=parseFloat(val("stdRes"));
  currentJob.standard.cert=val("stdCert");
  await saveJob(currentJob); refreshDashboard(); switchPage("uncert");
});

/***** Uncertainty & Verdict *****/
function getAcceptanceLimit(){
  const user=currentJob.limits.acceptance;
  if(user!=null && !isNaN(user)) return +(+user).toFixed(6);
  const i=currentJob.instrument, unit=i.unit||"bar";
  const fn=toBar[unit]||((x)=>x);
  const spanBar=fn(i.rangeMax)-fn(i.rangeMin);
  return +(0.001*spanBar).toFixed(6); // default 0.1% FS
}
function calcUncertAndVerdict(){
  const u=currentJob.uncertainty;
  u.ustd=parseFloat(val("u_standard"))||0;
  u.ures=parseFloat(val("u_res_std"))||0;
  u.uzero=parseFloat(val("u_zero"))||0;
  u.urep=parseFloat(val("u_repeat"))||0;
  u.uhyst=parseFloat(val("u_hyst"))||0;
  u.U=+(2*Math.sqrt(u.ustd**2+u.ures**2+u.uzero**2+u.urep**2+u.uhyst**2)).toFixed(6);

  const acceptance=getAcceptanceLimit();
  currentJob.results=(currentJob.table||[]).map(r=>{
    const dev=r.dev ?? 0;
    const errorSpan=Math.abs(dev)+u.U;
    const pass=errorSpan<=acceptance;
    return {point:r.point,deviation:dev,U:u.U,errorSpan:+errorSpan.toFixed(6),pass,std:r.avgSTD,uuc:r.avgUUC};
  });
  currentJob.verdictOverall=currentJob.results.every(x=>x.pass)?"Pass":"Fail";
  currentJob.status="Completed";
  if($("uncertSummary")){
    $("uncertSummary").innerHTML=`U (k=2)=<b>${fmt(u.U)}</b> | Acceptance=${acceptance} bar | ผลรวม: <span class="badge ${currentJob.verdictOverall==='Pass'?'pass':'fail'}">${currentJob.verdictOverall}</span>`;
  }
  makeAutoAnalysis();
}
$("btnAutoFromData")?.addEventListener("click",()=>{
  const zeros=currentJob.table.filter(r=>r.point===0 && r.dev!=null).map(r=>Math.abs(r.dev)), maxZero=zeros.length?Math.max(...zeros):0;
  const acc=parseFloat(currentJob.standard.acc)||0; const res=parseFloat(currentJob.standard.res)||0;
  const devs=currentJob.table.map(r=>r.dev).filter(v=>v!=null); const n=devs.length;
  let sd=0; if(n>1){const mean=devs.reduce((a,b)=>a+b,0)/n; const v=devs.reduce((a,b)=>a+(b-mean)**2,0)/(n-1); sd=Math.sqrt(v);}
  const hs=currentJob.table.map(r=>r.hyst).filter(v=>v!=null); const mH=hs.length? hs.reduce((a,b)=>a+b,0)/hs.length:0;

  if($("u_standard")) $("u_standard").value=(acc/Math.sqrt(3)).toFixed(6);
  if($("u_res_std")) $("u_res_std").value=((res)/(2*Math.sqrt(3))).toFixed(6);
  if($("u_zero")) $("u_zero").value=(maxZero/Math.sqrt(3)).toFixed(6);
  if($("u_repeat")) $("u_repeat").value=((sd)/Math.sqrt(Math.max(1,n))).toFixed(6);
  if($("u_hyst")) $("u_hyst").value=(mH/Math.sqrt(3)).toFixed(6);
  calcUncertAndVerdict();
});
$("btnSaveUncert")?.addEventListener("click",async()=>{calcUncertAndVerdict(); await saveJob(currentJob); refreshDashboard(); switchPage("report");});

/***** Report & Charts *****/
function ensureResults(){
  if(!currentJob.results?.length){
    const acc=getAcceptanceLimit();
    currentJob.results=(currentJob.table||[]).map(r=>({
      point:r.point,
      deviation:r.dev||0,
      U:currentJob.uncertainty.U||0,
      errorSpan:Math.abs(r.dev||0)+(currentJob.uncertainty.U||0),
      pass:(Math.abs(r.dev||0)+(currentJob.uncertainty.U||0))<=acc,
      std:r.avgSTD, uuc:r.avgUUC
    }));
  }
}
function buildResultTable(){
  const i=currentJob.instrument, unit=i.unit||"bar";
  const toBarFn = toBar[unit] || (x=>x);
  const pminBar = toBarFn(parseFloat(i.rangeMin)||0);
  const pmaxBar = toBarFn(parseFloat(i.rangeMax)||0);
  const isTX = (i.type||"").toLowerCase().includes("transmitter");

  const head = `<table class="table"><thead><tr>
    <th>Standard Reading<br>[bar] (1)</th>
    <th>UUC* Reading<br>[mA]</th>
    <th>Calculation Pressure<br>[bar] (2)</th>
    <th>Measurement Deviation<br>[bar] (2)-(1)</th>
    <th>Uncertainty<br>[bar]</th>
    <th>Result<br>[Pass/Fail]</th>
  </tr></thead><tbody>`;

  const rows = (currentJob.results||[]).map((r)=>{
    const stdBar = r.std!=null ? r.std : null;
    let uuc_mA = null, calcP_bar = null;
    if(isTX){
      uuc_mA = (r.uuc!=null ? r.uuc : null);
      if(uuc_mA!=null){
        calcP_bar = pminBar + ((uuc_mA - 4)/(20 - 4)) * (pmaxBar - pminBar);
        calcP_bar = +calcP_bar.toFixed(6);
      }
    }else{
      if(r.uuc!=null) calcP_bar = +(+r.uuc).toFixed(6);
    }
    const dev2 = (calcP_bar!=null && stdBar!=null) ? +(calcP_bar - stdBar).toFixed(6) : (r.deviation!=null? +(+r.deviation).toFixed(6) : null);
    const U = r.U!=null? +(+r.U).toFixed(6) : null;
    const pass = r.pass ? '<span class="badge pass">Pass</span>' : '<span class="badge fail">Fail</span>';
    return `<tr>
      <td>${stdBar!=null?fmt(stdBar):"-"}</td>
      <td>${isTX?(uuc_mA!=null?fmt(uuc_mA):"-"):"-"}</td>
      <td>${calcP_bar!=null?fmt(calcP_bar):"-"}</td>
      <td>${dev2!=null?fmt(dev2):"-"}</td>
      <td>${U!=null?fmt(U):"-"}</td>
      <td>${pass}</td>
    </tr>`;
  }).join("");

  if($("resultTableWrap")) $("resultTableWrap").innerHTML = head + rows + "</tbody></table>";
}
function setTxt(id,text){ const el=$(id); if(el) el.innerText=(text==null||text==="")?"—":text; }
function buildReportHeader(){
  const i=currentJob.instrument, e=currentJob.environment, a=currentJob.accuracy, u=currentJob.uncertainty, s=currentJob.signature;
  setTxt("rCustomer",currentJob.customer.company); setTxt("rCustAddr",currentJob.customer.address);
  setTxt("rPlaceCompany",currentJob.place.company); setTxt("rPlaceAddr",currentJob.place.address);
  setTxt("rCertNo",currentJob.cert.no); setTxt("rReceived",currentJob.cert.received); setTxt("rCalDate",i.calDate||"—"); setTxt("rIssueDate",currentJob.cert.issue||i.calDate||"—");
  setTxt("rType",i.type); setTxt("rModel",i.model); setTxt("rSerial",i.serial); setTxt("rMfg",i.mfg);
  setTxt("rMeasureRange",`${i.rangeMin}–${i.rangeMax} ${i.unit}`);
  setTxt("rCalRange",`${(a.points[0]!=null)?a.points[0]:"-"} … ${(a.points[a.points.length-1]!=null)?a.points[a.points.length-1]:"-"} bar`);
  setTxt("rResolution", currentJob.standard.res!=null? currentJob.standard.res+" bar":"—");
  const acceptance=getAcceptanceLimit(); setTxt("rMPE", acceptance+" bar"); setTxt("rPlantLimit", (currentJob.limits.plant!=null? currentJob.limits.plant+" bar":"—"));
  const verdictEl=$("rVerdict"); if(verdictEl){ verdictEl.innerHTML=`<span class="badge ${currentJob.verdictOverall==='Pass'?'pass':'fail'}">${currentJob.verdictOverall||"—"}</span>`; }
  setTxt("rU",fmt(u.U));
  const t=$("stdBody"); if(t){
    t.innerHTML="";
    const list=(currentJob.standards_used&&currentJob.standards_used.length)? currentJob.standards_used : [{
      serial: currentJob.standard.serial||"—", cert: currentJob.standard.cert||"—", calDate:"—", dueDate:"—", desc: currentJob.standard.name||"—", status:"OK"
    }];
    list.forEach(su=>{const tr=document.createElement("tr"); tr.innerHTML=`<td>${su.serial}</td><td>${su.cert}</td><td>${su.calDate}</td><td>${su.dueDate}</td><td>${su.desc}</td><td>${su.status}</td>`; t.appendChild(tr);});
  }
  setTxt("rAmbT",e.temp??"—"); setTxt("rAmbH",e.humid??"—"); setTxt("rAmbP",e.atm??"—");
  setTxt("sigTechNameOut",s.tech.name); setTxt("sigTechTitleOut",s.tech.title); setTxt("sigTechDateOut",s.tech.date);
  setTxt("sigRevNameOut",s.rev.name); setTxt("sigRevTitleOut",s.rev.title); setTxt("sigRevDateOut",s.rev.date);
  setTxt("sigAppNameOut",s.app.name); setTxt("sigAppTitleOut",s.app.title); setTxt("sigAppDateOut",s.app.date);
}

/***** Charts *****/
let cAcc,cErr,cPlus,cMinus;
function buildCharts(){
  const pts=currentJob.results.map(r=>r.point);
  const devs=currentJob.results.map(r=>r.deviation||0);
  const U=currentJob.results.map(r=>r.U||0);
  const acceptance=getAcceptanceLimit();
  const mpeLine=pts.map(()=>+acceptance.toFixed(6));
  const mpeLineNeg=pts.map(()=>-+acceptance.toFixed(6));

  if(cAcc) cAcc.destroy(); if(cErr) cErr.destroy(); if(cPlus) cPlus.destroy(); if(cMinus) cMinus.destroy();

  if(typeof Chart==="undefined") return;

  cAcc=new Chart($("chartAccuracy"),{type:"line",data:{labels:pts,datasets:[
    {label:"±0.3%FS (ตัวอย่าง)",data:pts.map(()=>0),borderDash:[6,6],pointRadius:0}
  ]},options:{responsive:true}});

  cErr=new Chart($("chartError"),{type:"line",data:{labels:pts,datasets:[
    {label:"Error (Deviation)",data:devs},
    {label:"+MPE (Acceptance)",data:mpeLine,borderDash:[6,6],pointRadius:0},
    {label:"-MPE (Acceptance)",data:mpeLineNeg,borderDash:[6,6],pointRadius:0}
  ]},options:{responsive:true}});

  const errPlus=devs.map((d,i)=>d+(U[i]||0));
  const errMinus=devs.map((d,i)=>d-(U[i]||0));
  cPlus=new Chart($("chartErrPlusU"),{type:"line",data:{labels:pts,datasets:[
    {label:"Error + U(k=2)",data:errPlus},
    {label:"+MPE",data:mpeLine,borderDash:[6,6],pointRadius:0}
  ]},options:{responsive:true}});
  cMinus=new Chart($("chartErrMinusU"),{type:"line",data:{labels:pts,datasets:[
    {label:"Error - U(k=2)",data:errMinus},
    {label:"-MPE",data:mpeLineNeg,borderDash:[6,6],pointRadius:0}
  ]},options:{responsive:true}});

  if($("aiCharts")){
    $("aiCharts").innerHTML =
      `<ul>
        <li>เส้น +MPE / -MPE คือเกณฑ์ยอมรับ (Acceptance)</li>
        <li>จุดที่ Error ±U ทะลุเส้น MPE คือ “ไม่ผ่าน”</li>
        <li>ดูแนวโน้มความผิดพลาดและฮิสเทอรีซีสเพื่อแนะนำการชดเชย</li>
      </ul>`;
  }
}
function makeAICharts(){
  const pts=currentJob.results.map(r=>r.point), errs=currentJob.results.map(r=>r.errorSpan);
  const acceptance=getAcceptanceLimit();
  const crossM=pts.filter((p,i)=>errs[i]>acceptance);
  const bullets=[
    `กราฟ Accuracy: เส้นประระดับ ±Accuracy อ้างอิง FS`,
    `กราฟ Error: ตรวจแนวโน้ม/เบี่ยงเบนศูนย์`,
    `กราฟ Error+U และ Error−U: ใช้ประเมินขอบเขตความเชื่อมั่นเทียบกับเกณฑ์`,
    `จุดเกิน MPE: ${crossM.length? crossM.join(", ")+" bar":"ไม่มี"}`
  ];
  if($("aiCharts")) $("aiCharts").innerHTML = `<ul><li>${bullets.join("</li><li>")}</li></ul>`;
}
function makeAutoAnalysis(){
  const i=currentJob.instrument, a=currentJob.accuracy, u=currentJob.uncertainty;
  const acceptance=getAcceptanceLimit();
  const devs=currentJob.results.map(r=>r.deviation||0), pts=currentJob.results.map(r=>r.point||0);
  const overMPE=currentJob.results.filter(x=>x.errorSpan>acceptance);
  const meanDev=(devs.length? devs.reduce((a,b)=>a+b,0)/devs.length : 0);
  const hMean=(currentJob.table.map(r=>r.hyst).filter(v=>v!=null).reduce((s,v)=>s+v,0) / (currentJob.table.filter(r=>r.hyst!=null).length||1)) || 0;
  let slope=0, intercept=0; if(pts.length>1){
    const n=pts.length; const sx=pts.reduce((a,b)=>a+b,0), sy=devs.reduce((a,b)=>a+b,0);
    const sxy=pts.reduce((a,_,k)=>a+pts[k]*devs[k],0); const sx2=pts.reduce((a,b)=>a+b*b,0); const den=(n*sx2 - sx*sx)||1;
    slope=(n*sxy - sx*sy)/den; intercept=(sy - slope*sx)/n;
  }
  const lines=[];
  lines.push(`<b>สรุป</b>: ${i.type||"-"} รุ่น ${i.model||"-"} S/N ${i.serial||"-"} ช่วง ${i.rangeMin}–${i.rangeMax} ${i.unit} | Sequence ${a.seq||"-"}`);
  lines.push(`U (k=2) = ${fmt(u.U)} | MPE = ${acceptance} bar`);
  lines.push(`Deviation เฉลี่ย ≈ ${fmt(meanDev)} | Hysteresis เฉลี่ย ≈ ${fmt(hMean)} | แนวโน้ม ≈ ${fmt(slope)} bar/bar`);
  if(overMPE.length===0){lines.push(`<span class="badge pass">PASS</span> — ทุกจุดใต้ MPE`);}
  else {const w=overMPE.reduce((m,x)=>x.errorSpan>m.errorSpan?x:m,{errorSpan:-Infinity}); lines.push(`<span class="badge fail">FAIL</span> — เกิน MPE ${overMPE.length} จุด (แย่สุด ${fmt(w.point)} bar, Span=${fmt(w.errorSpan)})`);}
  if(currentJob.limits.enableCorrection){
    if(Math.abs(slope)<(0.02*acceptance)) lines.push(`<b>แนะนำค่าแก้ Offset</b>: c = −mean(dev) = ${fmt(-meanDev)} → Reading_corr = Reading + c`);
    else lines.push(`<b>แนะนำ Linear</b>: a=${fmt(-slope)}, b=${fmt(-intercept)} → Reading_corr = Reading + (a·Point + b)`);
  }
  if($("aiNote")) $("aiNote").innerHTML=`<div>${lines.join("<br>")}</div>`;
}

/***** Export PDF/CSV/Drive *****/
$("btnMakePDF")?.addEventListener("click",async()=>{
  buildReportHeader(); ensureResults(); buildResultTable(); makeAutoAnalysis();
  if(typeof jspdf==="undefined" || typeof html2canvas==="undefined"){ alert("ขาด jsPDF หรือ html2canvas"); return; }
  const doc=new jspdf.jsPDF({unit:"pt",format:"a4"});
  const node=$("reportCard"); const canvas=await html2canvas(node,{scale:2,background:"#ffffff"});
  const img=canvas.toDataURL("image/png"); const pageW=doc.internal.pageSize.getWidth();
  const imgW=pageW-40; const imgH=canvas.height*(imgW/canvas.width);
  doc.addImage(img,"PNG",20,20,imgW,imgH); doc.save(`Calibration_${currentJob.instrument.serial||"report"}.pdf`);
});

// ===== Export CSV (FIXED) =====
$("btnCSV")?.addEventListener("click", () => {
  const head = ","UUC","Dev[bar](2-1)","U[bar]","Result"];
  const lines = [head.join(",")];

  const i = currentJob.instrument, unit = i.unit || "bar";
  const toBarFn = toBar[unit] || (x => x);
  const pminBar = toBarFn(parseFloat(i.rangeMin) || 0);
  const pmaxBar = toBarFn(parseFloat(i.rangeMax) || 0);
  const isTX = (i.type || "").toLowerCase().includes("transmitter");

  (currentJob.results || []).forEach((r) => {
    const stdBar = r.std ?? null;
    let uuc_mA = null, calcP_bar = null;

    if (isTX) {
      uuc_mA = r.uuc ?? null;
      if (uuc_mA != null) {
        calcP_bar = pminBar + ((uuc_mA - 4) / 16) * (pmaxBar - pminBar);
        calcP_bar = +calcP_bar.toFixed(6);
      }
    } else {
      if (r.uuc != null) calcP_bar = +(+r.uuc).toFixed(6);
    }

    const dev2 = (calcP_bar != null && stdBar != null)
      ? +(calcP_bar - stdBar).toFixed(6)
      : (r.deviation != null ? +(+r.deviation).toFixed(6) : null);

    const out = [
      stdBar != null ? fmt(stdBar) : "-",
      isTX ? (uuc_mA != null ? fmt(uuc_mA) : "-") : "-",
      calcP_bar != null ? fmt(calcP_bar) : "-",
      dev2 != null ? fmt(dev2) : "-",
      r.U != null ? fmt(r.U) : "-",
      r.pass ? "PASS" : "FAIL"
    ];
    lines.push(out.join(","));
  });

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Calibration_${currentJob.instrument.serial || "data"}.csv`;
  a.click();
});

async function exportJobToDrive(job){
  const url = "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";
  if(url.startsWith("PASTE_")){ alert("โปรดตั้งค่า Apps Script URL ใน js/app.js ก่อน"); return; }
  const res = await fetch(url, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(job) });
  const j = await res.json();
  if(!j.ok) throw new Error(j.error || "Export failed");
  alert("ส่งออกไป Google Drive แล้ว: "+ (j.file||""));
}
$("btnDrive")?.addEventListener("click", async ()=>{
  try{ buildReportHeader(); ensureResults(); await exportJobToDrive(currentJob); }
  catch(e){ alert("ส่งออกล้มเหลว: "+e.message); }
});

/***** Standards used (ตัดให้เหลือเฉพาะ render/del ที่ใช้ในฟอร์มเดิม) *****/
function renderStdList(){
  const tb=$("stdList"); if(!tb) return;
  tb.innerHTML="";
  (currentJob.standards_used||[]).forEach((s,idx)=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${s.serial}</td><td>${s.cert}</td><td>${s.calDate}</td><td>${s.dueDate}</td><td>${s.desc}</td><td>${s.status}</td>
    <td><button class="btn fail" onclick="delStd(${idx})">ลบ</button></td>`;
    tb.appendChild(tr);
  });
}
window.delStd=(idx)=>{currentJob.standards_used.splice(idx,1); renderStdList();};

/***** Boot *****/
function hardEnsureDashboardVisibleOnce(){
  // ถ้าหน้าไหนไม่พบ ให้ default ไป dashboard
  let initial = "dashboard";
  if(location.hash){
    const h=location.hash.slice(1);
    if(PAGES.includes(h)) initial = h;
  }
  switchPage(initial);
}

// เริ่มทำงานหลัง DOM พร้อม
document.addEventListener("DOMContentLoaded", ()=>{
  bindTabs();
  bindTagButtons();
  bindSetupForm();
  populateMastersIfReady();
  refreshDashboard();
  hardEnsureDashboardVisibleOnce();
});
