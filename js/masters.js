/* ===== Masters (แยกไฟล์) ===== */
const MASTER_COMPANY = [
  { c:"Athimart Co.,Ltd.", a:"170 Moo.11, Tambon Nikhom, Amphoe Satuek" },
  { c:"Sura Bangyikhan Co.,Ltd.", a:"82 Moo.3, Tsmbon Bang Khoo Wat, Amphoe Muang" },
  { c:"Fuengfuanant Co.,Ltd.", a:"333 Moo.1, Tambon Tha Toom, Amphoe Si Maha Phot" },
  { c:"Fermentation Central Officer", a:"260 Sangsom Building, Phaholyothin Road, Samsen-Nai Phayathai" },
  { c:"Luckchai Liquor Trading Co.,Ltd.", a:"46 Moo.1, Tambon Nong Klang Na, Amphoe Muang" },
  { c:"Kanchanasingkorn Co.,Ltd.", a:"50 Moo.7, Tambon Wangkhanai, Amphoe Thamuang" },
  { c:"Kankwan Co.,Ltd.", a:"309 Moo.6, Nampong-Kranuan Road, Tambon Nampong, Amphoe Nampong" },
  { c:"Red Bull Distillery(1988) Co.,Ltd.", a:"8 Moo.5, Setthakit 1 Road, Tambon Nadee, Amphoe Muang" },
  { c:"Instrument Calibration Laboratory", a:"260 Sangsom Building, Phaholyothin Road, Samsen-Nai Phayathai" },
  { c:"Mongkolsamai Co.,Ltd.", a:"149 Moo.5, Wangseesoob Ngew-Ngam Road, Tambon Phajud, Amphoe Muang" },
  { c:"Nateechai Co.,Ltd.", a:"1 Moo.2, Highway No.41 Road, Tambon Tharongchang, Amphoe Punpin" },
  { c:"United Products Co.,Ltd.", a:"56 Moo.2, Sukhaphiban Road, Tambon Nakhonchaisri, Amphoe Nakhonchaisri" },
  { c:"Sura Piset Pattharalanna Co.,Ltd.", a:"14 Sangsom Building,Soi Yasoob 1,Vibhavadi Rangsit Road, Chomphon Sub-district,Chatuchack District" },
  { c:"Sangsom Co.,Ltd.", a:"49 Moo.4, Tambon Hormkret, Amphoe Sampran" },
  { c:"Sangsom Co.,Ltd.", a:"37/3 Moo.7, Tambon Wangkhanai, Amphoe Thamuang" },
  { c:"S.S. Karnsura Co.,Ltd.", a:"101 Moo.8, Tambon Kaeng Dom, King Amphoe Sawang Wirawong" },
  { c:"Simathurakij Co.,Ltd.", a:"1 Moo.6 Tambon Ban Daen, Amphoe Banphot Phisai" },
  { c:"SPM Foods and Beverages Co.,Ltd.", a:"79 Moo.3, Tambon Lumlookbua, Amphoe Dontoom" },
  { c:"Thanapakdi Co.,Ltd.", a:"315 Moo.4, Tambon Mae Faek, Amphoe San Sai" },
  { c:"Sura Piset Thipharat Co.,Ltd.", a:"488 Moo.1, Tambon Wangdong, Amphoe Muang" },
  { c:"Theparunothai Co.,Ltd.", a:"99 Moo.4, Tambon Hat Kham, Amphoe Muang" },
  { c:"United Winery and Distillery Co.,Ltd.", a:"54 Moo.2, Sukhaphiban Road, Tambon Nakhonchaisri, Amphoe Nakhonchaisri" },
];

const MASTER_DEPT = [
  "แผนกกลั่นสุรา",
  "แผนกหมักส่า",
  "แผนกอื่นๆโปรดระบุ"
];

function $(id){ return document.getElementById(id); }
function val(id){ return $(id).value; }

/** เติม datalist + auto-fill address */
function populateCompanyMaster(){
  const cList = $("companyList");
  const aList = $("addressList");
  const dList = $("deptList");
  if(!cList || !aList) return;

  cList.innerHTML = ""; aList.innerHTML = ""; dList.innerHTML = "";

  MASTER_COMPANY.forEach(x=>{
    const o1=document.createElement("option"); o1.value=x.c; cList.appendChild(o1);
    const o2=document.createElement("option"); o2.value=x.a; aList.appendChild(o2);
  });
  MASTER_DEPT.forEach(dep=>{
    const o=document.createElement("option"); o.value=dep; dList.appendChild(o);
  });

  // Auto-fill เมือ่เลือก Company
  const onCompanyChange = ()=>{
    const f = MASTER_COMPANY.find(x=>x.c===val("custCompany"));
    if(f){ $("custAddr").value = f.a; }
  };
  const onDeptChange = ()=>{
    const f = MASTER_COMPANY.find(x=>x.c===val("placeDept"));
    if(f){ $("placeAddr").value = f.a; }
  };

  $("custCompany")?.addEventListener("change", onCompanyChange);
  $("placeDept")?.addEventListener("change", onDeptChange);
}

// export แบบ UMD ง่ายๆ เผื่อเรียกจากที่อื่น
window.populateCompanyMaster = populateCompanyMaster;
