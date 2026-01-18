// app.js
const qs=new URLSearchParams(location.search);
const token=(qs.get("t") || "").trim();

const invalidScreen=document.getElementById("invalidScreen");
const rsvpScreen=document.getElementById("rsvpScreen");
const homeScreen=document.getElementById("homeScreen");

const rsvpForm=document.getElementById("rsvpForm");
const inviteNameEl=document.getElementById("inviteName");
const inviteSubEl=document.getElementById("inviteSub");
const submitMsg=document.getElementById("submitMsg");
const ageBlock=document.getElementById("ageBlock");

const confirmedMeta=document.getElementById("confirmedMeta");
const c_attending=document.getElementById("c_attending");
const c_guest_count=document.getElementById("c_guest_count");
const c_guest_ages=document.getElementById("c_guest_ages");
const c_notes=document.getElementById("c_notes");
const editBtn=document.getElementById("editBtn");

const tabLinks=Array.from(document.querySelectorAll(".tabLink"));

let HAS_CHILDREN=false;

function show(el,on){ el?.classList.toggle("hidden",!on); }

function setCountdown(){
  const targets=document.querySelectorAll('[id="countdownText"]');
  const eventDate=new Date("2026-04-26T15:00:00-04:00"); // ceremony start local
  const now=new Date();
  const ms=eventDate.getTime() - now.getTime();
  const days=Math.max(0, Math.ceil(ms / (1000*60*60*24)));
  for(const el of targets){
    el.textContent=`${days} DAYS TO GO!`;
  }
}

async function apiGet(url){
  const r=await fetch(url,{ method:"GET" });
  const txt=await r.text();
  try{ return { ok:r.ok,status:r.status,data:JSON.parse(txt) }; }
  catch{ return { ok:r.ok,status:r.status,data:{ raw:txt } }; }
}

async function apiPost(url,body){
  const r=await fetch(url,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify(body)
  });
  const txt=await r.text();
  try{ return { ok:r.ok,status:r.status,data:JSON.parse(txt) }; }
  catch{ return { ok:r.ok,status:r.status,data:{ raw:txt } }; }
}

function clearSubmitMsg(){
  if(!submitMsg) return;
  submitMsg.textContent="";
  submitMsg.classList.add("hidden");
}

function setHeader(name){
  if(!inviteNameEl) return;
  inviteNameEl.textContent=name ? `${name}, will you join us in this new chapter?` : "Will you join us in this new chapter?";
  if(inviteSubEl) inviteSubEl.textContent="";
}

function setFormValues(resp){
  if(!rsvpForm) return;

  const att=String(resp?.attending || "").trim().toLowerCase();
  const yes=rsvpForm.querySelector('input[name="attending"][value="yes"]');
  const no=rsvpForm.querySelector('input[name="attending"][value="no"]');
  if(yes) yes.checked=att==="yes";
  if(no) no.checked=att==="no";

  if(rsvpForm.guest_count) rsvpForm.guest_count.value=resp?.guest_count ?? "";
  if(rsvpForm.notes) rsvpForm.notes.value=resp?.notes ?? "";
}

function fillConfirmed(resp){
  const att=String(resp?.attending || "").trim().toLowerCase();
  if(c_attending) c_attending.textContent=att==="no" ? "No" : "Yes";
  if(c_guest_count) c_guest_count.textContent=resp?.guest_count ?? "";
  if(c_guest_ages) c_guest_ages.textContent=resp?.guest_ages ?? "";
  if(c_notes) c_notes.textContent=resp?.notes ?? "";
}

function updateAgeBlock(){
  if(!ageBlock || !rsvpForm) return;
  const gc=parseInt(String(rsvpForm.guest_count?.value || "0"),10);
  const guestCount=Number.isNaN(gc) ? 0 : gc;
  const shouldShow=HAS_CHILDREN && guestCount > 1;
  ageBlock.classList.toggle("hidden",!shouldShow);
}

function setActiveTab(targetId){
  for(const b of tabLinks){
    b.classList.toggle("active", b.getAttribute("data-target")===targetId);
  }
}

function scrollToSection(id){
  const el=document.getElementById(id);
  if(!el) return;

  // Ensure the section is visible if it's one we sometimes hide
  el.classList.remove("hidden");

  setActiveTab(id);
  el.scrollIntoView({ behavior:"smooth", block:"start" });
}

tabLinks.forEach(btn=>{
  btn.addEventListener("click",()=>{
    const id=btn.getAttribute("data-target");
    if(!id) return;
    scrollToSection(id);
  });
});

async function refreshStatus(){
  setCountdown();

  // Hide everything until we know
  show(invalidScreen,false);
  show(rsvpScreen,false);
  show(homeScreen,false);
  show(document.getElementById("details"),false);
  show(document.getElementById("travel"),false);
  show(document.getElementById("dress"),false);
  show(document.getElementById("registry"),false);

  if(!token){
    show(invalidScreen,true);
    return null;
  }

  // Track opens (non-blocking)
  fetch(`/api/open?t=${encodeURIComponent(token)}`).catch(()=>{});

  const s=await apiGet(`/api/status?t=${encodeURIComponent(token)}`);
  if(!s.ok){
    show(invalidScreen,true);
    return null;
  }

  const info=s.data;
  HAS_CHILDREN=!!info.has_children;

  if(!info.submitted){
    // Landing is RSVP, but keep the rest visible beneath for swipe-up
    show(rsvpScreen,true);
    show(homeScreen,true);
    show(document.getElementById("details"),true);
    show(document.getElementById("travel"),true);
    show(document.getElementById("dress"),true);
    show(document.getElementById("registry"),true);

    setHeader(info.name);
    setFormValues(info.defaults || null);
    updateAgeBlock();

    // Start at top
    rsvpScreen.scrollIntoView({ behavior:"auto", block:"start" });
    return info;
  }

  // Submitted: landing is Home; keep RSVP hidden unless they tap the RSVP tab or Edit
  show(rsvpScreen,false);
  show(homeScreen,true);
  show(document.getElementById("details"),true);
  show(document.getElementById("travel"),true);
  show(document.getElementById("dress"),true);
  show(document.getElementById("registry"),true);

  if(confirmedMeta){
    const ts=info.response?.updated_at || info.response?.submitted_at || "";
    confirmedMeta.textContent=ts ? `Last updated: ${ts}` : "";
  }

  fillConfirmed(info.response);
  show(editBtn,!!info.can_edit);

  // Land at home
  homeScreen.scrollIntoView({ behavior:"auto", block:"start" });
  setActiveTab("homeScreen");

  return info;
}

editBtn?.addEventListener("click",async ()=>{
  if(!token) return;

  const s=await apiGet(`/api/status?t=${encodeURIComponent(token)}`);
  if(!s.ok) return;

  const info=s.data;
  if(!info.can_edit){
    show(editBtn,false);
    return;
  }

  show(rsvpScreen,true);
  setHeader(info.name);
  setFormValues(info.response || null);
  updateAgeBlock();
  scrollToSection("rsvpScreen");
});

rsvpForm?.guest_count?.addEventListener("input",updateAgeBlock);

rsvpForm?.addEventListener("submit",async (e)=>{
  e.preventDefault();
  clearSubmitMsg();

  if(!token){
    if(submitMsg){
      submitMsg.textContent="Missing invite token.";
      submitMsg.classList.remove("hidden");
    }
    return;
  }

  const attending=rsvpForm.querySelector('input[name="attending"]:checked')?.value || "";

  const payload={
    token,
    attending,
    guest_count:rsvpForm.guest_count?.value || "",
    guest_ages:"", // kept for backend compatibility; you removed the input
    notes:rsvpForm.notes?.value || ""
  };

  const r=await apiPost("/api/submit",payload);

  if(!r.ok){
    if(submitMsg){
      submitMsg.textContent=r.data?.error || `Submit failed (${r.status})`;
      submitMsg.classList.remove("hidden");
    }
    return;
  }

  if(submitMsg){
    submitMsg.textContent="RSVP saved.";
    submitMsg.classList.remove("hidden");
  }

  await refreshStatus();
});

setCountdown();
setInterval(setCountdown, 60_000);
refreshStatus();
