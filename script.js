document.addEventListener('DOMContentLoaded', () => {
    // --- Initialize Icons ---
    lucide.createIcons();

    // --- DOM Element References ---
    const welcomeScreen = document.getElementById('welcome-screen');
    const messageLog = document.getElementById('message-log');
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.querySelector('.send-button');
    const fileInput = document.getElementById('file-input');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const userProfileButton = document.querySelector('.user-profile');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsButton = document.getElementById('close-settings-btn');
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.querySelector('.sidebar-toggle-button');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');
    const container = document.querySelector('.chatbot-container');
    const conversationList = document.getElementById('conversation-list');
    const newChatButton = document.querySelector('.new-chat-button');
    const webSearchButton = document.querySelector('.web-search-button');
    const themeToggle = document.getElementById('theme-toggle');

    // --- State Variables ---
    let attachedFile = null;
    let previewObjectURL = null;
    let previousModel = 'openai'; // Stores the model before switching to searchgpt
    let isDarkMode = false; // Initial state for theme
    let isNewChatPending = false; // State to track if a new chat is pending
    let conversationCounter = 1; // To name new chats

    // --- Theme Management ---
    const applyTheme = (darkModeEnabled) => {
        if (darkModeEnabled) {
            document.body.classList.add('dark-mode');
            isDarkMode = true;
        } else {
            document.body.classList.remove('dark-mode');
            isDarkMode = false;
        }
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    };

    // Apply theme on initial load
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        applyTheme(true);
        if (themeToggle) themeToggle.checked = true;
    } else {
        applyTheme(false);
        if (themeToggle) themeToggle.checked = false;
    }

    if (themeToggle) {
        themeToggle.addEventListener('change', (event) => {
            applyTheme(event.target.checked);
        });
    }

    // --- Sidebar & Chat Management ---

    // Function to add interaction listeners to a conversation item
    const addConversationListeners = (item) => {
        const link = item.querySelector('.conversation-link');
        const renameBtn = item.querySelector('.rename-btn');
        const deleteBtn = item.querySelector('.delete-btn');

        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.conversation-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            // In a real app, you would load this chat's history.
            // For now, we just reset to the welcome screen.
            resetChatView();

            // Close sidebar if on smaller screen and sidebar is open
            if (window.innerWidth <= 900 && sidebar.classList.contains('active')) {
                toggleSidebar();
            }
        });

        renameBtn.addEventListener('click', () => {
            const span = link.querySelector('span');
            const currentName = span.textContent;
            const newName = prompt('Enter new conversation name:', currentName);
            if (newName && newName.trim()) {
                span.textContent = newName.trim();
            }
        });

        deleteBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to delete this conversation?')) {
                const wasActive = item.classList.contains('active');
                item.remove();
                console.log('Conversation item removed.');

                // If the active chat was deleted, select the top one or create a new default
                if (wasActive) {
                    if (conversationList.children.length > 0) {
                        conversationList.firstElementChild.classList.add('active');
                         console.log('Selected first conversation as active.');
                    } else {
                        // If list is empty, create a new default conversation
                         console.log('Conversation list empty, creating new default chat.');
                        createDefaultConversation();
                    }
                    resetChatView(); // Reset chat view after changing active chat or creating new
                } else if (conversationList.children.length === 0) {
                     // If a non-active chat was deleted and the list became empty
                     console.log('Conversation list empty after deleting non-active chat, creating new default chat.');
                     createDefaultConversation();
                     resetChatView(); // Reset chat view
                 }
             }
         });
    };

    const createDefaultConversation = () => {
        const newDefaultName = "New Chat";
        const newDefaultItem = document.createElement('li');
        newDefaultItem.className = 'conversation-item active';
        newDefaultItem.innerHTML = `
             <a href="#" class="conversation-link">
                 <span>${newDefaultName.trim()}</span>
             </a>
             <div class="conversation-actions">
                 <button class="action-btn rename-btn" aria-label="Rename conversation"><i data-lucide="file-pen-line"></i></button>
                 <button class="action-btn delete-btn" aria-label="Delete conversation"><i data-lucide="trash-2"></i></button>
             </div>
         `;
         conversationList.prepend(newDefaultItem);
         addConversationListeners(newDefaultItem); // Add listeners to the new default item
         lucide.createIcons();
         console.log('New default conversation created and set as active.');
    };

    // Add listeners to the initial conversation item
    document.querySelectorAll('.conversation-item').forEach(addConversationListeners);
    if (conversationList.children.length === 0) {
        createDefaultConversation(); // Ensure at least one conversation exists on load
    }
    
    // New Chat Button Logic
    newChatButton.addEventListener('click', () => {
        console.log('New Chat button clicked');
        // Deselect current active chat
        const currentActive = document.querySelector('.conversation-item.active');
        if (currentActive) currentActive.classList.remove('active');

        resetChatView();
        isNewChatPending = true; // Mark that a new chat is pending
        console.log('New chat pending state set.');

        // Close sidebar if on smaller screen and sidebar is open
        if (window.innerWidth <= 900 && sidebar.classList.contains('active')) {
            toggleSidebar();
        }
    });

    const resetChatView = () => {
        messageLog.innerHTML = '';
        messageLog.classList.add('hidden');
        welcomeScreen.classList.remove('hidden');
    };

    const toggleSidebar = () => {
        const isDesktop = window.innerWidth > 900;
        sidebar.classList.toggle('active');
        container.classList.toggle('sidebar-open-desktop', isDesktop && sidebar.classList.contains('active'));
        sidebarOverlay.classList.toggle('active', !isDesktop && sidebar.classList.contains('active'));
    };
    sidebarToggle.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', toggleSidebar);

    // --- Web Search Button Logic ---
    webSearchButton.addEventListener('click', () => {
        const modelSelect = document.getElementById('model-select');
        if (webSearchButton.classList.toggle('active')) {
            // Web search is enabled
            previousModel = modelSelect.value; // Save current model
            modelSelect.value = 'searchgpt';
        } else {
            // Web search is disabled
            modelSelect.value = previousModel; // Restore previous model
        }
        lucide.createIcons(); // Re-render icons if needed (e.g., if icon changes for active state)
    });


    // --- Settings Modal Logic ---
    const toggleSettingsModal = () => {
        settingsModal.classList.toggle('hidden');
        lucide.createIcons();
    };
    userProfileButton.addEventListener('click', toggleSettingsModal);
    closeSettingsButton.addEventListener('click', toggleSettingsModal);
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) toggleSettingsModal();
    });

    // --- File Handling & Preview ---
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            attachedFile = fileInput.files[0];
            showImagePreview(attachedFile);
        }
    });

    function showImagePreview(file) {
        if (previewObjectURL) URL.revokeObjectURL(previewObjectURL);
        previewObjectURL = URL.createObjectURL(file);
        
        imagePreviewContainer.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'image-preview-wrapper';
        
        const img = document.createElement('img');
        img.src = previewObjectURL;
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-preview-btn';
        removeBtn.innerHTML = '<i data-lucide="x" style="width:14px; height:14px;"></i>';
        removeBtn.onclick = () => {
            attachedFile = null;
            fileInput.value = '';
            imagePreviewContainer.innerHTML = '';
            URL.revokeObjectURL(previewObjectURL);
            previewObjectURL = null;
        };

        wrapper.appendChild(img);
        wrapper.appendChild(removeBtn);
        imagePreviewContainer.appendChild(wrapper);
        lucide.createIcons();
    }

    // --- Core Chat Logic ---
    async function handleSendMessage() {
        const messageText = chatInput.value.trim();
        const imageFile = attachedFile;
        const imageURLForBubble = previewObjectURL;

        if (!messageText && !imageFile) return;

        if (!welcomeScreen.classList.contains('hidden')) {
            welcomeScreen.classList.add('hidden');
            messageLog.classList.remove('hidden');
        }

        if (isNewChatPending) {
            // Create and add new chat item on the first message
            const newName = `New Chat ${conversationCounter++}`; // Default name
            const newItem = document.createElement('li');
            newItem.className = 'conversation-item active';
            newItem.innerHTML = `
                <a href="#" class="conversation-link">
                    <span>${newName.trim()}</span>
                </a>
                <div class="conversation-actions">
                    <button class="action-btn rename-btn" aria-label="Rename conversation"><i data-lucide="file-pen-line"></i></button>
                    <button class="action-btn delete-btn" aria-label="Delete conversation"><i data-lucide="trash-2"></i></button>
                </div>
            `;
            console.log('Creating new conversation item on first message:', newItem);
            conversationList.prepend(newItem);
            addConversationListeners(newItem); // Add listeners to the new item
            lucide.createIcons(); // Re-create icons including for the new item

            isNewChatPending = false; // Reset the pending state
            console.log('New chat pending state reset.');
        }

        // Proceed with sending the message
        appendMessage(messageText, 'user', false, imageURLForBubble);
        chatInput.value = '';
        imagePreviewContainer.innerHTML = '';
        attachedFile = null;
        fileInput.value = '';
        previewObjectURL = null;

        const thinkingBubble = appendMessage('', 'bot', true);
        const selectedModel = document.getElementById('model-select').value.trim();
        let systemPromptContent = document.getElementById('system-prompt').value.trim();

        // Use a different system prompt for searchgpt
        if (selectedModel === 'searchgpt') {
            systemPromptContent = "You are a helpful assistant that can answer questions by performing web searches.";
        }

        const messages = [];
        if (systemPromptContent) messages.push({ role: 'system', content: systemPromptContent });

        const userContent = [];
        const textContent = messageText || (imageFile ? "What's in this image?" : "");
        if (textContent) userContent.push({ type: 'text', text: textContent });

        if (imageFile) {
            const base64Image = await toBase64(imageFile);
            userContent.push({ type: 'image_url', image_url: { url: `data:${imageFile.type};base64,${base64Image}` } });
        }

        messages.push({ role: 'user', content: userContent });

        await fetchAndStream(messages, selectedModel, thinkingBubble);
    }
    
    function appendMessage(text, role, isTyping = false, imageUrl = null) {
        const messageBubble = document.createElement('div');
        messageBubble.className = `message-bubble ${role}-message`;
    
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
    
        if (isTyping) {
            contentDiv.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
        } else {
            if (imageUrl) {
                const img = document.createElement('img');
                img.src = imageUrl;
                contentDiv.appendChild(img);
            }
            if (text) {
                const textElement = document.createElement('p');
                textElement.innerHTML = role === 'bot' ? marked.parse(text) : text;
                contentDiv.appendChild(textElement);
            }
        }
    
        messageBubble.appendChild(contentDiv);
        messageLog.appendChild(messageBubble);
    
        lucide.createIcons();
        messageLog.scrollTop = messageLog.scrollHeight;
    
        return messageBubble;
    }
    
    // UPDATED: More robust streaming implementation
    async function fetchAndStream(messages, model, thinkingBubble) {
        const payload = { model, messages, stream: true };
        
        try {
            const response = await fetch('https://text.pollinations.ai/openai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
    
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let botMessageContent = '';
            let isFirstChunk = true;
    
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
    
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n");
    
                for (const line of lines) {
                    if (line.trim().startsWith('data: ')) {
                        const dataStr = line.substring(6).trim();
                        if (dataStr === '[DONE]') {
                            return; // Stream finished
                        }
                        try {
                            const json = JSON.parse(dataStr);
                            const contentPart = json.choices?.[0]?.delta?.content || '';
                            if (contentPart) {
                                if (isFirstChunk) {
                                    thinkingBubble.querySelector('.message-content').innerHTML = '';
                                    isFirstChunk = false;
                                }
                                botMessageContent += contentPart;
                                thinkingBubble.querySelector('.message-content').innerHTML = marked.parse(botMessageContent);
                                messageLog.scrollTop = messageLog.scrollHeight;
                            }
                        } catch (err) {
                            console.error('Error parsing stream chunk:', err, 'Chunk:', dataStr);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Fetch error:', err);
            const contentDiv = thinkingBubble.querySelector('.message-content');
            contentDiv.style.color = 'red';
            contentDiv.textContent = `Error: ${err.message}. Please check the console.`;
        }
    }

    // --- Event Listeners ---
    sendButton.addEventListener('click', handleSendMessage);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    // Helper to convert file to Base64
    const toBase64 = file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });
});