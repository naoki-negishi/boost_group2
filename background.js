chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "addPaper") {
    chrome.storage.local.get(["papers"], (result) => {
      const papers = result.papers || [];
      papers.push(msg.payload);
      chrome.storage.local.set({ papers }, () => {
        sendResponse({ success: true });
      });
    });
    return true; // keep sendResponse valid async
  }
});