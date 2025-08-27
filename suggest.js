document.getElementById("suggestBtn").addEventListener("click", () => {
  chrome.storage.local.get(["papers"], async (data) => {
    const keywords = (data.papers || []).map(p => p.title).join(" ");
    if (!keywords) {
      return;
    }
    try {
      const res = await fetch(
        `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(keywords)}&sortBy=submittedDate&sortOrder=descending&max_results=5`
      );
      const text = await res.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "application/xml");
      const entries = Array.from(xml.getElementsByTagName("entry")).map(e => ({
        title: e.getElementsByTagName("title")[0].textContent.trim(),
        link: e.getElementsByTagName("id")[0].textContent.trim()
      }));
      displaySuggestions(entries);
    } catch (err) {
      console.error("Suggestion fetch failed", err);
    }
  });
});

function displaySuggestions(suggestions) {
  const list = document.getElementById("suggestList");
  list.innerHTML = "";
  for (const s of suggestions) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = s.link;
    a.textContent = s.title;
    a.target = "_blank";
    a.addEventListener("click", () => {
      chrome.storage.local.get({ viewedSuggestions: [] }, ({ viewedSuggestions }) => {
        if (!viewedSuggestions.includes(s.link)) {
          chrome.storage.local.set({ viewedSuggestions: [...viewedSuggestions, s.link] });
        }
      });
    });
    li.appendChild(a);
    list.appendChild(li);
  }
}

