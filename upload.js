document.getElementById("analyzeBtn").addEventListener("click", () => {
  const fileInput = document.getElementById("pdfFile");
  const file = fileInput.files[0];
  if (!file) return alert("Please select a file.");

  // 模拟分析过程
  document.getElementById("status").textContent = "Analyzing...";

  setTimeout(() => {
    const paper = {
      id: Date.now().toString(),
      title: "Sample Title from " + file.name,
      authors: ["John Doe"],
      year: 2024,
      keywords: ["demo"],
      summary: "Auto-generated summary.",
      pdfPath: file.name,
      tags: ["Uploaded"],
      cluster: 0,
      createdAt: new Date().toISOString()
    };

    chrome.runtime.sendMessage({ type: "addPaper", payload: paper }, () => {
      document.getElementById("status").textContent = "Upload and analysis complete.";
    });
  }, 1000);
});
