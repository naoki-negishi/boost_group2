function showToast(message) {
  const toast = document.createElement("div");
  toast.textContent = message;
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "30px",
    left: "50%",
    transform: "translateX(-50%)",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    color: "#fff",
    padding: "12px 20px",
    borderRadius: "4px",
    zIndex: 1000,
    fontSize: "14px",
  });
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2000);
}

document.getElementById("clearCache").addEventListener("click", () => {
  chrome.storage.local.clear(() => {
    showToast("All cache cleared");
  });
});
