const DB_KEY = "literature_db";

async function loadDB() {
  return new Promise((resolve) => {
    chrome.storage.local.get([DB_KEY], (result) => {
      resolve(result[DB_KEY] || { documents: [] });
    });
  });
}

async function saveDoc(doc) {
  const db = await loadDB();
  doc.id = Date.now().toString(); // 简单 ID
  db.documents.push(doc);
  chrome.storage.local.set({ [DB_KEY]: db });
}

async function getDocs() {
  const db = await loadDB();
  return db.documents;
}
