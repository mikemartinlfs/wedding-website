function getToken(){
  const url = new URL(window.location.href);
  const t = (url.searchParams.get("t") || "").trim();
  return t;
}

function setCountdown(){
  const el = document.querySelectorAll("#countdownText");
  const target = new Date("2026-04-26T15:00:00-04:00").getTime();
  const now = Date.now();
  const diff = Math.max(0, target - now);
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  for(const node of el) node.textContent = `${days} DAYS TO GO!`;
}

function show(id){
  document.getElementById("invalidScreen")?.classList.add("hidden");
  document.getElementById("rsvpScreen")?.classList.add("hidden");
  document.getElementById("homeScreen")?.classList.add("hidden");

  const el = document.getElementById(id);
  if(el) el.classList.remove("hidden");
}

function scrollToSection(id){
  const el = document.getElementById(id);
  if(!el) return;
  el.scrollIntoView({ behavior:"smooth", block:"start" });
}

function setActiveTab(targetId){
  document.querySelectorAll(".tabLink").forEach(btn=>{
    const isActive = btn.dataset.target === targetId;
    btn.classList.toggle("active", isActive);
  });
}

function wireTabs(){
  document.querySelectorAll(".tabLink").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const target = btn.dataset.target;
      if(!target) return;
      scrollToSection(target);
      setActiveTab(target);
    });
  });
}

function observeSections(){
  const sectionIds = ["homeScreen","details","travel","dress","registry","rsvpScreen"];
  const els = sectionIds.map(id=>document.getElementById(id)).filter(Boolean);

  const io = new IntersectionObserver((entries)=>{
    const vis = entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
    if(!vis) return;
    const id = vis.target.id;
    if(document.querySelector(`.tabLink[data-target="${id}"]`)) setActiveTab(id);
  }, { root: document.querySelector(".scroller"), threshold:[0.55] });

  for(const el of els) io.observe(el);
}

function fillConfirmed(r){
  const c_attending = document.getElementById("c_attending");
  const c_guest_count = document.getElementById("c_guest_count");
  const c_guest_ages = document.getElementById("c_guest_ages");
  const c_notes = document.getElementById("c_notes");
  const confirmedMeta = document.getElementById("confirmedMeta");

  const resp = r?.response || {};
  if(c_attending) c_attending.textContent = (resp.attending || "").toUpperCase();
  if(c_guest_count) c_guest_count.textContent = resp.guest_count || "";
  if(c_guest_ages) c_guest_ages.textContent = resp.guest_ages || "—";
  if(c_notes) c_notes.textContent = resp.notes || "—";

  const when = resp.updated_at ? new Date(resp.updated_at) : null;
  if(confirmedMeta) confirmedMeta.textContent = when ? `Last updated ${when.toLocaleString()}` : "";
}

function setRsvpPrefill(r){
  const nameEl = document.getElementById("inviteName");
  const subEl = document.getElementById("inviteSub");

  if(nameEl) nameEl.textContent = r?.name ? `${r.name}, will you join us in this new chapter?` : "";
  if(subEl){
    const contact = (r?.contact || "").trim();
    subEl.textContent = contact ? `We'll use ${contact} if we need to reach you.` : "";
  }

  const resp = r?.response || r?.defaults || null;
  if(!resp) return;

  const attending = String(resp.attending || "").trim().toLowerCase();
  if(attending === "yes" || attending === "no"){
    const radio = document.querySelector(`input[name="attending"][value="${attending}"]`);
    if(radio) radio.checked = true;
  }

  const guestCount = document.querySelector(`input[name="guest_count"]`);
  if(guestCount && resp.guest_count != null) guestCount.value = resp.guest_count;

  const notes = document.querySelector(`textarea[name="notes"]`);
  if(notes && resp.notes != null) notes.value = resp.notes;

  const ageBlock = document.getElementById("ageBlock");
  if(ageBlock) ageBlock.classList.toggle("hidden", !r?.has_children);
}

function showKidsBlock(r){
  const ageBlock = document.getElementById("ageBlock");
  if(!ageBlock) return;
  ageBlock.classList.toggle("hidden", !r?.has_children);
}

async function fetchStatus(token){
  const res = await fetch(`/api/status?t=${encodeURIComponent(token)}`, { method:"GET" });
  const data = await res.json().catch(()=>null);
  if(!res.ok) throw new Error(data?.error || "Status failed");
  return data;
}

async function postRsvp(payload){
  const res = await fetch(`/api/submit`, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(()=>null);
  if(!res.ok) throw new Error(data?.error || "Submit failed");
  return data;
}

function wireRsvpForm(token){
  const form = document.getElementById("rsvpForm");
  const msg = document.getElementById("submitMsg");
  if(!form) return;

  form.addEventListener("submit", async (e)=>{
    e.preventDefault();
    if(msg){ msg.classList.add("hidden"); msg.textContent=""; }

    const fd = new FormData(form);

    const payload = {
      token,
      attending: String(fd.get("attending") || "").trim(),
      guest_count: String(fd.get("guest_count") || "").trim(),
      guest_ages: "",
      notes: String(fd.get("notes") || "").trim()
    };

    try{
      await postRsvp(payload);
      const r = await fetchStatus(token);
      fillConfirmed(r);

      const editBtn = document.getElementById("editBtn");
      if(editBtn) editBtn.classList.toggle("hidden", !r?.can_edit);

      show("homeScreen");
      scrollToSection("homeScreen");
    } catch(err){
      if(msg){
        msg.textContent = err?.message || String(err);
        msg.classList.remove("hidden");
      }
    }
  });
}

function wireEditBtn(token){
  const btn = document.getElementById("editBtn");
  if(!btn) return;

  btn.addEventListener("click", async ()=>{
    try{
      const r = await fetchStatus(token);
      show("rsvpScreen");
      setRsvpPrefill(r);
      showKidsBlock(r);
      scrollToSection("rsvpScreen");
    } catch(e){
      // ignore
    }
  });
}

async function main(){
  setCountdown();
  wireTabs();
  observeSections();

  const token = getToken();
  if(!token){
    show("invalidScreen");
    return;
  }

  try{
    await fetch(`/api/open?t=${encodeURIComponent(token)}`).catch(()=>{});
    const r = await fetchStatus(token);

    // Ensure pages are available only when appropriate
    document.getElementById("details")?.classList.remove("hidden");
    document.getElementById("travel")?.classList.remove("hidden");
    document.getElementById("dress")?.classList.remove("hidden");
    document.getElementById("registry")?.classList.remove("hidden");

    if(r.submitted){
      show("homeScreen");
      fillConfirmed(r);

      const editBtn = document.getElementById("editBtn");
      if(editBtn) editBtn.classList.toggle("hidden", !r?.can_edit);

      wireEditBtn(token);
    } else {
      show("rsvpScreen");
      setRsvpPrefill(r);
      showKidsBlock(r);
      wireRsvpForm(token);
    }
  } catch(e){
    show("invalidScreen");
  }
}

main();
