// ====== CONFIGURATION ======
const API_URL = "https://9router.vuhai.io.vn/v1/chat/completions";
const API_KEY = "sk-4bd27113b7dc78d1-lh6jld-f4f9c69f";
const MODEL_NAME = "ces-chatbot-gpt-5.4";
const DEFAULT_GREETING = "👋 Xin chào! Tôi là trợ lý AI thông minh tích hợp trên website. Tôi có thể giúp gì cho bạn hôm nay?";

let systemPrompt = "";
let chatHistory = [];

// ======= DOM ELEMENTS =======
const toggleBtn = document.getElementById('chatbot-toggle');
const closeBtn = document.getElementById('chatbot-close');
const refreshBtn = document.getElementById('chatbot-refresh');
const chatWindow = document.getElementById('chatbot-window');
const chatMessages = document.getElementById('chatbot-messages');
const chatInput = document.getElementById('chatbot-input');
const sendBtn = document.getElementById('chatbot-send');

// ====== INITIALIZE (Load Data & Event Listeners) ======

async function initChatbot() {
    let knowledgeBase = "";
    // 1. Tải dữ liệu Knowledge Base an toàn
    try {
        const response = await fetch('./chatbot_data.txt');
        if (response.ok) {
            knowledgeBase = await response.text();
        } else {
            console.warn("Không tìm thấy file chatbot_data.txt");
        }
    } catch (error) {
        console.warn("Lỗi tải file tĩnh do chạy qua giao thức file:// (CORS Local). Hệ thống tự kích hoạt dữ liệu dự phòng.");
        knowledgeBase = `* Tên chuyên gia: Nguyễn Văn A\n* Định vị: Chuyên gia AI & Tự động hóa\n* Khóa học: K89 - Agentic AI\n* Liên hệ: a@example.com | Zalo 0123456789`;
    }

    // 2. Tạo System Prompt (ALWAYS EXECUTED)
    systemPrompt = `Bạn là AI trợ lý cá nhân độc quyền trên website của chuyên gia Nguyễn Văn A.
Nhiệm vụ của bạn là hỗ trợ khách truy cập lịch sự, cung cấp thông tin chính xác về các dịch vụ, khóa học, và dự án của chuyên gia này.

Dưới đây là cơ sở dữ liệu kiến thức (Knowledge Base) của bạn:
${knowledgeBase}

Quy tắc giao tiếp bắt buộc:
1. Luôn chào thân thiện.
2. Bạn phải định dạng các câu trả lời của mình bằng Markdown đầy đủ (in đậm ý chính, dùng gạch đầu dòng, tạo code block nếu cần).
3. Nếu người dùng hỏi điều gì ngoài phạm vi dữ liệu trên, hãy tế nhị từ chối và hướng dẫn họ liên hệ Zalo trực tiếp cho chuyên gia. 
4. Không được phép bịa đặt thông tin.`;

    // Setup lịch sử ban đầu (KHÔNG BAO GIỜ BỊ SÓT)
    chatHistory = [{ role: "system", content: systemPrompt }];

    // Lời chào đầu tiên
    addAIMessage(DEFAULT_GREETING);
}

// Chạy Init khi load trang xong
document.addEventListener('DOMContentLoaded', initChatbot);

// --- Toggle UI & Auto Focus ---
toggleBtn.addEventListener('click', () => {
    chatWindow.classList.remove('hidden');
    setTimeout(() => chatWindow.classList.add('chatbot-visible'), 10);
    setTimeout(() => chatInput.focus(), 300);
});

closeBtn.addEventListener('click', () => {
    chatWindow.classList.remove('chatbot-visible');
    setTimeout(() => chatWindow.classList.add('hidden'), 300);
});

// --- Logic Nút Refresh BẮT BUỘC ---
refreshBtn.addEventListener('click', () => {
    const icon = refreshBtn.querySelector('span'); // Material icon span
    
    // 1. Xoay icon
    icon.classList.add('spin-anim');
    
    // 2. Xóa history UI && memory
    chatMessages.innerHTML = '';
    chatHistory = [{ role: "system", content: systemPrompt }];
    
    // 3. Hiển thị lại tin nhắn default
    addAIMessage(DEFAULT_GREETING);
    
    // 4. Đúng 500ms thì dừng
    setTimeout(() => {
        icon.classList.remove('spin-anim');
    }, 500);
});

// --- Send Messages ---
sendBtn.addEventListener('click', handleSend);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
});

// ====== LOGIC API & UI ======

async function handleSend() {
    const text = chatInput.value.trim();
    if (!text) return;

    // Hiển thị user message
    addUserMessage(text);
    chatInput.value = '';
    chatHistory.push({ role: "user", content: text });

    // Hiển thị typing / Disable input
    const typingId = showTypingIndicator();
    sendBtn.disabled = true;

    try {
        // Gửi API đến Custom URL OpenAI Compatible
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL_NAME,
                messages: chatHistory
            })
        });

        if (!response.ok) throw new Error("API Error: " + response.status);
        
        const data = await response.json();
        const aiResponseText = data.choices[0].message.content;

        // Xóa Typing & Hiển thị kết quả AI
        removeElement(typingId);
        addAIMessage(aiResponseText);
        chatHistory.push({ role: "assistant", content: aiResponseText });

    } catch (error) {
        removeElement(typingId);
        addAIMessage("Xin lỗi, hệ thống AI đang bận hoặc có lỗi kết nối mạng (" + error.message + "). Vui lòng thử lại sau!");
        console.error("LLM API Fetch Error:", error);
    } finally {
        sendBtn.disabled = false;
        chatInput.focus();
    }
}

// ====== RENDER HELPERS ======

function addUserMessage(text) {
    const div = document.createElement('div');
    // We override styles using the style attribute briefly if CSS classes are mixed with AUREUM 
    // Here we use the msg-user class from our chatbot.css
    div.className = 'msg-user';
    div.textContent = text;
    chatMessages.appendChild(div);
    scrollToBottom();
}

function addAIMessage(markdownText) {
    const div = document.createElement('div');
    div.className = 'msg-ai chat-markdown';
    // Parser sinh Markdown -> HTML bằng marked.js
    div.innerHTML = marked.parse(markdownText);
    chatMessages.appendChild(div);
    scrollToBottom();
}

function showTypingIndicator() {
    const id = 'typing-' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = 'msg-ai typing-indicator p-3 flex items-center justify-center';
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
    // Scroll mượt xuống tin nhắn mới nhất
    chatMessages.scrollTo({
        top: chatMessages.scrollHeight,
        behavior: 'smooth'
    });
}
