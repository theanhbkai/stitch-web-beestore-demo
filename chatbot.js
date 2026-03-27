// ====== CONFIGURATION ======
const API_URL = "https://9router.vuhai.io.vn/v1/chat/completions";
const API_KEY = "sk-4bd27113b7dc78d1-lh6jld-f4f9c69f";
const MODEL_NAME = "ces-chatbot-gpt-5.4";
const DEFAULT_GREETING = "👋 Xin chào! Mình là trợ lý AI của cửa hàng BEESTORE. Bạn đang quan tâm đến dòng iPhone Lock giá tốt hay các sản phẩm Apple nào hôm nay?";

let systemPrompt = "";
let chatHistory = [];

// ======= DOM ELEMENTS =======
const toggleBtn = document.getElementById('chatbot-toggle');
const closeBtn = document.getElementById('chatbot-close');
const refreshBtn = document.getElementById('chatbot-refresh');
const chatWindow = document.getElementById('chatbot-window');
const chatMessages = document.getElementById('chatbot-messages');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const suggestionsContainer = document.getElementById('chatbot-suggestions');
const suggestionChips = document.querySelectorAll('.suggestion-chip');

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
        knowledgeBase = `* Tên cửa hàng: BEESTORE\n* Sản phẩm: iPhone Lock, Macbook, iPad\n* Ưu điểm: Rẻ hơn quốc tế 2-4 triệu, dùng sim ghép CNC vi vu sóng.\n* Liên hệ: Vui lòng nhắn tin Fanpage.`;
    }

    // 2. Tạo System Prompt (ALWAYS EXECUTED)
    systemPrompt = `Bạn là nhân viên tư vấn bán hàng kiêm kỹ thuật viên AI xuất sắc của cửa hàng BEESTORE.
Nhiệm vụ của bạn là tư vấn nhiệt tình, chốt sale khéo léo và giải đáp các lỗi kỹ thuật cho khách hàng mua iPhone, iPad, Macbook, giải tỏa tâm lý e ngại của khách khi dùng iPhone Lock.

Dưới đây là cơ sở dữ liệu kiến thức (Knowledge Base) của cửa hàng:
${knowledgeBase}

Quy tắc giao tiếp bắt buộc:
1. Luôn xưng hô là "Mình" và gọi khách là "Bạn" hoặc "Anh/Chị" một cách thân thiện.
2. Bạn phải định dạng các câu trả lời của mình bằng Markdown đầy đủ (in đậm giá tiền, dùng gạch đầu dòng tính năng).
3. Bạn ĐƯỢC PHÉP dùng kho kiến thức khổng lồ của bạn (LLM) để giải đáp các câu hỏi chung của người dùng liên quan đến thủ thuật Apple, công nghệ, so sánh các vi xử lý. Chỉ khi họ hỏi thông tin bảo hành mập mờ KHÔNG CÓ trong Knowledge Base thì mới hướng dẫn họ liên hệ Zalo kỹ thuật.
4. Tôn vinh điểm mạnh của iPhone Lock (Giá rẻ, dùng ổn định như quốc tế qua SIM ghép). Không bao giờ nói xấu sản phẩm của cửa hàng.`;

    // Setup lịch sử ban đầu (KHÔNG BAO GIỜ BỊ SÓT)
    chatHistory = [{ role: "system", content: systemPrompt }];

    // Lời chào đầu tiên
    addAIMessage(DEFAULT_GREETING);
}

// Chạy Init khi load trang xong
document.addEventListener('DOMContentLoaded', initChatbot);

// --- Toggle UI & Auto Focus ---
toggleBtn.addEventListener('click', () => {
    // Với File CSS của bạn, hiển thị Chatbot chỉ cần thêm class 'open'
    chatWindow.classList.add('open');
    setTimeout(() => chatInput.focus(), 300);
});

closeBtn.addEventListener('click', () => {
    chatWindow.classList.remove('open');
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
    
    // Khôi phục hiển thị lại 3 nút gợi ý
    if (suggestionsContainer) {
        suggestionsContainer.style.display = 'flex';
    }
    
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

// Xử lý chặn nút Gửi khi input rỗng
chatInput.addEventListener('input', () => {
    sendBtn.disabled = chatInput.value.trim() === '';
});

// Logic chuyên biệt cho 3 nút gợi ý
document.getElementById('chip-deal').addEventListener('click', () => {
    window.open('https://zalo.me/g/comutv606', '_blank');
});

document.getElementById('chip-price').addEventListener('click', () => {
    chatInput.value = document.getElementById('chip-price').textContent.trim();
    chatInput.dispatchEvent(new Event('input')); 
    handleSend();
});

document.getElementById('chip-call').addEventListener('click', () => {
    window.location.href = 'tel:0866808626';
});

// ====== LOGIC API & UI ======

async function handleSend() {
    const text = chatInput.value.trim();
    if (!text) return;

    // Ẩn 3 nút gợi ý đi để tối ưu diện tích sau khi đã bắt đầu chat
    if (suggestionsContainer) {
        suggestionsContainer.style.display = 'none';
    }

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
    // Class `.user` .chatbot-message được CSS của bạn định dạng
    div.className = 'chatbot-message user';
    div.textContent = text;
    chatMessages.appendChild(div);
    scrollToBottom();
}

function addAIMessage(markdownText) {
    const wrapper = document.createElement('div');
    wrapper.className = 'bot-message-wrapper';

    const avatar = document.createElement('img');
    avatar.src = 'logo.jpg';
    avatar.className = 'bot-avatar';
    avatar.alt = 'AI';

    const div = document.createElement('div');
    div.className = 'chatbot-message bot chat-markdown';
    // Parser sinh Markdown -> HTML bằng marked.js
    div.innerHTML = marked.parse(markdownText);
    
    wrapper.appendChild(avatar);
    wrapper.appendChild(div);
    chatMessages.appendChild(wrapper);
    scrollToBottom();
}

function showTypingIndicator() {
    const id = 'typing-' + Date.now();
    const wrapper = document.createElement('div');
    wrapper.id = id;
    wrapper.className = 'bot-message-wrapper';

    const avatar = document.createElement('img');
    avatar.src = 'logo.jpg';
    avatar.className = 'bot-avatar';
    avatar.alt = 'AI';

    const div = document.createElement('div');
    div.className = 'chatbot-message bot typing-indicator';
    div.innerHTML = `
        <div class="dots-wrapper">
            <span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
        </div>
        <div class="typing-text">Đang trả lời tin nhắn</div>
    `;
    
    wrapper.appendChild(avatar);
    wrapper.appendChild(div);
    chatMessages.appendChild(wrapper);
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
