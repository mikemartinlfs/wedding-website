const qs=new URLSearchParams(location.search);
const token=(qs.get("t") || "").trim();

const invalidScreen=document.getElementById("invalidScreen");
const invalidToken=document.getElementById("invalidToken");

const rsvpScreen=document.getElementById("rsvpScreen");
const homeScreen=document.getElementById("homeScreen");

const inviteNameEl=document.getElementById("inviteName");
const inviteSubEl=document.getElementById("inviteSub");

const rsvpForm=document.getElementById("rsvpForm");
const ageBlock=document.getElementById("ageBlock");
const submitMsg=document.getElementById("submitMsg");

const confirmedMeta=document.getElementById("confirmedMeta");
const c_attending=document.getElementById("c_attending");
const c_guest_count=document.getElementById("c_guest_count");
const c_guest_ages=document.getElementById("c_guest_ages");
const c_notes=document.getElementById("c_notes");

const editBtn=document.getElementById("editBtn");
const countdownText=document.getElementById("countdownText");

let HAS_CHILDREN=false;
let didInitialLandingScroll=false;

function show(el,on){ el?.classList.toggle("hidden",!on); }

function scrollToId(id,behavior="smooth"){
  const el=document.getElementById(id);
  if(!el) return;
  el.scrollIntoView({ behavior, block:"start" });
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

function setInviteHeader(name){
  if(inviteNameEl) inviteNameEl.textContent=name ? `${name}, will you join us in this new chapter?` : "Will you join us in this new chapter?";
  if(inviteSubEl) inviteSubEl.textContent="";
}

function clearSubmitMsg(){
  if(!submitMsg) return;
  submitMsg.textContent="";
  submitMsg.classList.add("hidden");
}

function resetRsvpFormToBlank(){
  if(!rsvpForm) return;

  const radios=rsvpForm.querySelectorAll('input[type="radio"][name="attending"]');
  for(const r of radios) r.checked=false;

  rsvpForm.guest_count.value="";
  if(rsvpForm.guest_ages) rsvpForm.guest_ages.value="";
  rsvpForm.notes.value="";
}

function updateAgeBlock(){
  if(!ageBlock || !rsvpForm) return;

  const gc=parseInt(String(rsvpForm.guest_count?.value || "0"),10);
  const guestCount=Number.isNaN(gc) ? 0 : gc;

  const shouldShow=HAS_CHILDREN && guestCount > 1;
  ageBlock.classList.toggle("hidden",!shouldShow);

  if(!shouldShow && rsvpForm.guest_ages) rsvpForm.guest_ages.value="";
}

function applyAttendingValue(att){
  if(!rsvpForm) return;
  const val=String(att || "").trim().toLowerCase();

  const radios=rsvpForm.querySelectorAll('input[type="radio"][name="attending"]');
  for(const r of radios) r.checked=(r.value===val);
}

function readAttendingValue(){
  if(!rsvpForm) return "";
  const checked=rsvpForm.querySelector('input[type="radio"][name="attending"]:checked');
  return checked ? String(checked.value || "").trim().toLowerCase() : "";
}

function applyRsvpPrefill(resp){
  if(!rsvpForm) return;

  const attending=String(resp?.attending || "").trim().toLowerCase();
  applyAttendingValue((attending==="yes" || attending==="no") ? attending : "");

  rsvpForm.guest_count.value=resp?.guest_count ?? "";
  if(rsvpForm.guest_ages) rsvpForm.guest_ages.value=resp?.guest_ages ?? "";
  rsvpForm.notes.value=resp?.notes ?? "";

  updateAgeBlock();
}

function ensureDefaultPrefillWhenMissing(){
  if(!rsvpForm) return;
  if(!String(rsvpForm.guest_count.value || "").trim()) rsvpForm.guest_count.value="1";
  updateAgeBlock();
}

function fillConfirmed(resp){
  const att=String(resp?.attending || "").trim().toLowerCase();
  if(c_attending) c_attending.textContent=att==="no" ? "No" : "Yes";
  if(c_guest_count) c_guest_count.textContent=resp?.guest_count ?? "";
  if(c_guest_ages) c_guest_ages.textContent=resp?.guest_ages ?? "";
  if(c_notes) c_notes.textContent=resp?.notes ?? "";
}

function showInvalid(msg){
  if(invalidToken) invalidToken.textContent=msg || "This invitation link is missing or invalid.";
  show(invalidScreen,true);
  show(rsvpScreen,false);
  show(homeScreen,false);
}

function showValidScreens(){
  show(invalidScreen,false);
  show(rsvpScreen,true);
  show(homeScreen,true);
}

function updateCountdown(){
  if(!countdownText) return;
  const weddingISO="2026-04-26T00:00:00-05:00";
  const target=Date.parse(weddingISO);
  if(Number.isNaN(target)){ countdownText.textContent=""; return; }
  const now=Date.now();
  const diff=target-now;
  const days=Math.ceil(diff/(1000*60*60*24));
  countdownText.textContent=days>=0 ? `${days} DAYS TO GO!` : "JUST MARRIED";
}

async function refreshStatus(){
  updateCountdown();

  if(!token){
    showInvalid("This invitation link is missing or invalid; please use the original link sent to access our wedding website.");
    return null;
  }

  fetch(`/api/open?t=${encodeURIComponent(token)}`).catch(()=>{});

  const s=await apiGet(`/api/status?t=${encodeURIComponent(token)}`);
  if(!s.ok){
    showInvalid(s.data?.error || `Error (${s.status})`);
    return null;
  }

  const info=s.data;

  showValidScreens();

  HAS_CHILDREN=!!info.has_children;

  setInviteHeader(info.name || "");

  if(!info.submitted){
    clearSubmitMsg();
    resetRsvpFormToBlank();

    if(info.defaults) applyRsvpPrefill(info.defaults);
    else ensureDefaultPrefillWhenMissing();

    if(!didInitialLandingScroll){
      didInitialLandingScroll=true;
      scrollToId("rsvpScreen","auto");
    }

    return info;
  }

  fillConfirmed(info.response || null);

  if(confirmedMeta){
    const ts=info.response?.updated_at || info.response?.submitted_at || "";
    confirmedMeta.textContent=ts ? `Last updated: ${ts}` : "";
  }

  show(editBtn,!!info.can_edit);

  if(!didInitialLandingScroll){
    didInitialLandingScroll=true;
    scrollToId("homeScreen","auto");
  }

  return info;
}

/* Tabs click -> scroll */
document.querySelectorAll(".tabLink[data-target]").forEach(btn=>{
  btn.addEventListener("click",()=>{
    const id=btn.getAttribute("data-target");
    scrollToId(id,"smooth");
  });
});

/* Highlight active tab based on scroll */
const tabButtons=Array.from(document.querySelectorAll(".tabLink[data-target]"));
const targetIds=Array.from(new Set(tabButtons.map(b=>b.getAttribute("data-target")).filter(Boolean)));
const observed=targetIds.map(id=>document.getElementById(id)).filter(Boolean);

function setActiveTab(id){
  for(const b of tabButtons){
    b.classList.toggle("active", b.getAttribute("data-target")===id);
  }
}

if(observed.length){
  const obs=new IntersectionObserver((entries)=>{
    const visible=entries
      .filter(e=>e.isIntersecting)
      .sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
    if(!visible) return;
    setActiveTab(visible.target.id);
  }, { threshold:[0.35,0.55,0.75] });

  observed.forEach(el=>obs.observe(el));
}

/* Edit RSVP -> go to RSVP and prefill saved response */
editBtn?.addEventListener("click",async ()=>{
  const s=await apiGet(`/api/status?t=${encodeURIComponent(token)}`);
  if(!s.ok){ showInvalid(s.data?.error || `Error (${s.status})`); return; }

  const info=s.data;

  if(!info.can_edit){
    await refreshStatus();
    return;
  }

  setInviteHeader(info.name || "");
  clearSubmitMsg();
  resetRsvpFormToBlank();

  if(info.response) applyRsvpPrefill(info.response);
  else if(info.defaults) applyRsvpPrefill(info.defaults);
  else ensureDefaultPrefillWhenMissing();

  scrollToId("rsvpScreen","smooth");
});

/* Submit RSVP -> save -> refresh -> land on Home */
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

  const payload={
    token,
    attending: readAttendingValue(),
    guest_count:rsvpForm.guest_count.value,
    guest_ages:rsvpForm.guest_ages.value,
    notes:rsvpForm.notes.value
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
  scrollToId("homeScreen","smooth");
});

rsvpForm?.guest_count?.addEventListener("input",updateAgeBlock);
refreshStatus();
