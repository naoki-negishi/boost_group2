document.getElementById("suggestBtn").addEventListener("click", updateSuggestions);

function updateSuggestions() {
  chrome.storage.local.get(["papers"], async (data) => {
    const keywords = (data.papers || []).map(p => p.keywords);

    if (!keywords) {
      alert("No keywords found from saved papers.");
      return;
    }
    const search_query = encodeURIComponent(keywords.join("+OR+"));
    try {
      const now = new Date().toISOString().split("T")[0];
      const one_week_ago = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const url = `https://export.arxiv.org/api/query?search_query=all:${search_query}&sortBy=submittedDate&sortOrder=descending&max_results=5&submittedDate:[${one_week_ago}+TO+${now}]`;
      const xml = await fetch(url).then(r => r.text());
      const doc = new DOMParser().parseFromString(xml, "application/xml");

      const entries = Array.from(doc.getElementsByTagName("entry")).map(e => ({
        title: e.getElementsByTagName("title")[0].textContent.trim(),
        link: e.getElementsByTagName("id")[0].textContent.trim()
      }));
      displaySuggestions(entries);
    } catch (err) {
      console.error("Suggestion fetch failed", err);
    }
  });
};
updateSuggestions();
setInterval(updateSuggestions, 1000);

function displaySuggestions(suggestions) {
  const list = document.getElementById("suggestList");
  list.innerHTML = "";
  if (suggestions.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No suggestions";
    li.className = "empty-message";
    list.appendChild(li);
    return;
  }
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

