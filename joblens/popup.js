const DEFAULTS = { enabled: true, mode: "collapse", showScores: false, labeling: false };
const $ = (id) => document.getElementById(id);

async function load() {
  const { settings = {}, labels = [] } = await chrome.storage.local.get(["settings", "labels"]);
  const s = { ...DEFAULTS, ...settings };
  $("enabled").checked = s.enabled;
  $("mode").value = s.mode;
  $("showScores").checked = s.showScores;
  $("labeling").checked = s.labeling;
  $("count").textContent = labels.length;
}

async function save() {
  await chrome.storage.local.set({
    settings: {
      enabled: $("enabled").checked,
      mode: $("mode").value,
      showScores: $("showScores").checked,
      labeling: $("labeling").checked,
    },
  });
}

["enabled", "mode", "showScores", "labeling"].forEach((id) => $(id).addEventListener("change", save));

$("export").addEventListener("click", async () => {
  const { labels = [] } = await chrome.storage.local.get("labels");
  const blob = new Blob([JSON.stringify(labels, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "joblens-labels.json";
  a.click();
});

$("clear").addEventListener("click", async () => {
  if (!confirm("Delete all labeled posts?")) return;
  await chrome.storage.local.remove("labels");
  $("count").textContent = 0;
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.labels) $("count").textContent = (changes.labels.newValue || []).length;
});

load();
