const qs=new URLSearchParams(location.search);
const token=(qs.get("t") || "").trim();

const inviteNameEl=document.getElementById("inviteName");
const inviteSubEl=document.getElementById("inviteSub");
const rsvpSection=document.getElementById("rsvpSection");
const alreadySection=document.getElementById("alreadySection");
const rsvpForm=document.getElementById("rsvpForm");
const submitMsg=document.getElementById("submitMsg");
const editBtn=document.getElementById("editBtn");
const confirmSummary=document.getElementById("confirmSummary");

function show(el, on){ el?.classList.toggle("hidden", !on); }

async function apiGet(url){
  const r=await fetch(url, { method:"GET" });
  const txt=await r.text();
  try{ return { ok:r.ok, status:r.status, data:JSON.parse(txt) }; }
  catch{ return { ok:r.ok, status:r.status, data:{ raw:txt } }; }
}

async function apiPost(url, body){
  const r=await fetch(url, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify(body)
  });
  const txt=await r.text();
  try{ return { ok:r.ok, status:r.status, data:JSON.parse(txt) }; }
  catch{ return { ok:r.ok, status:r.status, data:{ raw:txt } }; }
}

function fillInviteHeader(name){
  if(inviteNameEl) inviteNameEl.textContent = name ? `${name}, you are invited.` : "You are invited.";
  if(inviteSubEl) inviteSubEl.textContent = "Please RSVP below.";
}

function setFormFromResponse(resp){
  if(!rsvpForm) return;
  rsvpForm.attending.value = resp?.attending || "yes";
  rsvpForm.guest_count.value = resp?.guest_count || "";
  rsvpForm.guest_ages.value = resp?.guest_ages || "";
  rsvpForm.notes.value = resp?.notes || "";
}

function summaryText(resp){
  const a=(resp?.attending || "").toLowerCase();
  const attending = a === "no" ? "Not attending" : "Attending";
  const n = resp?.guest_count ? `Guests: ${resp.guest_count}` : "";
  const ages = resp?.guest_ages ? `Ages: ${resp.guest_ages}` : "";
  const notes = resp?.notes ? `Notes: ${resp.notes}` : "";
  return [attending, n, ages, notes].filter(Boolean).join(" · ");
}

async function init(){
  if(!token){
    fillInviteHeader("");
    show(rsvpSection, false);
    show(alreadySection, false);
    if(inviteSubEl) inviteSubEl.textContent = "Missing invite token (t=...).";
    return;
  }

  // Track opens (don’t block on it)
  fetch(`/api/open?t=${encodeURIComponent(token)}`).catch(()=>{});

  const s = await apiGet(`/api/status?t=${encodeURIComponent(token)}`);

  if(!s.ok){
    fillInviteHeader("");
    show(rsvpSection, false);
    show(alreadySection, false);
    if(inviteSubEl) inviteSubEl.textContent = s.data?.error || `Error (${s.status})`;
    return;
  }

  const info=s.data;
  fillInviteHeader(info.name);

  if(!info.submitted){
    show(rsvpSection, true);
    show(alreadySection, false);
    setFormFromResponse(null);
    return;
  }

  // Already submitted
  show(rsvpSection, false);
  show(alreadySection, true);

  if(confirmSummary) confirmSummary.textContent = summaryText(info.response);

  // allow edit if within cutoff
  show(editBtn, !!info.can_edit);

  // If you click edit, show form prefilled
  editBtn?.addEventListener("click", () => {
    show(alreadySection, false);
    show(rsvpSection, true);
    setFormFromResponse(info.response);
  });
}

rsvpForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  if(!token){
    submitMsg.textContent="Missing invite token.";
    submitMsg.classList.remove("hidden");
    return;
  }

  const payload = {
    token,
    attending: rsvpForm.attending.value,
    guest_count: rsvpForm.guest_count.value,
    guest_ages: rsvpForm.guest_ages.value,
    notes: rsvpForm.notes.value
  };

  const r = await apiPost("/api/submit", payload);

  if(!r.ok){
    submitMsg.textContent = r.data?.error || `Submit failed (${r.status})`;
    submitMsg.classList.remove("hidden");
    return;
  }

  submitMsg.textContent="RSVP saved.";
  submitMsg.classList.remove("hidden");

  // Re-check status to flip to confirmation view
  const s = await apiGet(`/api/status?t=${encodeURIComponent(token)}`);
  if(s.ok && s.data?.submitted){
    show(rsvpSection, false);
    show(alreadySection, true);
    if(confirmSummary) confirmSummary.textContent = summaryText(s.data.response);
    show(editBtn, !!s.data.can_edit);
  }
});

init();
