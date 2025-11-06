/* ===== Utilities & State ===== */
const pages=["dashboard","setup","entry","uncert","report","charts","help"];
const toBar={"bar":v=>v,"kPa":v=>v/100,"Pa":v=>v/100000,"psi":v=>v*0.0689476,"mmHg":v=>v*0.00133322};

function $(id){return document.getElementById(id)}
function val(id){return $(id).value}
function num(id){const v=parseFloat(val(id));return isNaN(v)?null:v;}
function fmt(v){return (v==null||isNaN(v))?"-":(+v).toFixed(6)}

let currentJob={
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
  place:{department:"—",address:"—"},
  cert:{no:"—",received:"—",issue:"—"},
  signature:{tech:{name:"—",title:"—",date:"—"},rev:{name:"—",title:"—",date:"—"},app:{name:"—",title:"—",date:"—"}},
  limits:{acceptance:null,plant:null,enableCorrection:true}
};

// ฟังก์ชันสำหรับการสลับหน้า
function switchPage(p){
  document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.page===p));
  pages.forEach(id=>$("page-"+id).classList.toggle("hidden",id!==p));
  location.hash=p;
  
  if(p==="entry"){ autoBuildEntry(); }
  if(p==="report"){ buildReportHeader(); ensureResults(); buildResultTable(); makeAutoAnalysis(); }
  if(p==="charts"){ ensureResults(); buildCharts(); makeAICharts(); }
}

// ฟังก์ชันสำหรับการเริ่มต้นระบบ
function initApp() {
  // ตรวจสอบว่ามี hash ใน URL หรือไม่
  if(location.hash){
    const h=location.hash.slice(1); 
    if(pages.includes(h)) switchPage(h);
  } else {
    // ถ้าไม่มี ให้แสดงหน้า dashboard
    switchPage("dashboard");
  }
  
  // เริ่มต้น dropdown ทั้งหมด
  initSearchableDropdowns();
  initFactoryDropdown();
  
  // โหลดข้อมูล jobs
  refreshDashboard();
}

// แก้ไขฟังก์ชัน initFactoryDropdown
function initFactoryDropdown() {
    const factoryInput = $("factorySelect");
    const factoryDropdown = $("factoryDropdown");
    
    if (!factoryInput || !factoryDropdown) return;
    
    // แสดง dropdown เมื่อคลิกที่ input
    factoryInput.addEventListener("click", function(e) {
        e.stopPropagation();
        factoryDropdown.innerHTML = "";
        
        // แสดงทุกบริษัทเมื่อคลิก
        masterData.companies.forEach(company => {
            const div = document.createElement("div");
            div.textContent = company;
            div.addEventListener("click", function(e) {
                e.stopPropagation();
                factoryInput.value = company;
                factoryDropdown.classList.remove("show");
            });
            factoryDropdown.appendChild(div);
        });
        
        factoryDropdown.classList.add("show");
    });
    
    // ป้องกันการปิด dropdown เมื่อคลิกภายใน dropdown
    factoryDropdown.addEventListener("click", function(e) {
        e.stopPropagation();
    });
    
    // แสดง dropdown เมื่อพิมพ์
    factoryInput.addEventListener("input", function() {
        const value = this.value.toLowerCase();
        factoryDropdown.innerHTML = "";
        
        if (value.length < 1) {
            // แสดงทุกบริษัทเมื่อไม่มีการพิมพ์
            masterData.companies.forEach(company => {
                const div = document.createElement("div");
                div.textContent = company;
                div.addEventListener("click", function(e) {
                    e.stopPropagation();
                    factoryInput.value = company;
                    factoryDropdown.classList.remove("show");
                });
                factoryDropdown.appendChild(div);
            });
            factoryDropdown.classList.add("show");
            return;
        }
        
        const filtered = masterData.companies.filter(company => 
            company.toLowerCase().includes(value)
        );
        
        filtered.forEach(company => {
            const div = document.createElement("div");
            div.textContent = company;
            div.addEventListener("click", function(e) {
                e.stopPropagation();
                factoryInput.value = company;
                factoryDropdown.classList.remove("show");
            });
            factoryDropdown.appendChild(div);
        });
        
        if (filtered.length > 0) {
            factoryDropdown.classList.add("show");
        }
    });
}

// แก้ไขฟังก์ชัน initSearchableDropdowns สำหรับหน้า Setup
function initSearchableDropdowns() {
    // Company dropdown
    const companyInput = $("custCompany");
    const companyDropdown = $("custCompanyDropdown");
    
    if (companyInput && companyDropdown) {
        // แสดง dropdown เมื่อคลิกที่ input
        companyInput.addEventListener("click", function(e) {
            e.stopPropagation();
            companyDropdown.innerHTML = "";
            
            // แสดงทุกบริษัทเมื่อคลิก
            masterData.companies.forEach(company => {
                const div = document.createElement("div");
                div.textContent = company;
                div.addEventListener("click", function(e) {
                    e.stopPropagation();
                    companyInput.value = company;
                    companyDropdown.classList.remove("show");
                });
                companyDropdown.appendChild(div);
            });
            
            companyDropdown.classList.add("show");
        });
        
        // ป้องกันการปิด dropdown เมื่อคลิกภายใน dropdown
        companyDropdown.addEventListener("click", function(e) {
            e.stopPropagation();
        });
        
        companyInput.addEventListener("input", function() {
            const value = this.value.toLowerCase();
            companyDropdown.innerHTML = "";
            
            if (value.length < 1) {
                // แสดงทุกบริษัทเมื่อไม่มีการพิมพ์
                masterData.companies.forEach(company => {
                    const div = document.createElement("div");
                    div.textContent = company;
                    div.addEventListener("click", function(e) {
                        e.stopPropagation();
                        companyInput.value = company;
                        companyDropdown.classList.remove("show");
                    });
                    companyDropdown.appendChild(div);
                });
                companyDropdown.classList.add("show");
                return;
            }
            
            const filtered = masterData.companies.filter(company => 
                company.toLowerCase().includes(value)
            );
            
            filtered.forEach(company => {
                const div = document.createElement("div");
                div.textContent = company;
                div.addEventListener("click", function(e) {
                    e.stopPropagation();
                    companyInput.value = company;
                    companyDropdown.classList.remove("show");
                });
                companyDropdown.appendChild(div);
            });
            
            if (filtered.length > 0) {
                companyDropdown.classList.add("show");
            }
        });
    }
    
    // Address dropdown
    const addressInput = $("custAddr");
    const addressDropdown = $("custAddrDropdown");
    
    if (addressInput && addressDropdown) {
        // แสดง dropdown เมื่อคลิกที่ input
        addressInput.addEventListener("click", function(e) {
            e.stopPropagation();
            addressDropdown.innerHTML = "";
            
            // แสดงทุกที่อยู่เมื่อคลิก
            masterData.addresses.forEach(address => {
                const div = document.createElement("div");
                div.textContent = address;
                div.addEventListener("click", function(e) {
                    e.stopPropagation();
                    addressInput.value = address;
                    addressDropdown.classList.remove("show");
                });
                addressDropdown.appendChild(div);
            });
            
            addressDropdown.classList.add("show");
        });
        
        // ป้องกันการปิด dropdown เมื่อคลิกภายใน dropdown
        addressDropdown.addEventListener("click", function(e) {
            e.stopPropagation();
        });
        
        addressInput.addEventListener("input", function() {
            const value = this.value.toLowerCase();
            addressDropdown.innerHTML = "";
            
            if (value.length < 1) {
                // แสดงทุกที่อยู่เมื่อไม่มีการพิมพ์
                masterData.addresses.forEach(address => {
                    const div = document.createElement("div");
                    div.textContent = address;
                    div.addEventListener("click", function(e) {
                        e.stopPropagation();
                        addressInput.value = address;
                        addressDropdown.classList.remove("show");
                    });
                    addressDropdown.appendChild(div);
                });
                addressDropdown.classList.add("show");
                return;
            }
            
            const filtered = masterData.addresses.filter(address => 
                address.toLowerCase().includes(value)
            );
            
            filtered.forEach(address => {
                const div = document.createElement("div");
                div.textContent = address;
                div.addEventListener("click", function(e) {
                    e.stopPropagation();
                    addressInput.value = address;
                    addressDropdown.classList.remove("show");
                });
                addressDropdown.appendChild(div);
            });
            
            if (filtered.length > 0) {
                addressDropdown.classList.add("show");
            }
        });
    }
    
    // Department dropdown
    const departmentInput = $("placeDepartment");
    const departmentDropdown = $("placeDepartmentDropdown");
    
    if (departmentInput && departmentDropdown) {
        // แสดง dropdown เมื่อคลิกที่ input
        departmentInput.addEventListener("click", function(e) {
            e.stopPropagation();
            departmentDropdown.innerHTML = "";
            
            // แสดงทุกแผนกเมื่อคลิก
            masterData.departments.forEach(department => {
                const div = document.createElement("div");
                div.textContent = department;
                div.addEventListener("click", function(e) {
                    e.stopPropagation();
                    departmentInput.value = department;
                    departmentDropdown.classList.remove("show");
                });
                departmentDropdown.appendChild(div);
            });
            
            departmentDropdown.classList.add("show");
        });
        
        // ป้องกันการปิด dropdown เมื่อคลิกภายใน dropdown
        departmentDropdown.addEventListener("click", function(e) {
            e.stopPropagation();
        });
        
        departmentInput.addEventListener("input", function() {
            const value = this.value.toLowerCase();
            departmentDropdown.innerHTML = "";
            
            if (value.length < 1) {
                // แสดงทุกแผนกเมื่อไม่มีการพิมพ์
                masterData.departments.forEach(department => {
                    const div = document.createElement("div");
                    div.textContent = department;
                    div.addEventListener("click", function(e) {
                        e.stopPropagation();
                        departmentInput.value = department;
                        departmentDropdown.classList.remove("show");
                    });
                    departmentDropdown.appendChild(div);
                });
                departmentDropdown.classList.add("show");
                return;
            }
            
            const filtered = masterData.departments.filter(department => 
                department.toLowerCase().includes(value)
            );
            
            filtered.forEach(department => {
                const div = document.createElement("div");
                div.textContent = department;
                div.addEventListener("click", function(e) {
                    e.stopPropagation();
                    departmentInput.value = department;
                    departmentDropdown.classList.remove("show");
                });
                departmentDropdown.appendChild(div);
            });
            
            if (filtered.length > 0) {
                departmentDropdown.classList.add("show");
            }
        });
    }
    
    // Close dropdowns when clicking outside
    document.addEventListener("click", function(event) {
        if (!event.target.matches('.input')) {
            const dropdowns = document.getElementsByClassName("dropdown-content");
            for (let i = 0; i < dropdowns.length; i++) {
                dropdowns[i].classList.remove("show");
            }
        }
    });
}

// Event Listeners
document.addEventListener("DOMContentLoaded", function() {
  // เริ่มต้นแอปพลิเคชัน
  initApp();
  
  // Event listener สำหรับการเปลี่ยนหน้า
  $("nav").addEventListener("click",e=>{ 
    if(e.target.classList.contains("tab")) switchPage(e.target.dataset.page); 
  });
  
  // Event listeners อื่นๆ
  $("btnSearch").addEventListener("click",refreshDashboard);
  $("btnNew").addEventListener("click",()=>{
    currentJob={...currentJob,id:null,status:"In Progress"};
    currentJob.customer={company:val("factorySelect")||"—",address:"—"};
    fillSetupForm(); 
    switchPage("setup");
  });
  
  $("chkAll").addEventListener("change",e=>{ 
    document.querySelectorAll(".chkRow").forEach(c=>c.checked=e.target.checked); 
  });
  
  $("btnPrintTag").addEventListener("click",async()=>{
    const jobs=await loadJobs();
    const ids=[...document.querySelectorAll(".chkRow:checked")].map(x=>x.dataset.id);
    const sel=jobs.filter(j=>ids.includes(j.id));
    
    if(sel.length===0){ 
      alert("กรุณาเลือกงานในตารางก่อน"); 
      return; 
    }
    
    const tagList=$("tagList"); 
    tagList.innerHTML="";
    
    sel.forEach((j,i)=>{
      const qp="qr_"+i, 
            U=j.uncertainty?.U??0,
            dev0=(j.table||[]).find(r=>r.point===0)?.dev ?? (j.results||[]).find(r=>r.point===0)?.deviation ?? 0,
            errSpan0=Math.abs(dev0)+(U||0);
            
      const div=document.createElement("div"); 
      div.className="tag";
      div.innerHTML=`
        <div class="h">${j.instrument?.type||"-"}</div>
        <div class="l">Model: ${j.instrument?.model||"-"} | S/N: ${j.instrument?.serial||"-"}</div>
        <div class="l">Range: ${j.instrument?.rangeMin}–${j.instrument?.rangeMax} ${j.instrument?.unit}</div>
        <div class="l">Date: ${j.instrument?.calDate||"-"} | Verdict: ${j.verdictOverall?`<span class="badge ${j.verdictOverall==='Pass'?'pass':'fail'}">${j.verdictOverall}</span>`:"-"}</div>
        <div class="l"><b>Error@0</b>: Dev=${fmt(dev0)} | U=${fmt(U)} | Span=${fmt(errSpan0)}</div>
        <div id="${qp}" style="width:80px;height:80px;margin-top:6px"></div>`;
      tagList.appendChild(div);
      new QRCode($(qp),{text:j.id||"local",width:80,height:80});
    });
    
    $("tagArea").classList.remove("hidden");
    $("tagArea").scrollIntoView({behavior:"smooth"});
  });

  $("btnCloseTag").addEventListener("click",()=>$("tagArea").classList.add("hidden"));
});
/* ===== Data Management Functions ===== */
async function saveJob(job){
  const l=JSON.parse(localStorage.getItem("cal_jobs")||"[]"); 
  if(!job.id){
    job.id="local_"+Date.now(); 
    l.push(job);
  } else{
    const i=l.findIndex(x=>x.id===job.id); 
    if(i>=0) l[i]=job; 
    else l.push(job);
  } 
  localStorage.setItem("cal_jobs",JSON.stringify(l)); 
  return job.id;
}

async function loadJobs(){
  return JSON.parse(localStorage.getItem("cal_jobs")||"[]")
}

async function deleteJob(id){
  const l=(await loadJobs()).filter(x=>x.id!==id); 
  localStorage.setItem("cal_jobs",JSON.stringify(l)); 
  refreshDashboard();
}

async function refreshDashboard(){
  const jobs=await loadJobs(), 
        txt=(val("searchText")||"").toLowerCase(), 
        st=val("filterStatus");
        
  const filtered=jobs.filter(j=>{
    const s1=!txt || (j.instrument?.model||"").toLowerCase().includes(txt) || (j.instrument?.serial||"").toLowerCase().includes(txt) || (j.customer?.company||"").toLowerCase().includes(txt);
    const s2=!st || j.status===st || j.verdictOverall===st; 
    return s1&&s2;
  });
  
  $("kpi-total").innerText=jobs.length;
  $("kpi-progress").innerText=jobs.filter(x=>x.status==="In Progress").length;
  $("kpi-completed").innerText=jobs.filter(x=>x.status==="Completed").length;
  $("kpi-pass").innerText=jobs.filter(x=>x.verdictOverall==="Pass").length;
  $("kpi-fail").innerText=jobs.filter(x=>x.verdictOverall==="Fail").length;

  const tb=$("jobsBody"); 
  tb.innerHTML="";
  
  filtered.forEach(j=>{
    const tr=document.createElement("tr");
    const badge=j.verdictOverall?`<span class="badge ${j.verdictOverall==='Pass'?'pass':'fail'}">${j.verdictOverall}</span>`:"-";
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
}

function loadIntoEditor(j){ 
  currentJob=JSON.parse(JSON.stringify(j)); 
  fillSetupForm(); 
  switchPage("setup"); 
}

function cloneJob(id){ 
  loadJobs().then(l=>{
    const j=l.find(x=>x.id===id); 
    if(!j) return; 
    const c=JSON.parse(JSON.stringify(j)); 
    c.id=null; 
    c.status="In Progress"; 
    c.verdictOverall=""; 
    currentJob=c; 
    fillSetupForm(); 
    switchPage("setup");
  });
}
/* ===== Setup Functions ===== */
function fillSetupForm(){
  const i=currentJob.instrument, 
        e=currentJob.environment, 
        a=currentJob.accuracy, 
        s=currentJob.signature;
        
  $("custCompany").value=currentJob.customer.company||"";
  $("custAddr").value=currentJob.customer.address||"";
  $("placeDepartment").value=currentJob.place.department||"";
  $("certNo").value=currentJob.cert.no||"";
  $("certReceived").value=currentJob.cert.received||"";
  $("certIssue").value=currentJob.cert.issue||"";
  $("insType").value=i.type||""; 
  $("serial").value=i.serial||""; 
  $("model").value=i.model||"";
  $("mfg").value=i.mfg||""; 
  $("rangeMin").value=i.rangeMin??""; 
  $("rangeMax").value=i.rangeMax??"";
  $("unit").value=i.unit||"bar"; 
  $("medium").value=i.medium||""; 
  $("calDate").value=i.calDate||"";
  $("envTemp").value=e.temp??""; 
  $("envHumid").value=e.humid??""; 
  $("envAtm").value=e.atm??"";
  $("accClass").value=a.cls||""; 
  $("sequence").value=a.seq||"";
  $("sigTechName").value=s.tech.name||""; 
  $("sigTechTitle").value=s.tech.title||""; 
  $("sigTechDate").value=s.tech.date||"";
  $("sigRevName").value=s.rev.name||""; 
  $("sigRevTitle").value=s.rev.title||""; 
  $("sigRevDate").value=s.rev.date||"";
  $("sigAppName").value=s.app.name||""; 
  $("sigAppTitle").value=s.app.title||""; 
  $("sigAppDate").value=s.app.date||"";
  $("accLimitBar").value=currentJob.limits.acceptance??""; 
  $("plantLimitBar").value=currentJob.limits.plant??"";
  $("enableCorrection").value=currentJob.limits.enableCorrection?"Yes":"No";
  renderPoints(); 
  renderStdList();
}

// Event Listeners for Setup
document.addEventListener("DOMContentLoaded", function() {
  $("accClass").addEventListener("change",()=>{
    const v=val("accClass"); 
    let seq="";
    if(v==="< 0.1%") seq="A (2Up+2Down, 9 pts)";
    else if(v==="0.1% - 0.6%") seq="B (2Up+1Down, 9 pts)";
    else if(v==="> 0.6%") seq="C (1Up+1Down, 5 pts)";
    currentJob.accuracy.cls=v; 
    currentJob.accuracy.seq=seq; 
    $("sequence").value=seq;
  });

  $("btnAutoPoints").addEventListener("click",()=>{
    const min=parseFloat(val("rangeMin")), 
          max=parseFloat(val("rangeMax")), 
          unit=val("unit");
          
    if(isNaN(min)||isNaN(max)||max<=min){
      alert("ช่วงวัดไม่ถูกต้อง");
      return;
    }
    
    const seq=currentJob.accuracy.seq||"", 
          perc=(seq.startsWith("A")||seq.startsWith("B"))?[0,12.5,25,37.5,50,62.5,75,87.5,100]:[0,25,50,75,100];
    const minBar=(toBar[unit]||((x)=>x))(min), 
          maxBar=(toBar[unit]||((x)=>x))(max);
          
    currentJob.accuracy.points=perc.map(p=>+(minBar+(maxBar-minBar)*(p/100)).toFixed(5));
    renderPoints();
  });

  $("btnClearPoints").addEventListener("click",()=>{
    currentJob.accuracy.points=[];
    renderPoints();
  });

  $("addStdRow").addEventListener("click",()=>{
    const row={
      serial:val("stdIn_serial")||"—", 
      cert:val("stdIn_cert")||"—", 
      calDate:val("stdIn_calDate")||"—",
      dueDate:val("stdIn_dueDate")||"—", 
      desc:val("stdIn_desc")||"—", 
      status:val("stdIn_status")||"OK"
    };
    currentJob.standards_used.push(row); 
    renderStdList();
    ["stdIn_serial","stdIn_cert","stdIn_calDate","stdIn_dueDate","stdIn_desc"].forEach(id=>$(id).value="");
  });

  $("btnSaveSetup").addEventListener("click",async()=>{
    currentJob.customer.company=val("custCompany")||"—"; 
    currentJob.customer.address=val("custAddr")||"—";
    currentJob.place.department=val("placeDepartment")||"—"; 
    currentJob.cert.no=val("certNo")||"—"; 
    currentJob.cert.received=val("certReceived")||"—"; 
    currentJob.cert.issue=val("certIssue")||"—";
    
    const i=currentJob.instrument;
    i.type=val("insType"); 
    i.serial=val("serial"); 
    i.model=val("model"); 
    i.mfg=val("mfg");
    i.rangeMin=num("rangeMin"); 
    i.rangeMax=num("rangeMax"); 
    i.unit=val("unit"); 
    i.medium=val("medium"); 
    i.calDate=val("calDate");
    
    const e=currentJob.environment; 
    e.temp=num("envTemp"); 
    e.humid=num("envHumid"); 
    e.atm=num("envAtm");
    
    const s=currentJob.signature;
    s.tech.name=val("sigTechName")||"—"; 
    s.tech.title=val("sigTechTitle")||"—"; 
    s.tech.date=val("sigTechDate")||"—";
    s.rev.name=val("sigRevName")||"—"; 
    s.rev.title=val("sigRevTitle")||"—"; 
    s.rev.date=val("sigRevDate")||"—";
    s.app.name=val("sigAppName")||"—"; 
    s.app.title=val("sigAppTitle")||"—"; 
    s.app.date=val("sigAppDate")||"—";
    
    currentJob.limits.acceptance=num("accLimitBar"); 
    currentJob.limits.plant=num("plantLimitBar"); 
    currentJob.limits.enableCorrection=(val("enableCorrection")==="Yes");

    if(!i.type||!i.serial||!i.model||isNaN(i.rangeMin)||isNaN(i.rangeMax)||!i.calDate||currentJob.accuracy.points.length===0){
      alert("กรอกช่องบังคับ + จุดสอบเทียบ");
      return;
    }
    
    await saveJob(currentJob); 
    await refreshDashboard(); 
    switchPage("entry");
  });
});

function renderPoints(){
  const box=$("pointsBox"); 
  box.innerHTML="";
  
  currentJob.accuracy.points.forEach((v,i)=>{
    const d=document.createElement("div");
    d.innerHTML=`<label>Point ${i+1} (bar)</label>
    <div class="row">
      <input class="input" type="number" step="0.00001" value="${v}" oninput="updatePoint(${i},this.value)">
      <button class="btn warn" onclick="removePoint(${i})">ลบ</button>
    </div>`;
    box.appendChild(d);
  });
  
  const add=document.createElement("div");
  add.innerHTML=`<label>เพิ่มจุด (bar)</label>
    <div class="row">
      <input class="input" id="newPointVal" type="number" step="0.00001" placeholder="1.25">
      <button class="btn ghost" onclick="addPoint()">เพิ่ม</button>
    </div>`;
  box.appendChild(add);
}

window.updatePoint=(i,v)=>currentJob.accuracy.points[i]=parseFloat(v)||0;
window.removePoint=(i)=>{currentJob.accuracy.points.splice(i,1); renderPoints();};
window.addPoint=()=>{
  const v=parseFloat(val("newPointVal")); 
  if(isNaN(v))return; 
  currentJob.accuracy.points.push(v); 
  renderPoints();
};

function renderStdList(){
  const tb=$("stdList"); 
  tb.innerHTML="";
  
  (currentJob.standards_used||[]).forEach((s,idx)=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${s.serial}</td><td>${s.cert}</td><td>${s.calDate}</td><td>${s.dueDate}</td><td>${s.desc}</td><td>${s.status}</td>
    <td><button class="btn fail" onclick="delStd(${idx})">ลบ</button></td>`;
    tb.appendChild(tr);
  });
}

window.delStd=(idx)=>{currentJob.standards_used.splice(idx,1); renderStdList();};
/* ===== Entry Functions ===== */
function getCycles(){
  const s=currentJob.accuracy.seq||""; 
  if(s.startsWith("A"))return{up:2,down:2}; 
  if(s.startsWith("B"))return{up:2,down:1}; 
  return{up:1,down:1};
}

function autoBuildEntry(){
  $("stdName").value=currentJob.standard.name||"";
  $("stdSerial").value=currentJob.standard.serial||"";
  $("stdAcc").value=currentJob.standard.acc??"";
  $("stdRes").value=currentJob.standard.res??"";
  $("stdCert").value=currentJob.standard.cert||"";
  
  const pts=currentJob.accuracy.points||[]; 
  const cyc=getCycles();
  
  if(!currentJob.table || currentJob.table.length!==pts.length){
    currentJob.table=pts.map(p=>({
      point:p,
      up:Array(cyc.up).fill(null).map(()=>({STD:"",UUC:""})),
      down:Array(cyc.down).fill(null).map(()=>({STD:"",UUC:""})),
      avgSTD:null,
      avgUUC:null,
      dev:null,
      hyst:null
    }));
  }
  
  renderEntryTable(); 
  calcTable();
}

function renderEntryTable(){
  const wrap=$("entryTableWrap"); 
  const cyc=getCycles();
  let h=`<table class="table"><thead><tr><th>Point (bar)</th>`;
  
  for(let i=1;i<=cyc.up;i++){
    h+=`<th>STD (Up${i})</th><th>UUC (Up${i})</th>`
  }
  
  for(let i=1;i<=cyc.down;i++){
    h+=`<th>STD (Down${i})</th><th>UUC (Down${i})</th>`
  }
  
  h+=`<th>Avg STD</th><th>Avg UUC</th><th>Deviation</th><th>Hysteresis</th></tr></thead><tbody>`;
  
  currentJob.table.forEach((r,ri)=>{
    h+=`<tr><td>${r.point}</td>`;
    for(let i=0;i<cyc.up;i++){
      h+=cell(ri,'up',i,'STD')+cell(ri,'up',i,'UUC')
    }
    for(let i=0;i<cyc.down;i++){
      h+=cell(ri,'down',i,'STD')+cell(ri,'down',i,'UUC')
    }
    h+=`<td>${r.avgSTD??"-"}</td><td>${r.avgUUC??"-"}</td><td>${r.dev??"-"}</td><td>${r.hyst??"-"}</td></tr>`;
  });
  
  h+=`</tbody></table>`; 
  wrap.innerHTML=h;
}

function cell(ri,dir,idx,key){
  const v=currentJob.table[ri][dir][idx][key]||"";
  return `<td><input class="input mcell" data-ri="${ri}" data-dir="${dir}" data-idx="${idx}" data-key="${key}" type="number" step="0.00001" value="${v}"></td>`;
}

function handleEntryEdit(e){
  if(!e.target.classList.contains("mcell"))return;
  const ri=+e.target.dataset.ri, 
        dir=e.target.dataset.dir, 
        idx=+e.target.dataset.idx, 
        key=e.target.dataset.key;
        
  // เก็บค่าที่กรอกไว้แบบไม่บังคับคอมม่าทศนิยมระหว่างพิมพ์
  const v=e.target.value;
  currentJob.table[ri][dir][idx][key]=(v===""? "": (isNaN(parseFloat(v))? "": parseFloat(v)));
}

function calcTable(){
  const cyc=getCycles();
  
  currentJob.table.forEach(r=>{
    const upsSTD=r.up.map(x=>parseFloat(x.STD)).filter(n=>!isNaN(n));
    const upsUUC=r.up.map(x=>parseFloat(x.UUC)).filter(n=>!isNaN(n));
    const dnsSTD=r.down.map(x=>parseFloat(x.STD)).filter(n=>!isNaN(n));
    const dnsUUC=r.down.map(x=>parseFloat(x.UUC)).filter(n=>!isNaN(n));
    
    let avgSTD=null, avgUUC=null;
    
    if(cyc.up===2&&cyc.down===1){
      if(upsSTD.length===2&&dnsSTD.length===1) avgSTD=((upsSTD[0]+upsSTD[1])/2 + dnsSTD[0])/2;
      if(upsUUC.length===2&&dnsUUC.length===1) avgUUC=((upsUUC[0]+upsUUC[1])/2 + dnsUUC[0])/2;
    }else{
      const allSTD=upsSTD.concat(dnsSTD), 
            allUUC=upsUUC.concat(dnsUUC);
      if(allSTD.length>0) avgSTD=allSTD.reduce((a,b)=>a+b,0)/allSTD.length;
      if(allUUC.length>0) avgUUC=allUUC.reduce((a,b)=>a+b,0)/allUUC.length;
    }
    
    const dev=(avgUUC!=null&&avgSTD!=null)? +(avgUUC-avgSTD).toFixed(6):null;
    let hyst=null; 
    
    if(upsUUC.length>0&&dnsUUC.length>0){
      const upAvg=upsUUC.reduce((a,b)=>a+b,0)/upsUUC.length; 
      const dnAvg=dnsUUC.reduce((a,b)=>a+b,0)/dnsUUC.length; 
      hyst=+(upAvg-dnAvg).toFixed(6);
    }
    
    r.avgSTD=avgSTD!=null? +avgSTD.toFixed(6):null; 
    r.avgUUC=avgUUC!=null? +avgUUC.toFixed(6):null; 
    r.dev=dev; 
    r.hyst=hyst;
  });
  
  renderEntryTable();
}

// Event Listeners for Entry
document.addEventListener("DOMContentLoaded", function() {
  $("entryTableWrap").addEventListener("change",handleEntryEdit);
  $("entryTableWrap").addEventListener("blur",function(e){ 
    handleEntryEdit(e); 
    calcTable(); 
  }, true);

  $("btnSaveEntry").addEventListener("click",async()=>{
    currentJob.standard.name=val("stdName");
    currentJob.standard.serial=val("stdSerial");
    currentJob.standard.acc=num("stdAcc");
    currentJob.standard.res=num("stdRes");
    currentJob.standard.cert=val("stdCert");
    
    await saveJob(currentJob); 
    refreshDashboard(); 
    switchPage("uncert");
  });
});
/* ===== Uncertainty Functions ===== */
function getAcceptanceLimit(){
  const user=currentJob.limits.acceptance;
  if(user!=null && !isNaN(user)) return +(+user).toFixed(6);
  
  const i=currentJob.instrument, 
        unit=i.unit||"bar";
  const spanBar=(toBar[unit]?toBar[unit](i.rangeMax):i.rangeMax)-(toBar[unit]?toBar[unit](i.rangeMin):i.rangeMin);
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
  
  currentJob.results=currentJob.table.map(r=>{
    const dev=r.dev ?? 0; 
    const errorSpan=Math.abs(dev)+u.U; 
    const pass=errorSpan<=acceptance; 
    return {
      point:r.point,
      deviation:dev,
      U:u.U,
      errorSpan:+errorSpan.toFixed(6),
      pass,
      std:r.avgSTD,
      uuc:r.avgUUC
    };
  });
  
  currentJob.verdictOverall=currentJob.results.every(x=>x.pass)?"Pass":"Fail";
  currentJob.status="Completed";
  
  $("uncertSummary").innerHTML=`U (k=2)=<b>${fmt(u.U)}</b> | Acceptance=${acceptance} bar | ผลรวม: <span class="badge ${currentJob.verdictOverall==='Pass'?'pass':'fail'}">${currentJob.verdictOverall}</span>`;
  makeAutoAnalysis();
}

// Event Listeners for Uncertainty
document.addEventListener("DOMContentLoaded", function() {
  $("btnAutoFromData").addEventListener("click",()=>{
    // แสดง preview ก่อนกรอกข้อมูล
    const zeros=currentJob.table.filter(r=>r.point===0 && r.dev!=null).map(r=>Math.abs(r.dev)), 
          maxZero=zeros.length?Math.max(...zeros):0;
    const acc=parseFloat(currentJob.standard.acc)||0, 
          res=parseFloat(currentJob.standard.res)||0;
    const devs=currentJob.table.map(r=>r.dev).filter(v=>v!=null), 
          n=devs.length;
    let sd=0; 
    
    if(n>1){
      const mean=devs.reduce((a,b)=>a+b,0)/n; 
      const v=devs.reduce((a,b)=>a+(b-mean)**2,0)/(n-1); 
      sd=Math.sqrt(v);
    }
    
    const hs=currentJob.table.map(r=>r.hyst).filter(v=>v!=null), 
          mH=hs.length? hs.reduce((a,b)=>a+b,0)/hs.length:0;
    
    // สร้าง preview
    const previewDiv = document.createElement("div");
    previewDiv.className = "card";
    previewDiv.style.marginTop = "10px";
    previewDiv.innerHTML = `
      <div class="label">Preview - ค่าที่จะถูกกรอกอัตโนมัติ</div>
      <div class="grid grid-3">
        <div>u_standard: ${(acc/Math.sqrt(3)).toFixed(6)}</div>
        <div>u_resolution_std: ${((res)/(2*Math.sqrt(3))).toFixed(6)}</div>
        <div>u_zero: ${(maxZero/Math.sqrt(3)).toFixed(6)}</div>
        <div>u_repeatability: ${((sd)/Math.sqrt(Math.max(1,n))).toFixed(6)}</div>
        <div>u_hysteresis: ${(mH/Math.sqrt(3)).toFixed(6)}</div>
        <div>
          <button class="btn" id="confirmAutoFill">ยืนยันการกรอกข้อมูล</button>
          <button class="btn ghost" id="cancelAutoFill">ยกเลิก</button>
        </div>
      </div>
    `;
    
    // ตรวจสอบว่ามี preview อยู่แล้วหรือไม่
    const existingPreview = document.getElementById("autoFillPreview");
    if (existingPreview) {
      existingPreview.remove();
    }
    
    previewDiv.id = "autoFillPreview";
    $("btnAutoFromData").parentNode.insertBefore(previewDiv, $("btnAutoFromData").nextSibling);
    
    // Event listeners สำหรับปุ่มใน preview
    document.getElementById("confirmAutoFill").addEventListener("click", function() {
      $("u_standard").value=(acc/Math.sqrt(3)).toFixed(6);
      $("u_res_std").value=((res)/(2*Math.sqrt(3))).toFixed(6);
      $("u_zero").value=(maxZero/Math.sqrt(3)).toFixed(6);
      $("u_repeat").value=((sd)/Math.sqrt(Math.max(1,n))).toFixed(6);
      $("u_hyst").value=(mH/Math.sqrt(3)).toFixed(6);
      
      calcUncertAndVerdict();
      previewDiv.remove();
    });
    
    document.getElementById("cancelAutoFill").addEventListener("click", function() {
      previewDiv.remove();
    });
  });

  $("btnSaveUncert").addEventListener("click",async()=>{
    calcUncertAndVerdict(); 
    await saveJob(currentJob); 
    refreshDashboard(); 
    switchPage("report");
  });
});
/* ===== Report & Charts Functions ===== */
function ensureResults(){
  if(!currentJob.results?.length){
    const acc=getAcceptanceLimit();
    currentJob.results=(currentJob.table||[]).map(r=>({
      point:r.point,
      deviation:r.dev||0,
      U:currentJob.uncertainty.U||0,
      errorSpan:Math.abs(r.dev||0)+(currentJob.uncertainty.U||0),
      pass:(Math.abs(r.dev||0)+(currentJob.uncertainty.U||0))<=acc,
      std:r.avgSTD,
      uuc:r.avgUUC
    }));
  }
}

function buildResultTable(){
  const i=currentJob.instrument, 
        unit=i.unit||"bar";
  const toBarFn = toBar[unit] || (x=>x);
  const pminBar = toBarFn(parseFloat(i.rangeMin)||0);
  const pmaxBar = toBarFn(parseFloat(i.rangeMax)||0);
  const isTX = (i.type||"").toLowerCase().includes("transmitter");

  const head = `<table class="report-table"><thead><tr>
    <th>Reference Standard Reading<br>[bar] (1)</th>
    <th>UUC* Reading<br>[${isTX ? "mA" : "bar"}]</th>
    <th>UUC* Reading Calculation Pressure<br>[bar] (2)</th>
    <th>Result Measurement Deviation<br>[bar] (2)-(1)</th>
    <th>Uncertainty<br>[bar]</th>
    <th>Result<br>[Pass/Fail]</th>
  </tr></thead><tbody>`;

  const rows = (currentJob.results||[]).map((r, idx)=>{
    const stdBar = r.std!=null ? r.std : null;
    let uuc_bar = null, calcP_bar = null, uuc_display = null;
    
    if(isTX){
      // For transmitters, convert from mA to bar
      const uuc_mA = (r.uuc!=null ? r.uuc : null);
      if(uuc_mA!=null){
        calcP_bar = pminBar + ((uuc_mA - 4)/(20 - 4)) * (pmaxBar - pminBar);
        calcP_bar = +calcP_bar.toFixed(6);
      }
      uuc_display = uuc_mA!=null ? uuc_mA.toFixed(2) : null;
    }else{
      // For gauges/meters: use UUC value directly as bar
      if(r.uuc!=null) calcP_bar = +(+r.uuc).toFixed(6);
      uuc_display = calcP_bar;
    }
    
    const dev2 = (calcP_bar!=null && stdBar!=null) ? +(calcP_bar - stdBar).toFixed(6) : (r.deviation!=null? +(+r.deviation).toFixed(6) : null);
    const U = r.U!=null? +(+r.U).toFixed(6) : null;
    const pass = r.pass ? '<span class="badge pass">Pass</span>' : '<span class="badge fail">Fail</span>';
    
    return `<tr>
      <td>${stdBar!=null?fmt(stdBar):"-"}</td>
      <td>${uuc_display!=null?fmt(uuc_display):"-"}</td>
      <td>${calcP_bar!=null?fmt(calcP_bar):"-"}</td>
      <td>${dev2!=null?fmt(dev2):"-"}</td>
      <td>${U!=null?fmt(U):"-"}</td>
      <td>${pass}</td>
    </tr>`;
  }).join("");

  $("resultTableWrap").innerHTML = head + rows + "</tbody></table>";
}

function buildReportHeader(){
  const i=currentJob.instrument, 
        e=currentJob.environment, 
        a=currentJob.accuracy, 
        u=currentJob.uncertainty, 
        s=currentJob.signature;
        
  setTxt("rCustomer",currentJob.customer.company); 
  setTxt("rCustAddr",currentJob.customer.address);
  setTxt("rPlaceDepartment",currentJob.place.department); 
  setTxt("rPlaceAddr",currentJob.place.address);
  setTxt("rCertNo",currentJob.cert.no); 
  setTxt("rReceived",currentJob.cert.received); 
  setTxt("rCalDate",i.calDate||"—"); 
  setTxt("rIssueDate",currentJob.cert.issue||i.calDate||"—");
  setTxt("rType",i.type); 
  setTxt("rModel",i.model); 
  setTxt("rSerial",i.serial); 
  setTxt("rMfg",i.mfg);
  setTxt("rMeasureRange",`${i.rangeMin}–${i.rangeMax} ${i.unit}`); 
  setTxt("rCalRange",`${(a.points[0]!=null)?a.points[0]:"-"} … ${(a.points[a.points.length-1]!=null)?a.points[a.points.length-1]:"-"} bar`);
  setTxt("rResolution", currentJob.standard.res!=null? currentJob.standard.res+" bar":"—");
  
  const acceptance=getAcceptanceLimit(); 
  setTxt("rMPE", acceptance+" bar"); 
  setTxt("rPlantLimit", (currentJob.limits.plant!=null? currentJob.limits.plant+" bar":"—"));
  
  $("rVerdict").innerHTML=`<span class="badge ${currentJob.verdictOverall==='Pass'?'pass':'fail'}">${currentJob.verdictOverall||"—"}</span>`;
  setTxt("rU",fmt(u.U));
  
  const t=$("stdBody"); 
  t.innerHTML="";
  
  const list=(currentJob.standards_used&&currentJob.standards_used.length)? currentJob.standards_used : [{
    serial: currentJob.standard.serial||"—", 
    cert: currentJob.standard.cert||"—", 
    calDate:"—", 
    dueDate:"—", 
    desc: currentJob.standard.name||"—", 
    status:"OK"
  }];
  
  list.forEach(su=>{
    const tr=document.createElement("tr"); 
    tr.innerHTML=`<td>${su.serial}</td><td>${su.cert}</td><td>${su.calDate}</td><td>${su.dueDate}</td><td>${su.desc}</td><td>${su.status}</td>`; 
    t.appendChild(tr);
  });
  
  setTxt("rAmbT",e.temp??"—"); 
  setTxt("rAmbH",e.humid??"—"); 
  setTxt("rAmbP",e.atm??"—");
  
  setTxt("sigTechNameOut",s.tech.name); 
  setTxt("sigTechTitleOut",s.tech.title); 
  setTxt("sigTechDateOut",s.tech.date);
  setTxt("sigRevNameOut",s.rev.name); 
  setTxt("sigRevTitleOut",s.rev.title); 
  setTxt("sigRevDateOut",s.rev.date);
  setTxt("sigAppNameOut",s.app.name); 
  setTxt("sigAppTitleOut",s.app.title); 
  setTxt("sigAppDateOut",s.app.date);
}

function setTxt(id,text){ 
  $(id).innerText=(text==null||text==="")?"—":text; 
}

let cAcc,cErr,cPlus,cMinus;

function buildCharts(){
  const pts=currentJob.results.map(r=>r.point);
  const devs=currentJob.results.map(r=>r.deviation||0);
  const U=currentJob.results.map(r=>r.U||0);
  const acceptance=getAcceptanceLimit();
  const FS=((toBar[currentJob.instrument.unit]||((x)=>x))(currentJob.instrument.rangeMax||0)
           - (toBar[currentJob.instrument.unit]||((x)=>x))(currentJob.instrument.rangeMin||0));

  // Accuracy Chart
  if(cAcc) cAcc.destroy();
  const ctxAcc = document.getElementById('chartAccuracy').getContext('2d');
  cAcc = new Chart(ctxAcc, {
    type: 'line',
    data: {
      labels: pts.map(p => p.toFixed(2)),
      datasets: [{
        label: 'Deviation',
        data: devs,
        borderColor: 'rgba(27, 143, 58, 0.8)',
        backgroundColor: 'rgba(27, 143, 58, 0.1)',
        tension: 0.1
      }, {
        label: 'Acceptance Limit',
        data: Array(pts.length).fill(acceptance),
        borderColor: 'rgba(220, 38, 38, 0.8)',
        borderDash: [5, 5],
        fill: false
      }, {
        label: '-Acceptance Limit',
        data: Array(pts.length).fill(-acceptance),
        borderColor: 'rgba(220, 38, 38, 0.8)',
        borderDash: [5, 5],
        fill: false
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Accuracy Chart'
        }
      },
      scales: {
        y: {
          title: {
            display: true,
            text: 'Deviation (bar)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Calibration Points (bar)'
          }
        }
      }
    }
  });

  // Error Chart
  if(cErr) cErr.destroy();
  const ctxErr = document.getElementById('chartError').getContext('2d');
  cErr = new Chart(ctxErr, {
    type: 'bar',
    data: {
      labels: pts.map(p => p.toFixed(2)),
      datasets: [{
        label: 'Error',
        data: devs,
        backgroundColor: devs.map(d => Math.abs(d) <= acceptance ? 'rgba(22, 163, 74, 0.6)' : 'rgba(220, 38, 38, 0.6)')
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Error Chart'
        }
      },
      scales: {
        y: {
          title: {
            display: true,
            text: 'Error (bar)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Calibration Points (bar)'
          }
        }
      }
    }
  });

  // Error + U Chart
  if(cPlus) cPlus.destroy();
  const ctxPlus = document.getElementById('chartErrPlusU').getContext('2d');
  cPlus = new Chart(ctxPlus, {
    type: 'line',
    data: {
      labels: pts.map(p => p.toFixed(2)),
      datasets: [{
        label: 'Error + U',
        data: devs.map((d, i) => d + U[i]),
        borderColor: 'rgba(27, 143, 58, 0.8)',
        backgroundColor: 'rgba(27, 143, 58, 0.1)',
        tension: 0.1
      }, {
        label: 'Acceptance Limit',
        data: Array(pts.length).fill(acceptance),
        borderColor: 'rgba(220, 38, 38, 0.8)',
        borderDash: [5, 5],
        fill: false
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Error + Uncertainty Chart'
        }
      },
      scales: {
        y: {
          title: {
            display: true,
            text: 'Error + U (bar)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Calibration Points (bar)'
          }
        }
      }
    }
  });

  // Error - U Chart
  if(cMinus) cMinus.destroy();
  const ctxMinus = document.getElementById('chartErrMinusU').getContext('2d');
  cMinus = new Chart(ctxMinus, {
    type: 'line',
    data: {
      labels: pts.map(p => p.toFixed(2)),
      datasets: [{
        label: 'Error - U',
        data: devs.map((d, i) => d - U[i]),
        borderColor: 'rgba(27, 143, 58, 0.8)',
        backgroundColor: 'rgba(27, 143, 58, 0.1)',
        tension: 0.1
      }, {
        label: '-Acceptance Limit',
        data: Array(pts.length).fill(-acceptance),
        borderColor: 'rgba(220, 38, 38, 0.8)',
        borderDash: [5, 5],
        fill: false
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Error - Uncertainty Chart'
        }
      },
      scales: {
        y: {
          title: {
            display: true,
            text: 'Error - U (bar)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Calibration Points (bar)'
          }
        }
      }
    }
  });
}

function makeAutoAnalysis() {
  if (!currentJob.results || currentJob.results.length === 0) return;
  
  const devs = currentJob.results.map(r => r.deviation || 0);
  const maxDev = Math.max(...devs.map(Math.abs));
  const avgDev = devs.reduce((a, b) => a + b, 0) / devs.length;
  const passCount = currentJob.results.filter(r => r.pass).length;
  const totalCount = currentJob.results.length;
  const passRate = (passCount / totalCount * 100).toFixed(1);
  
  let analysis = `<p><strong>สรุปผลการสอบเทียบ:</strong></p>`;
  analysis += `<ul>`;
  analysis += `<li>ค่าความคลาดเคลื่อนสูงสุด: ${maxDev.toFixed(6)} bar</li>`;
  analysis += `<li>ค่าความคลาดเคลื่อนเฉลี่ย: ${avgDev.toFixed(6)} bar</li>`;
  analysis += `<li>ผ่านเกณฑ์: ${passCount}/${totalCount} จุด (${passRate}%)</li>`;
  analysis += `<li>สถานะโดยรวม: <span class="badge ${currentJob.verdictOverall === 'Pass' ? 'pass' : 'fail'}">${currentJob.verdictOverall}</span></li>`;
  analysis += `</ul>`;
  
  if (currentJob.verdictOverall === 'Fail') {
    const failedPoints = currentJob.results.filter(r => !r.pass);
    analysis += `<p><strong>จุดที่ไม่ผ่านเกณฑ์:</strong></p>`;
    analysis += `<ul>`;
    failedPoints.forEach(r => {
      analysis += `<li>จุด ${r.point} bar: ความคลาดเคลื่อน ${(r.deviation || 0).toFixed(6)} bar (ขีดจำกัด: ${getAcceptanceLimit()} bar)</li>`;
    });
    analysis += `</ul>`;
  }
  
  // Add recommendations
  analysis += `<p><strong>ข้อเสนอแนะ:</strong></p>`;
  analysis += `<ul>`;
  
  if (maxDev > getAcceptanceLimit() * 0.8) {
    analysis += `<li>ค่าความคลาดเคลื่อนใกล้เกณฑ์สูงสุด ควรพิจารณาสอบเทียบอีกครั้งในระยะเวลาที่สั้นลง</li>`;
  }
  
  if (currentJob.instrument.type && currentJob.instrument.type.toLowerCase().includes('transmitter')) {
    analysis += `<li>สำหรับเครื่องวัดแรงดันแบบส่งสัญญาณ ควรตรวจสอบสภาพแวดล้อมที่มีอิทธิพลต่อค่าสัญญาณ</li>`;
  }
  
  if (currentJob.environment.temp && (currentJob.environment.temp < 18 || currentJob.environment.temp > 28)) {
    analysis += `<li>อุณหภูมิระหว่างการสอบเทียบอยู่นอกช่วงมาตรฐาน (18-28°C) อาจส่งผลต่อความแม่นยำ</li>`;
  }
  
  analysis += `</ul>`;
  
  document.getElementById('aiNote').innerHTML = analysis;
}

function makeAICharts() {
  if (!currentJob.results || currentJob.results.length === 0) return;
  
  const devs = currentJob.results.map(r => r.deviation || 0);
  const U = currentJob.uncertainty.U || 0;
  const acceptance = getAcceptanceLimit();
  
  let insights = `<p><strong>การวิเคราะห์กราฟ:</strong></p>`;
  insights += `<ul>`;
  
  // Check for systematic error
  const positiveDevs = devs.filter(d => d > 0).length;
  const negativeDevs = devs.filter(d => d < 0).length;
  
  if (positiveDevs > devs.length * 0.7) {
    insights += `<li>พบความคลาดเคลื่อนเชิงระบบในทิศทางบวก อาจเกิดจากการสอบเทียบหรือค่าอ้างอิง</li>`;
  } else if (negativeDevs > devs.length * 0.7) {
    insights += `<li>พบความคลาดเคลื่อนเชิงระบบในทิศทางลบ อาจเกิดจากการสอบเทียบหรือค่าอ้างอิง</li>`;
  }
  
  // Check for linearity issues
  const maxDev = Math.max(...devs.map(Math.abs));
  const minDev = Math.min(...devs.map(Math.abs));
  const ratio = minDev / maxDev;
  
  if (ratio < 0.3) {
    insights += `<li>ความคลาดเคลื่อนไม่สม่ำเสมอทั่วช่วงวัด อาจมีปัญหาเรื่องความเป็นเส้นตรง</li>`;
  }
  
  // Check for hysteresis
  const hysteresis = currentJob.table.map(r => r.hyst || 0);
  const maxHyst = Math.max(...hysteresis.map(Math.abs));
  
  if (maxHyst > acceptance * 0.5) {
    insights += `<li>พบฮิสเทอรีซิสสูง อาจส่งผลต่อความแม่นยำในการใช้งานจริง</li>`;
  }
  
  // Uncertainty contribution
  const uStd = parseFloat(val("u_standard")) || 0;
  const uRes = parseFloat(val("u_res_std")) || 0;
  const uZero = parseFloat(val("u_zero")) || 0;
  const uRep = parseFloat(val("u_repeat")) || 0;
  const uHyst = parseFloat(val("u_hyst")) || 0;
  
  const contributions = [
    { name: 'มาตรฐาน', value: uStd },
    { name: 'ความละเอียดของมาตรฐาน', value: uRes },
    { name: 'จุดศูนย์', value: uZero },
    { name: 'การทำซ้ำ', value: uRep },
    { name: 'ฮิสเทอรีซิส', value: uHyst }
  ];
  
  contributions.sort((a, b) => b.value - a.value);
  
  insights += `<li>ปัจจัยหลักที่ส่งผลต่อความไม่แน่นอน: ${contributions[0].name} (${contributions[0].value.toFixed(6)} bar)</li>`;
  
  insights += `</ul>`;
  
  document.getElementById('aiCharts').innerHTML = insights;
}

// Event Listeners for Report and Charts
document.addEventListener("DOMContentLoaded", function() {
  $("btnMakePDF").addEventListener("click", () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text("Pressure Calibration Report", 105, 15, { align: "center" });
    
    // Add certificate info
    doc.setFontSize(12);
    doc.text(`Certificate No: ${currentJob.cert.no || "-"}`, 20, 30);
    doc.text(`Date: ${currentJob.cert.issue || "-"}`, 20, 37);
    
    // Add instrument info
    doc.text(`Instrument: ${currentJob.instrument.type || "-"}`, 20, 50);
    doc.text(`Model: ${currentJob.instrument.model || "-"}`, 20, 57);
    doc.text(`Serial No: ${currentJob.instrument.serial || "-"}`, 20, 64);
    doc.text(`Range: ${currentJob.instrument.rangeMin}-${currentJob.instrument.rangeMax} ${currentJob.instrument.unit}`, 20, 71);
    
    // Add result
    doc.text(`Result: ${currentJob.verdictOverall || "-"}`, 20, 85);
    doc.text(`Uncertainty (k=2): ${fmt(currentJob.uncertainty.U)} bar`, 20, 92);
    
    // Add table
    let yPosition = 105;
    doc.setFontSize(10);
    doc.text("Point (bar)", 20, yPosition);
    doc.text("Deviation (bar)", 60, yPosition);
    doc.text("Uncertainty (bar)", 110, yPosition);
    doc.text("Result", 160, yPosition);
    
    yPosition += 7;
    currentJob.results.forEach(r => {
      doc.text(`${r.point}`, 20, yPosition);
      doc.text(`${fmt(r.deviation)}`, 60, yPosition);
      doc.text(`${fmt(r.U)}`, 110, yPosition);
      doc.text(`${r.pass ? "Pass" : "Fail"}`, 160, yPosition);
      yPosition += 7;
    });
    
    // Save the PDF
    doc.save(`calibration_report_${currentJob.instrument.serial || "unknown"}.pdf`);
  });

  $("btnCSV").addEventListener("click", () => {
    let csv = "Point (bar),Deviation (bar),Uncertainty (bar),Result\n";
    
    currentJob.results.forEach(r => {
      csv += `${r.point},${r.deviation},${r.U},${r.pass ? "Pass" : "Fail"}\n`;
    });
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `calibration_data_${currentJob.instrument.serial || "unknown"}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  });
});