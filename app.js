const qs=new URLSearchParams(location.search);
const token=(qs.get("t") || "").trim();

const scroller=document.getElementById("scroller");

const invalidScreen=document.getElementById("invalidScreen");
const invalidToken=document.getElementById("invalidToken");

const rsvpScreen=document.getElementById("rsvpScreen");
const homeScreen=document.getElementById("homeScreen");

const inviteNameEl=document.getElementById("inviteName");
const inviteSubEl=document.getElementById("inviteSub");

const rsvpForm=document.getElementById("rsvpForm");
const ageBlock=document.getElementById("ageBlock");
const submitMsg=document.getElementById("submitMsg");

const confirmedCard=document.getElementById("confirmedCard");
const confirmedMeta=document.getElementById("confirmedMeta");
const c_attending=document.getElementById("c_attending");
const c_guest_count=document.getElementById("c_guest_count");
const c_guest_ages=document.getElementById("c_guest_ages");
const c_notes=document.getElementById("c_notes");

const editBtn=document.getElementById("editBtn");

let HAS_CHILDREN=false;
let didInitialLandingScroll=false;

function show(el,on){ el?.classList.toggle("hidden",!on); }

function scrollToSection(el,behavior="smooth"){
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

function setHeader(name){
  if(inviteNameEl) inviteNameEl.textContent=name ? `${name}, will you join us in this new chapter?` : "Will you join us in this new chapter?";
  if(inviteSubEl) inviteSubEl.textContent="";
}

function clearSubmitMsg(){
  if(!submitMsg) return;
  submitMsg.textContent="";
  submitMsg.classList.add("hidden");
}

function setFormValues(resp){
  if(!rsvpForm || !resp) return;
  const att=String(resp.attending || "").trim().toLowerCase();
  if(att) rsvpForm.attending.value=att;
  if(resp.guest_count!=null) rsvpForm.guest_count.value=resp.guest_count;
  if(resp.guest_ages!=null) rsvpForm.guest_ages.value=resp.guest_ages;
  if(resp.notes!=null) rsvpForm.notes.value=resp.notes;
}

function fillConfirmed(resp){
  if(!resp) return;
  const att=String(resp.attending || "").trim().toLowerCase();
  if(c_attending) c_attending.textContent=att==="no" ? "No" : "Yes";
  if(c_guest_count) c_guest_count.textContent=resp.guest_count ?? "";
  if(c_guest_ages) c_guest_ages.textContent=resp.guest_ages ?? "";
  if(c_notes) c_notes.textContent=resp.notes ?? "";
}

function updateAgeBlock(){
  if(!ageBlock || !rsvpForm) return;
  const gc=parseInt(String(rsvpForm.guest_count?.value || "0"),10);
  const guestCount=Number.isNaN(gc) ? 0 : gc;
  const shouldShow=HAS_CHILDREN && guestCount > 1;
  ageBlock.classList.toggle("hidden",!shouldShow);
  if(!shouldShow && rsvpForm.guest_ages) rsvpForm.guest_ages.value="";
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

async function refreshStatus(){
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
  setHeader(info.name);

  // Not submitted -> RSVP is the “start”; Home is below and reachable by scroll.
  if(!info.submitted){
    show(confirmedCard,false);
    show(editBtn,false);

    // Prefill from defaults if present
    if(info.defaults) setFormValues(info.defaults);
    updateAgeBlock();
    clearSubmitMsg();

    // Ensure we start at RSVP on first load (unless they already scrolled)
    if(!didInitialLandingScroll){
      didInitialLandingScroll=true;
      scrollToSection(rsvpScreen,"auto");
    }

    return info;
  }

  // Submitted -> Home becomes the landing page
  show(confirmedCard,true);
  fillConfirmed(info.response || null);

  if(confirmedMeta){
    const ts=info.response?.updated_at || info.response?.submitted_at || "";
    confirmedMeta.textContent=ts ? `Last updated: ${ts}` : "";
  }

  show(editBtn,!!info.can_edit);

  if(!didInitialLandingScroll){
    didInitialLandingScroll=true;
    scrollToSection(homeScreen,"auto");
  }

  return info;
}

/* Home tile navigation -> scroll to target section */
document.querySelectorAll(".tile[data-target]").forEach(btn=>{
  btn.addEventListener("click",()=>{
    const id=btn.getAttribute("data-target");
    const el=document.getElementById(id);
    scrollToSection(el,"smooth");
  });
});

/* Back to tiles buttons */
document.querySelectorAll(".backToTiles").forEach(btn=>{
  btn.addEventListener("click",()=>{
    scrollToSection(homeScreen,"smooth");
  });
});

/* Edit RSVP from Home -> scroll to RSVP + prefill with response */
editBtn?.addEventListener("click",async ()=>{
  const s=await apiGet(`/api/status?t=${encodeURIComponent(token)}`);
  if(!s.ok){ showInvalid(s.data?.error || `Error (${s.status})`); return; }

  const info=s.data;

  if(!info.can_edit){
    // Keep them on Home; just don't jump them into edit mode
    await refreshStatus();
    return;
  }

  setHeader(info.name);
  if(info.response) setFormValues(info.response);
  updateAgeBlock();
  clearSubmitMsg();

  scrollToSection(rsvpScreen,"smooth");
});

/* Submit RSVP -> save -> refresh -> land on Home (tiles) */
rsvpForm?.addEventListener("submit",async (e)=>{
  e.preventDefault();
  clearSubmitMsg();

  const payload={
    token,
    attending:rsvpForm.attending.value,
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

  // Refresh status and then land on Home
  await refreshStatus();
  scrollToSection(homeScreen,"smooth");
});

rsvpForm?.guest_count?.addEventListener("input",updateAgeBlock);
rsvpForm?.attending?.addEventListener("change",updateAgeBlock);

refreshStatus();
