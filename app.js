const links = Array.from(document.querySelectorAll(".side-nav a")).filter(Boolean);
const sections = links.map(a => document.getElementById(a.getAttribute("href").slice(1))).filter(Boolean);

function setActive(id) {
    links.forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + id));
}

const obs = new IntersectionObserver((entries) => {
    const visible = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    setActive(visible.target.id);
}, { threshold: [0.25, 0.5, 0.75] });

sections.forEach(s => obs.observe(s));

const el = (id) => document.getElementById(id);

const invalidToken = el("invalidToken");
const rsvpView = el("rsvpView");
const confirmedView = el("confirmedView");

const rsvpForm = el("rsvpForm");
const submitMsg = el("submitMsg");

function hideAll() {
    invalidToken?.classList.add("hidden");
    rsvpView?.classList.add("hidden");
    confirmedView?.classList.add("hidden");
}

function showInvalid() {
    hideAll();
    invalidToken?.classList.remove("hidden");
}

function showRsvp() {
    hideAll();
    rsvpView?.classList.remove("hidden");
}

function showConfirmed(data) {
    hideAll();
    confirmedView?.classList.remove("hidden");

    el("confirmedMeta").textContent = data?.name ? `For: ${data.name}` : "";

    el("c_attending").textContent = data?.attending || "";
    el("c_guest_count").textContent = data?.guest_count || "";
    el("c_guest_ages").textContent = data?.guest_ages || "";
    el("c_notes").textContent = data?.notes || "";
}

// ---- Token logic (FAKE for now; backend later) ----
const token = new URLSearchParams(window.location.search).get("t")?.trim() || "";

// Fake database: tokens that are "already submitted"
const fakeSubmitted = new Map([
    ["abc123", { name: "Test Guest", attending: "yes", guest_count: "2", guest_ages: "34, 33", notes: "" }],
    ["def456", { name: "Other Guest", attending: "no", guest_count: "0", guest_ages: "", notes: "Can't make it" }]
]);

if (!token) {
    showInvalid();
} else if (fakeSubmitted.has(token)) {
    showConfirmed(fakeSubmitted.get(token));
} else {
    showRsvp();
}

// Fake submit: when they submit, flip them into confirmed view locally
rsvpForm?.addEventListener("submit", (e) => {
    e.preventDefault();

    const form = new FormData(rsvpForm);
    const attending = form.get("attending") || "";
    const guest_count = form.get("guest_count") || "";
    const guest_ages = form.get("guest_ages") || "";
    const notes = form.get("notes") || "";

    submitMsg.textContent = "Submitted (fake). Backend comes later.";
    submitMsg.classList.remove("hidden");

    showConfirmed({ name: "(from link)", attending, guest_count, guest_ages, notes });
});
