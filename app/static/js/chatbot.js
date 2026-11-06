/**
 * GlobeTrek AI – Conversational Travel Concierge Client
 */
document.addEventListener("DOMContentLoaded", () => {
  const chatForm = document.getElementById("chatForm");
  const chatInput = document.getElementById("chatInput");
  const chatSendBtn = document.getElementById("chatSendBtn");
  const chatMessagesContainer = document.getElementById("chatMessagesContainer");
  const chatLangSelect = document.getElementById("chatLanguageSelect");
  const promptChips = document.querySelectorAll(".prompt-chip");

  if (!chatForm || !chatInput || !chatMessagesContainer) return;

  // Session ID persistence
  let sessionId = localStorage.getItem("globetrek_chat_session");
  if (!sessionId) {
    sessionId = "gt_" + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
    localStorage.setItem("globetrek_chat_session", sessionId);
  }

  // Quick prompt buttons
  promptChips.forEach(chip => {
    chip.addEventListener("click", () => {
      const prompt = chip.getAttribute("data-prompt");
      if (prompt) {
        chatInput.value = prompt;
        chatForm.dispatchEvent(new Event("submit"));
      }
    });
  });

  // Submit message
  chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;

    const language = chatLangSelect ? chatLangSelect.value : "en";

    // Append user message
    appendUserMessage(message);
    chatInput.value = "";
    chatSendBtn.disabled = true;

    // Append loading indicator
    const loadingElem = appendLoadingBubble();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message,
          session_id: sessionId,
          language: language,
        }),
      });

      const data = await response.json();
      loadingElem.remove();

      if (data && data.response) {
        appendAiMessage(data.response);
      } else {
        appendAiMessage("I encountered an error retrieving live details. Please try rephrasing your request.");
      }
    } catch (err) {
      loadingElem.remove();
      appendAiMessage("Network connectivity issue. Please check your connection and try again.");
    } finally {
      chatSendBtn.disabled = false;
      chatInput.focus();
    }
  });

  function appendUserMessage(text) {
    const wrapper = document.createElement("div");
    wrapper.className = "d-flex justify-content-end mb-3 animate-fade-in";
    wrapper.innerHTML = `
      <div class="chat-bubble-user">
        <p class="mb-0 text-white">${escapeHtml(text)}</p>
      </div>
    `;
    chatMessagesContainer.appendChild(wrapper);
    scrollToBottom();
  }

  function appendAiMessage(markdownText) {
    const wrapper = document.createElement("div");
    wrapper.className = "d-flex gap-2.5 mb-3 animate-fade-in";
    
    // Simple formatting for bold, inline code, links, newlines, and bullet points
    let formatted = escapeHtml(markdownText)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-light px-1 rounded text-teal small">$1</code>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="btn btn-sm btn-teal text-white rounded-pill ms-1 py-0 px-2 fw-semibold text-decoration-none shadow-sm" style="font-size:0.75rem;">$1 <i class="bi bi-arrow-right"></i></a>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n- /g, '<br>• ')
      .replace(/\n/g, '<br>');

    wrapper.innerHTML = `
      <div class="ai-msg-avatar rounded-circle bg-teal text-white shrink-0 d-flex align-items-center justify-content-center" style="width: 32px; height: 32px; min-width: 32px;">
        <i class="bi bi-stars" style="font-size: 0.85rem;"></i>
      </div>
      <div class="chat-bubble-ai">
        <p class="mb-0">${formatted}</p>
      </div>
    `;
    chatMessagesContainer.appendChild(wrapper);
    scrollToBottom();
  }

  function appendLoadingBubble() {
    const wrapper = document.createElement("div");
    wrapper.className = "d-flex gap-2.5 mb-3 animate-fade-in chat-loading";
    wrapper.innerHTML = `
      <div class="ai-msg-avatar rounded-circle bg-teal text-white shrink-0 d-flex align-items-center justify-content-center" style="width: 32px; height: 32px; min-width: 32px;">
        <i class="bi bi-stars" style="font-size: 0.85rem;"></i>
      </div>
      <div class="chat-bubble-ai d-flex align-items-center gap-2 py-2.5">
        <div class="spinner-grow spinner-grow-sm text-teal" role="status"></div>
        <span class="small text-muted">Checking destinations & events...</span>
      </div>
    `;
    chatMessagesContainer.appendChild(wrapper);
    scrollToBottom();
    return wrapper;
  }

  function scrollToBottom() {
    chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
  }

  function escapeHtml(string) {
    const div = document.createElement("div");
    div.innerText = string;
    return div.innerHTML;
  }
});

