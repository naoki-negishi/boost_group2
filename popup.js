document.getElementById("uploadBtn").addEventListener("click", () => {
  chrome.windows.create({ url: "upload.html", type: "popup", width: 400, height: 300 });
});

function renderPapers(papers) {
  const list = document.getElementById("paperList");
  list.innerHTML = "";
  for (const p of papers) {
    const li = document.createElement("li");
    li.textContent = `${p.title} (${p.year})`;
    list.appendChild(li);
  }
}

chrome.storage.local.get(["papers"], (result) => {
  renderPapers(result.papers || []);
});