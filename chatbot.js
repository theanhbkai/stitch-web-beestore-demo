// --- CONFIGURATION ---
const API_URL = "https://9router.vuhai.io.vn/v1/chat/completions";
const API_KEY = "sk-4bd27113b7dc78d1-lh6jld-f4f9c69f";
const MODEL_NAME = "ces-chatbot-gpt-5.4";

let systemPrompt = `Vai trò: Bạn là AI trợ lý độc quyền cho chuyên gia Nguyễn Văn A.
Chỉ được trả lời dựa trên Knowledge Base.
Phải trả lời bằng Markdown đẹp. Lưu ý sử dụng in đậm, in nghiêng, danh sách,... để trình bày chuyên nghiệp.
Luôn:
- Chào thân thiện
- Trả lời rõ ràng, dễ hiểu
- Kết thúc bằng lời mời hỏi thêm
Nếu câu hỏi nằm ngoài phạm vi trong file thiết lập hoặc không liên quan tiến trình công việc, từ chối nhẹ nhàng và cung cấp thông tin liên hệ cho người dùng.`;

// Load knowledge base từ chatbot_data.txt
fetch('chatbot_data.txt')
    .then(res => res.text())
    .then(data => {
        if(data && data.trim() !== '') {
            systemPrompt += "\n\nKNOWLEDGE BASE:\n" + data;
        }
    })
    .catch(err => console.warn("Could not load local chatbot_data.txt"));

let chatHistory = [];

// --- UI ELEMENTS ---
const toggleBtn = document.getElementById('chatbot-toggle');
const closeBtn = document.getElementById('chatbot-close');
const refreshBtn = document.getElementById('chatbot-refresh');
const chatWindow = document.getElementById('chatbot-window');
const chatMessages = document.getElementById('chatbot-messages');
const chatInput = document.getElementById('chatbot-input');
const sendBtn = document.getElementById('chatbot-send');

const DEFAULT_GREETING = "👋 Xin chào! Tôi là trợ lý AI thông minh tích hợp trên website. Tôi có thể giúp gì cho bạn hôm nay?";

// --- EVENT LISTENERS ---

toggleBtn.addEventListener('click', () => {
    chatWindow.classList.remove('hidden');
    // timeout nhỏ để animation glassmorphism slide up được kích hoạt mượt
    setTimeout(() => chatWindow.classList.add('chatbot-visible'), 10);
});

closeBtn.addEventListener('click', () => {
    chatWindow.classList.remove('chatbot-visible');
    setTimeout(() => chatWindow.classList.add('hidden'), 300);
});

refreshBtn.addEventListener('click', () => {
    const icon = refreshBtn.querySelector('span');
    icon.classList.add('spin-animation');
    
    // Clear chat display & memory
    chatMessages.innerHTML = '';
    chatHistory = [];
    
    // Reset initial greeting
    addAIMessage(DEFAULT_GREETING);
    
    // Bắt buộc sau đúng 500ms dừng xoay
    setTimeout(() => {
        icon.classList.remove('spin-animation');
    }, 500);
});

sendBtn.addEventListener('click', handleSend);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
});

// --- LOGIC SEND & RECEIVE ---

async function handleSend() {
    const text = chatInput.value.trim();
    if (!text) return;

    // Hiển thị tin user
    addUserMessage(text);
    chatInput.value = '';
    
    // Setup message list cho request OpenRouter compatible
    const apiMessages = [
        { role: "system", content: systemPrompt },
        ...chatHistory,
        { role: "user", content: text }
    ];
    
    // Lưu local
    chatHistory.push({ role: "user", content: text });

    // Hiển thị Typing Indicator nhảy nhót 3 dấu chấm
    const typingId = showTypingIndicator();
    sendBtn.disabled = true;

    try {
        const aiResponse = await fetchAPI(apiMessages);
        // Nhận được response từ AI thì xoá typing đi
        removeElement(typingId);
        // Hiển thị & Lưu history
        addAIMessage(aiResponse);
        chatHistory.push({ role: "assistant", content: aiResponse });
    } catch (error) {
        removeElement(typingId);
        addAIMessage("Xin lỗi, hiện tại tôi đang gặp sự cố kết nối AI. Vui lòng thử lại sau!");
        console.error("API Error:", error);
    } finally {
        sendBtn.disabled = false;
        chatInput.focus();
    }
}

async function fetchAPI(messages) {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
            model: MODEL_NAME,
            messages: messages
        })
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

// --- RENDER FUNCTIONS ---

function addUserMessage(text) {
    const div = document.createElement('div');
    div.className = 'msg-user text-sm';
    div.textContent = text;
    chatMessages.appendChild(div);
    scrollToBottom();
}

function addAIMessage(markdownText) {
    const div = document.createElement('div');
    div.className = 'msg-ai chat-markdown';
    // marked.js Parse markdown text to HTML
    div.innerHTML = marked.parse(markdownText);
    chatMessages.appendChild(div);
    scrollToBottom();
}

function showTypingIndicator() {
    const id = 'typing-' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = 'msg-ai typing-indicator py-3';
    div.innerHTML = `<span></span><span></span><span></span>`;
    chatMessages.appendChild(div);
    scrollToBottom();
    return id;
}

function removeElement(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function scrollToBottom() {
    // Auto scroll down smoothly
    chatMessages.scrollTo({
        top: chatMessages.scrollHeight,
        behavior: 'smooth'
    });
}

// Init run
document.addEventListener('DOMContentLoaded', () => {
    addAIMessage(DEFAULT_GREETING);
});
