chrome.action.onClicked.addListener((tab) => {
  chrome.storage.local.get('lastPaper').then(({ lastPaper }) => {
    if (!lastPaper) {
      chrome.tabs.sendMessage(tab.id, 'SAVE_PAPER', resp => {
        console.log(resp.status);
      });
    } else {
      // AWSへ要約リクエスト
      fetch('https://<API_GATEWAY_URL>/summarize', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ paper: lastPaper })
      })
      .then(r => r.json())
      .then(result => {
        // 結果をポップアップへ渡す
        chrome.storage.local.set({ summaryResult: result });
        chrome.action.openPopup();
      });
    }
  });
});
