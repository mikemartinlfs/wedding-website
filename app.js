const qs=new URLSearchParams(location.search);
const token=qs.get("t")?.trim();

const screens=document.querySelectorAll(".screen");

function show(id){
  screens.forEach(s=>s.classList.add("hidden"));
  document.getElementById(id)?.classList.remove("hidden");
}

async function apiGet(url){
  const r=await fetch(url);
  return {ok:r.ok,data:await r.json()};
}

async function refresh(){
  if(!token) return show("invalidToken");

  await fetch(`/api/open?t=${token}`).catch(()=>{});

  const r=await apiGet(`/api/status?t=${token}`);
  if(!r.ok) return show("invalidToken");

  const info=r.data;
  document.getElementById("inviteName").textContent=`${info.name}, will you join us?`;

  if(!info.submitted) show("rsvpScreen");
  else show("homeScreen");
}

document.querySelectorAll(".tiles button").forEach(b=>{
  b.onclick=()=>show(b.dataset.page);
});

document.querySelectorAll(".back").forEach(b=>{
  b.onclick=()=>show("homeScreen");
});

document.getElementById("rsvpForm").onsubmit=async e=>{
  e.preventDefault();
  const f=e.target;
  await fetch("/api/submit",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      token,
      attending:f.attending.value,
      guest_count:f.guest_count.value,
      guest_ages:f.guest_ages.value,
      notes:f.notes.value
    })
  });
  refresh();
};

refresh();
