document.getElementById("saveUploadBtn").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab || !tab.url) return;

    let pdfUrl = tab.url;
    // arxiv
    const arxiv_regex = new RegExp("^https?://arxiv.org/(abs|pdf)/(?<id>.+?)(.pdf)?$");
    if (arxiv_regex.test(pdfUrl)) {
      const id = pdfUrl.match(arxiv_regex).groups.id
      pdfUrl = `https://arxiv.org/pdf/${id}.pdf`;
      // Fetch metadata and save
      fetchArxivById(id).then(metadata => {
        if (metadata) {
          const paper = {
            title: metadata.title || "Untitled",
            authors: metadata.authors.join(", "),
            year: metadata.published ? new Date(metadata.published).getFullYear() : new Date().getFullYear(),
            url: `https://arxiv.org/abs/${metadata.arxiv_id}`,
            keywords: metadata.categories.join(", ")
          };
          chrome.runtime.sendMessage({ type: "addPaper", payload: paper });
        }
      });
    } else if (pdfUrl && pdfUrl.endsWith(".pdf")) {
      fetch(pdfUrl)
        .then((res) => res.blob())
        .then(() => {
          const paper = {
            title: tab.title || "Untitled",
            authors: "",
            year: new Date().getFullYear(),
            url: pdfUrl,
            keywords: ""
          };
          chrome.runtime.sendMessage({ type: "addPaper", payload: paper });
        });
    } else {
      document.getElementById("fileInput").click();
    }
  });
});


function showToast(message) {
  const toast = document.createElement("div");
  toast.textContent = message;
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "30px",
    left: "50%",
    transform: "translateX(-50%)",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    color: "#fff",
    padding: "12px 20px",
    borderRadius: "4px",
    zIndex: 1000,
    fontSize: "14px",
  });
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

const fileInput = document.getElementById("fileInput");
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const paper = {
    title: file.name,
    authors: "",
    year: new Date().getFullYear(),
    fileName: file.name
  };
  chrome.runtime.sendMessage({ type: "addPaper", payload: paper }, () => {
    showToast("Upload complete.");
    fileInput.value = "";
  });
});

async function fetchArxivById(id) {
  const url = `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}`;
  const xml = await fetch(url).then(r => r.text());
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const entry = doc.querySelector("entry");
  if (!entry) return null;

  const txt = sel => entry.querySelector(sel)?.textContent?.trim() ?? "";
  const aNS = (name) => entry.getElementsByTagNameNS("http://arxiv.org/schemas/atom", name)[0]?.textContent?.trim() ?? "";

  return {
    arxiv_id: txt("id").replace(/^https?:\/\/arxiv\.org\/abs\//, ""),
    title: txt("title"),
    summary: txt("summary"),
    published: txt("published"),
    updated: txt("updated"),
    authors: [...entry.querySelectorAll("author > name")].map(n => n.textContent.trim()),
    categories: [...entry.querySelectorAll("category")].map(c => c.getAttribute("term")),
    doi: aNS("doi"),
    journal_ref: aNS("journal_ref"),
    comment: aNS("comment"),
    pdf: entry.querySelector('link[type="application/pdf"], link[title="pdf"]')?.getAttribute("href") ?? ""
  };
}

function renderPapers(papers) {
  const list = document.getElementById("paperList");
  list.innerHTML = "";
  if (papers.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No saved papers";
    li.className = "empty-message";
    list.appendChild(li);
    return;
  }
  const latest = papers.slice(-5).reverse();
  for (const p of latest) {
    const li = document.createElement("li");
    li.textContent = `${p.title} (${p.year})`;
    list.appendChild(li);
  }
}

function loadPapers() {
  chrome.storage.local.get(["papers"], (result) => {
    renderPapers(result.papers || []);
  });
}

setInterval(loadPapers, 100);
