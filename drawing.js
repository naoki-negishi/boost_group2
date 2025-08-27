function loadPapers() {
  chrome.storage.local.get(["papers"], (result) => {
    renderPapers(result.papers || []);
  });
}

setInterval(loadPapers, 100);
