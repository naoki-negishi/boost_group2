const input = document.getElementById("pdfInput");
const analyzeBtn = document.getElementById("analyzeBtn");

input.addEventListener("change", () => {
  analyzeBtn.disabled = false;
  analyzeBtn.textContent = "analyze";
});

analyzeBtn.addEventListener("click", async () => {
  if (!input.files.length) return alert("请上传 PDF 文件");

  const file = input.files[0];
  analyzeBtn.disabled = true;
  analyzeBtn.textContent = "analyzing...";

  try {
    // 维持 popup 活跃
    const result = await mockAnalyzePDF(file);

    await saveDoc(result);
    await updateList();

    analyzeBtn.textContent = "✅ analysis success";
    input.value = ""; // 清空文件选择器
  } catch (e) {
    console.error(e);
    alert("analyze failed: " + e.message);
    analyzeBtn.textContent = "analyze";
  } finally {
    analyzeBtn.disabled = false;
  }
});

async function updateList() {
  const docs = await getDocs();
  const list = document.getElementById("docList");
  list.innerHTML = "";

  for (const doc of docs) {
    const li = document.createElement("li");
    li.innerHTML = `
      <b>${doc.title}</b> (${doc.year})<br>
      ${doc.authors.join(", ")}<br>
      <i>${doc.summary}</i>
    `;
    list.appendChild(li);
  }
}

updateList();
