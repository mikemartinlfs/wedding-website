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

const jumpToHomeBtn=document.getElementById("jumpToHomeBtn");

let HAS_CHILDREN=false;

const allScreens=[invalidScreen, rsvpScreen, homeScreen,
  document.getElementById("details"),
  document.getElementById("travel"),
  document.getElementById("dress"),
  document.getElementById("registry")
].filter(Boolean);

function showScreen(el){
  allScreens.forEach(s=>s.classList.add("hidden"));
  el?.classList.remove("hidden");
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
  if(resp.guest_count) rsvpForm.guest_count.value=resp.guest_count;
  if(resp.guest_ages) rsvpForm.guest_ages.value=resp.guest_ages;
  if(resp.notes) rsvpForm.notes.value=resp.notes;
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
  showScreen(invalidScreen);
}

function openRsvp(name,defaults){
  setHeader(name);
  setFormValues(defaults || null);
  updateAgeBlock();
  clearSubmitMsg();
  showScreen(rsvpScreen);
}

function openHome(name,resp,canEdit){
  if(confirmedMeta){
    const ts=resp?.updated_at || resp?.submitted_at || "";
    confirmedMeta.textContent=ts ? `Last updated: ${ts}` : "";
  }
  fillConfirmed(resp || null);
  if(editBtn) editBtn.classList.toggle("hidden",!canEdit);
  showScreen(homeScreen);
}

async function refreshStatus(){
  if(!token){
    showInvalid("This invitation link is missing or invalid.");
    return;
  }

  fetch(`/api/open?t=${encodeURIComponent(token)}`).catch(()=>{});

  const s=await apiGet(`/api/status?t=${encodeURIComponent(token)}`);
  if(!s.ok){
    showInvalid(s.data?.error || `Error (${s.status})`);
    return;
  }

  const info=s.data;
  HAS_CHILDREN=!!info.has_children;

  if(!info.submitted){
    openRsvp(info.name,info.defaults || null);
  }else{
    openHome(info.name,info.response,!!info.can_edit);
  }
}

editBtn?.addEventListener("click",async ()=>{
  const s=await apiGet(`/api/status?t=${encodeURIComponent(token)}`);
  if(!s.ok){ showInvalid(s.data?.error); return; }
  openRsvp(s.data.name,s.data.response);
});

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
    submitMsg.textContent=r.data?.error || "Submit failed.";
    submitMsg.classList.remove("hidden");
    return;
  }

  submitMsg.textContent="RSVP saved.";
  submitMsg.classList.remove("hidden");
  refreshStatus();
});

rsvpForm?.guest_count?.addEventListener("input",updateAgeBlock);
rsvpForm?.attending?.addEventListener("change",updateAgeBlock);

refreshStatus();
