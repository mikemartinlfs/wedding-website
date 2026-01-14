const links=Array.from(document.querySelectorAll(".side-nav a")).filter(Boolean);
const sections=links.map(a=>document.getElementById(a.getAttribute("href").slice(1))).filter(Boolean);

function setActive(id){
  links.forEach(a=>a.classList.toggle("active", a.getAttribute("href")==="#" + id));
}

const obs=new IntersectionObserver((entries)=>{
  const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
  if(!visible) return;
  setActive(visible.target.id);
}, { threshold:[0.25,0.5,0.75] });

sections.forEach(s=>obs.observe(s));

const qs=new URLSearchParams(location.search);
const token=(qs.get("t") || "").trim();

const invalidToken=document.getElementById("invalidToken");
const rsvpView=document.getElementById("rsvpView");
const confirmedView=document.getElementById("confirmedView");

const inviteNameEl=document.getElementById("inviteName");
const inviteSubEl=document.getElementById("inviteSub");

const rsvpForm=document.getElementById("rsvpForm");
const ageBlock=document.getElementById("ageBlock");
let HAS_CHILDREN=false;
const submitMsg=document.getElementById("submitMsg");

const confirmedMeta=document.getElementById("confirmedMeta");
const c_attending=document.getElementById("c_attending");
const c_guest_count=document.getElementById("c_guest_count");
const c_guest_ages=document.getElementById("c_guest_ages");
const c_notes=document.getElementById("c_notes");

const editBtn=document.getElementById("editBtn");

function show(el,on){ el?.classList.toggle("hidden",!on); }

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
}

function setFormValues(resp){
  if(!rsvpForm) return;
  const att=String(resp?.attending || "").trim().toLowerCase();
  rsvpForm.attending.value=att || "";
  rsvpForm.guest_count.value=resp?.guest_count ?? "";
  rsvpForm.guest_ages.value=resp?.guest_ages ?? "";
  rsvpForm.notes.value=resp?.notes ?? "";
}

function fillConfirmed(resp){
  const att=String(resp?.attending || "").trim().toLowerCase();
  if(c_attending) c_attending.textContent=att==="no" ? "No" : "Yes";
  if(c_guest_count) c_guest_count.textContent=resp?.guest_count ?? "";
  if(c_guest_ages) c_guest_ages.textContent=resp?.guest_ages ?? "";
  if(c_notes) c_notes.textContent=resp?.notes ?? "";
}

function clearSubmitMsg(){
  if(!submitMsg) return;
  submitMsg.textContent="";
  submitMsg.classList.add("hidden");
}

function showInvalid(msg){
  if(invalidToken) invalidToken.textContent=msg || "This invitation link is missing or invalid.";
  show(invalidToken,true);
  show(rsvpView,false);
  show(confirmedView,false);
}

function showRsvp(name){
  setHeader(name);
  show(invalidToken,false);
  show(rsvpView,true);
  show(confirmedView,false);
  show(editBtn,false);
  clearSubmitMsg();
}

function showConfirmed(name,resp,canEdit){
  setHeader(name);
  show(invalidToken,false);
  show(rsvpView,false);
  show(confirmedView,true);

  if(confirmedMeta){
    const ts=resp?.updated_at || resp?.submitted_at || "";
    confirmedMeta.textContent=ts ? `Last updated: ${ts}` : "";
  }

  fillConfirmed(resp);
  show(editBtn,!!canEdit);
  clearSubmitMsg();
}

function updateAgeBlock(){
  if(!ageBlock || !rsvpForm) return;

  const gc=parseInt(String(rsvpForm.guest_count?.value || "0"),10);
  const guestCount=Number.isNaN(gc) ? 0 : gc;

  const shouldShow=HAS_CHILDREN && guestCount > 1;
  ageBlock.classList.toggle("hidden",!shouldShow);

  if(!shouldShow && rsvpForm.guest_ages) rsvpForm.guest_ages.value="";
}

async function refreshStatus(){
  if(!token){
    showInvalid("This invitation link is missing or invalid.");
    return null;
  }

  fetch(`/api/open?t=${encodeURIComponent(token)}`).catch(()=>{});

  const s=await apiGet(`/api/status?t=${encodeURIComponent(token)}`);
  if(!s.ok){
    showInvalid(s.data?.error || `Error (${s.status})`);
    return null;
  }

  const info=s.data;

  HAS_CHILDREN=!!info.has_children;
  if(!info.submitted){
    showRsvp(info.name);
    setFormValues(info.defaults || null);
  }else{
    showConfirmed(info.name,info.response,info.can_edit);
  }
  updateAgeBlock();

  return info;
}

editBtn?.addEventListener("click",async ()=>{
  const s=await apiGet(`/api/status?t=${encodeURIComponent(token)}`);
  if(!s.ok){
    showInvalid(s.data?.error || `Error (${s.status})`);
    return;
  }

  const info=s.data;

  if(!info.can_edit){
    showConfirmed(info.name,info.response,false);
    return;
  }

  showRsvp(info.name);
  setFormValues(info.response);
});

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

  await refreshStatus();
});

rsvpForm?.guest_count?.addEventListener("input",updateAgeBlock);
rsvpForm?.attending?.addEventListener("change",updateAgeBlock);

refreshStatus();

/* =========================
   Viewport-over-still-image parallax (no dual-image, supports green “blank” transition)
   - viewportWindow is FULL SCREEN (CSS change required)
   - cutout moves; outside is opaque green
   - image is shown ONLY when cutout overlaps a .panel.window marker
   ========================= */
(() => {
  const viewportMask=document.getElementById("viewportMask");
  const viewportWindow=document.getElementById("viewportWindow");
  let markers=Array.from(document.querySelectorAll(".panel.window[data-bg]"));
  if(!viewportMask || !viewportWindow || markers.length==0) return;

  markers=markers.sort((a,b)=>a.offsetTop - b.offsetTop);

  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));

  // Create an invisible sizer so we can get var(--winW/--winH) in real px
  const sizer=document.createElement("div");
  sizer.style.position="fixed";
  sizer.style.left="-99999px";
  sizer.style.top="0";
  sizer.style.width="var(--winW)";
  sizer.style.height="var(--winH)";
  sizer.style.pointerEvents="none";
  sizer.style.visibility="hidden";
  document.body.appendChild(sizer);

  const setBg=(bgPath)=>{
    if(!bgPath){
      viewportWindow.style.setProperty("--bg","none");
      return;
    }
    viewportWindow.style.setProperty("--bg",`url(${bgPath})`);
  };

  const markerProgress=(el)=>{
    const r=el.getBoundingClientRect();
    const vh=window.innerHeight;
    const total=r.height + vh;
    return clamp((vh - r.top) / total,0,1);
  };

  const overlapPx=(aTop,aBottom,bTop,bBottom)=>{
    const o=Math.min(aBottom,bBottom) - Math.max(aTop,bTop);
    return o>0 ? o : 0;
  };

  let activeIdx=0;
  setBg(markers[activeIdx].getAttribute("data-bg"));

  const update=()=>{
    const sr=sizer.getBoundingClientRect();
    const winW=Math.round(sr.width);
    const winH=Math.round(sr.height);

    const baseLeft=Math.round((window.innerWidth - winW) / 2);
    const baseTop=Math.round((window.innerHeight - winH) / 2);

    // Move cutout based ONLY on active marker's progress
    const active=markers[activeIdx];
    const p=markerProgress(active);
    const range=Math.round(window.innerHeight * 0.55);
    const vy=Math.round((p - 0.5) * 2 * range);

    const cutTopPx=baseTop + vy;
    const cutBottomPx=cutTopPx + winH;

    const cutTopPage=window.scrollY + cutTopPx;
    const cutBottomPage=window.scrollY + cutBottomPx;

    // Overlap with active marker
    const aTop=active.offsetTop;
    const aBottom=aTop + active.offsetHeight;
    const activeO=overlapPx(cutTopPage,cutBottomPage,aTop,aBottom);

    // Overlap with next/prev markers
    const next=activeIdx < markers.length-1 ? markers[activeIdx+1] : null;
    const prev=activeIdx > 0 ? markers[activeIdx-1] : null;

    const nextO=next ? overlapPx(cutTopPage,cutBottomPage,next.offsetTop,next.offsetTop + next.offsetHeight) : 0;
    const prevO=prev ? overlapPx(cutTopPage,cutBottomPage,prev.offsetTop,prev.offsetTop + prev.offsetHeight) : 0;

    // Show rules:
    // - If cutout overlaps active: show active image
    // - Else if overlaps next: advance and show next
    // - Else if overlaps prev: go back and show prev
    // - Else: show NO image (solid green) until we overlap a marker again
    if(activeO > 0){
      setBg(active.getAttribute("data-bg"));
    } else if(nextO > 0){
      activeIdx++;
      setBg(markers[activeIdx].getAttribute("data-bg"));
    } else if(prevO > 0){
      activeIdx--;
      setBg(markers[activeIdx].getAttribute("data-bg"));
    } else {
      setBg(null);
    }

    viewportMask.style.setProperty("--cutLeft",`${baseLeft}px`);
    viewportMask.style.setProperty("--cutTop",`${Math.round(cutTopPx)}px`);
  };

  update();

  let ticking=false;
  const onScroll=()=>{
    if(ticking) return;
    ticking=true;
    requestAnimationFrame(()=>{
      ticking=false;
      update();
    });
  };

  window.addEventListener("scroll",onScroll,{ passive:true });
  window.addEventListener("resize",()=>{ ticking=false; update(); },{ passive:true });
})();
