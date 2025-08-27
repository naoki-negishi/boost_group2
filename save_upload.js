document.getElementById("saveUploadBtn").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab || !tab.url) return;

    // arxiv
    let pdfUrl = tab.url;
    if (/^https?:\/\/arxiv\.org\/abs\//.test(pdfUrl)) {
      const id = pdfUrl.split('/abs/')[1];
      pdfUrl = `https://arxiv.org/pdf/${id}.pdf`;
    }
    else if (/^https?:\/\/arxiv\.org\/pdf\//.test(pdfUrl)) {
      pdfUrl = `${pdfUrl}.pdf`;
    }

    if (pdfUrl && pdfUrl.endsWith(".pdf")) {
      fetch(pdfUrl)
        .then((res) => res.blob())
        .then(() => {
          const paper = {
            title: tab.title || "Untitled",
            authors: "",
            year: new Date().getFullYear(),
            url: pdfUrl
          };
          chrome.runtime.sendMessage({ type: "addPaper", payload: paper });
        });
    }else{
      chrome.windows.create({ url: "upload.html", type: "popup", width: 400, height: 300 });
    }
  });
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

function loadPapers() {
  chrome.storage.local.get(["papers"], (result) => {
    renderPapers(result.papers || []);
  });
}

setInterval(loadPapers, 100);
