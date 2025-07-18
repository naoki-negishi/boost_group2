function mockAnalyzePDF(file) {
  return new Promise((resolve) => {
    const mockResult = {
      title: file.name.replace(".pdf", ""),
      authors: ["John Doe", "Alice Smith"],
      year: 2023,
      keywords: ["LLM", "PDF", "Chrome Extension"],
      summary: "This paper discusses mock analysis of PDF files for literature management.",
      model_image: null // base64 或 image URL（留空）
    };
    setTimeout(() => resolve(mockResult), 1000);
  });
}
