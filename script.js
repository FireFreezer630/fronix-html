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
    const conversationList = document.getElementById('conversation-list');
    const newChatButton = document.querySelector('.new-chat-button');
    const webSearchButton = document.querySelector('.web-search-button');
    const themeToggle = document.getElementById('theme-toggle');
    const modelSelect = document.getElementById('model-select');
    const systemPromptInput = document.getElementById('system-prompt');
    const chatInputArea = document.querySelector('.chat-input-area'); // Reference to input area

    // --- State Variables ---
    let attachedFile = null;
    let previewObjectURL = null;
    let isNewChatPending = false; // State to track if a new chat is pending
    let editingMessageDetails = null; // { conversationId: '...', messageIndex: ... }

    // --- Local Storage & State Management ---
    const LOCAL_STORAGE_KEY = 'fronixChatData';
    let chatState = {}; // Main object to hold all chat state

    const saveChatbotData = () => {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(chatState));
            console.log('Chat state saved to local storage.');
        } catch (error) {
            console.error('Error saving to local storage:', error);
        }
    };

    const loadChatbotData = () => {
        try {
            const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (savedData) {
                chatState = JSON.parse(savedData);
                console.log('Chat state loaded from local storage.');
                // Ensure basic structure exists even if loaded data is incomplete
                chatState.conversations = chatState.conversations || [];
                chatState.settings = chatState.settings || {};
                chatState.settings.theme = chatState.settings.theme || 'light'; // Default theme
                chatState.settings.model = chatState.settings.model || 'openai'; // Default model
                chatState.settings.systemPrompt = chatState.settings.systemPrompt || ''; // Default system prompt
                // Ensure active conversation ID is valid or default
                 if (!chatState.conversations.some(conv => conv.id === chatState.activeConversationId)) {
                     chatState.activeConversationId = chatState.conversations.length > 0 ? chatState.conversations[0].id : null;
                 }

            } else {
                // Initialize with default state if no data found
                initializeDefaultChatState();
                 console.log('No local storage data found, initialized with default state.');
            }
        } catch (error) {
            console.error('Error loading from local storage:', error);
            // Initialize with default state on error
            initializeDefaultChatState();
             console.log('Error loading local storage data, initialized with default state.');
        }
    };

    const initializeDefaultChatState = () => {
         const initialConversationId = Date.now().toString(); // Simple unique ID
         chatState = {
              conversations: [
                  {
                      id: initialConversationId,
                      name: "Welcome",
                      messages: [
                          { "role": "bot", "content": "Hi, User\n\nHow can I help you today?" }
                      ]
                  }
              ],
              settings: {
                  theme: 'light',
                  model: 'openai',
                  systemPrompt: "You are Fronix, a large language model being used in a website called Fronix made by Z-SHADOW ULTRA.\nYou are chatting with the user via the Fronix web app. This means most of the time your lines should be a sentence or two, unless the user's request requires reasoning or long-form outputs. Never use emojis, unless explicitly asked to.\nKnowledge cutoff: 2024-06\nCurrent date: 2025-05-15\n\nImage input capabilities: Enabled\nPersonality: v2\nOver the course of the conversation, you adapt to the user’s tone and preference. Try to match the user’s vibe, tone, and generally how they are speaking. You want the conversation to feel natural. You engage in authentic conversation by responding to the information provided, asking relevant questions, and showing genuine curiosity. If natural, continue the conversation with casual conversation.\n\nIf the user asks to web search or get latest information or information subjected to change tell him to use the web search option which in at the left hand side of the message text box ."
              },
              activeConversationId: initialConversationId
         };
         saveChatbotData(); // Save the initial state immediately
    };


    // --- Theme Management ---
    const applyTheme = (theme) => {
        document.body.classList.remove('dark-mode', 'light-mode');
        document.body.classList.add(theme);
        chatState.settings.theme = theme;
        saveChatbotData();
    };

    // Apply theme on initial load (called after loadChatbotData)
    const loadAndApplyTheme = () => {
         applyTheme(chatState.settings.theme || 'light');
         if (themeToggle) themeToggle.checked = (chatState.settings.theme === 'dark');
    };

    if (themeToggle) {
        themeToggle.addEventListener('change', (event) => {
            applyTheme(event.target.checked ? 'dark-mode' : 'light');
        });
    }

    // --- Sidebar & Chat Management ---

    const renderSidebar = () => {
        conversationList.innerHTML = ''; // Clear current list

        if (chatState.conversations.length === 0) {
             createDefaultConversationInState(); // Ensure at least one exists in state
             saveChatbotData();
        }

        chatState.conversations.forEach(conversation => {
            const item = document.createElement('li');
            item.className = `conversation-item${conversation.id === chatState.activeConversationId ? ' active' : ''}`;
            item.dataset.id = conversation.id; // Store ID on the element

            item.innerHTML = `
                <a href="#" class="conversation-link">
                    <span>${conversation.name}</span>
                </a>
                <div class="conversation-actions">
                    <button class="action-btn rename-btn" aria-label="Rename conversation"><i data-lucide="file-pen-line"></i></button>
                    <button class="action-btn delete-btn" aria-label="Delete conversation"><i data-lucide="trash-2"></i></button>
                </div>
            `;
            conversationList.appendChild(item);
            addConversationListeners(item); // Add listeners to the new item
        });
        lucide.createIcons(); // Re-create icons
    };

    const renderMessages = (conversationId) => {
         messageLog.innerHTML = ''; // Clear current messages
         const conversation = chatState.conversations.find(conv => conv.id === conversationId);

         if (conversation && conversation.messages.length > 0) {
             conversation.messages.forEach((msg, index) => {
                 appendMessage(msg.content, msg.role, false, msg.imageUrl, conversationId, index); // Pass message index for editing
             });
             welcomeScreen.classList.add('hidden');
             messageLog.classList.remove('hidden');
         } else {
             // Show welcome screen if no messages
             messageLog.classList.add('hidden');
             welcomeScreen.classList.remove('hidden');
         }
         messageLog.scrollTop = messageLog.scrollHeight; // Scroll to bottom
    };


    // Function to add interaction listeners to a conversation item
    const addConversationListeners = (item) => {
        const conversationId = item.dataset.id;
        const link = item.querySelector('.conversation-link');
        const renameBtn = item.querySelector('.rename-btn');
        const deleteBtn = item.querySelector('.delete-btn');

        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (chatState.activeConversationId !== conversationId) {
                 chatState.activeConversationId = conversationId;
                 saveChatbotData();
                 renderSidebar(); // Update active class in sidebar
                 renderMessages(conversationId); // Load and display messages

                 // Close sidebar if on smaller screen and sidebar is open
                if (window.innerWidth <= 900 && sidebar.classList.contains('active')) {
                    toggleSidebar();
                }
            }
        });

        renameBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent click from triggering conversation link click
            const conversation = chatState.conversations.find(conv => conv.id === conversationId);
            if (conversation) {
                const span = link.querySelector('span');
                const currentName = conversation.name;
                // Replace span with an input field
                const input = document.createElement('input');
                input.type = 'text';
                input.value = currentName;
                input.className = 'rename-input'; // For styling
                
                span.replaceWith(input);
                input.focus();
                input.select();

                // Handle saving the new name
                const saveName = () => {
                    const newName = input.value.trim();
                    if (newName && newName !== currentName) {
                        conversation.name = newName;
                        saveChatbotData();
                    }
                     renderSidebar(); // Re-render to show the updated name or revert
                };

                // Save on blur or Enter key
                input.addEventListener('blur', saveName);
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        saveName();
                    } else if (e.key === 'Escape') {
                         renderSidebar(); // Revert on escape
                    }
                });
            }
        });

        deleteBtn.addEventListener('click', (e) => {
             e.stopPropagation(); // Prevent click from triggering conversation link click
             if (confirm('Are you sure you want to delete this conversation?')) {
                 // Find index of conversation to delete
                 const indexToDelete = chatState.conversations.findIndex(conv => conv.id === conversationId);

                 if (indexToDelete !== -1) {
                     const wasActive = chatState.activeConversationId === conversationId;
                     chatState.conversations.splice(indexToDelete, 1); // Remove conversation from state
                     console.log(`Conversation with ID ${conversationId} removed from state.`);

                     if (chatState.conversations.length === 0) {
                         // If list is empty, create a new default conversation
                          console.log('Conversation list empty after deletion, creating new default chat.');
                         createDefaultConversationInState();
                         chatState.activeConversationId = chatState.conversations[0].id; // Set new default as active
                          console.log(`New default conversation created with ID ${chatState.activeConversationId}`);
                     } else if (wasActive) {
                          // If the active chat was deleted, set the first remaining as active
                          chatState.activeConversationId = chatState.conversations[0].id;
                           console.log(`Active chat deleted, setting first remaining chat with ID ${chatState.activeConversationId} as active.`);
                     }
                     // If a non-active chat was deleted and others remain, activeConversationId doesn't change

                     saveChatbotData();
                     renderSidebar(); // Update displayed list
                     renderMessages(chatState.activeConversationId); // Render messages for the new active chat
                 }
              }
          });
    };

    const createDefaultConversationInState = () => {
         const newDefaultId = Date.now().toString(); // Simple unique ID
         const newDefaultConversation = {
              id: newDefaultId,
              name: "New Chat",
              messages: []
         };
         chatState.conversations.unshift(newDefaultConversation); // Add to the beginning of the array
         chatState.activeConversationId = newDefaultId;
         isNewChatPending = false; // Not pending anymore, it's created
         console.log(`Created default conversation in state with ID ${newDefaultId}`);
    };


    // New Chat Button Logic
    newChatButton.addEventListener('click', () => {
        console.log('New Chat button clicked');
        // Deselect current active chat visually (state will be handled in handleSendMessage)
        document.querySelectorAll('.conversation-item').forEach(i => i.classList.remove('active'));

        resetChatView(); // Clear messages and show welcome
        isNewChatPending = true; // Mark that a new chat is pending
        chatState.activeConversationId = null; // No active conversation until message sent
        exitEditMode(); // Exit edit mode if active
        saveChatbotData(); // Save state with no active conversation

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
        document.querySelector('.chatbot-container').classList.toggle('sidebar-open-desktop', isDesktop && sidebar.classList.contains('active'));
        sidebarOverlay.classList.toggle('active', !isDesktop && sidebar.classList.contains('active'));
    };
    sidebarToggle.addEventListener('click', toggleSidebar);
    sidebarOverlay.addEventListener('click', toggleSidebar);


    // --- Web Search Button Logic ---
    webSearchButton.addEventListener('click', () => {
        // Logic already exists, but ensure it updates chatState.settings.model
        const isSearchActive = webSearchButton.classList.toggle('active');
        
        // Disable/enable inputs based on search mode
        systemPromptInput.disabled = isSearchActive;
        modelSelect.disabled = isSearchActive;

        if (isSearchActive) {
             chatState.settings.model = 'searchgpt';
        } else {
            chatState.settings.model = 'openai';
        }
        
        modelSelect.value = chatState.settings.model;
        saveChatbotData();
        lucide.createIcons();
    });


    // --- Settings Modal Logic ---
    const toggleSettingsModal = () => {
        settingsModal.classList.toggle('hidden');
         if (!settingsModal.classList.contains('hidden')) {
             // Load settings into modal when opening
             modelSelect.value = chatState.settings.model;
             systemPromptInput.value = chatState.settings.systemPrompt;
             themeToggle.checked = (chatState.settings.theme === 'dark');
         } else {
             // Save settings when closing
             chatState.settings.model = modelSelect.value;
             chatState.settings.systemPrompt = systemPromptInput.value;
             // Theme is saved by its own listener
             saveChatbotData();
         }
        lucide.createIcons();
    };
    userProfileButton.addEventListener('click', toggleSettingsModal);
    closeSettingsButton.addEventListener('click', toggleSettingsModal);
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) toggleSettingsModal();
    });

     // Listen for changes in settings inputs to save state
     modelSelect.addEventListener('change', () => {
         chatState.settings.model = modelSelect.value;
         saveChatbotData();
     });
     systemPromptInput.addEventListener('input', () => {
         chatState.settings.systemPrompt = systemPromptInput.value;
         saveChatbotData();
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

     // --- Editing Bar Logic ---
     const editingBar = document.createElement('div');
     editingBar.className = 'editing-bar';
     editingBar.innerHTML = `
         <span>Editing message...</span>
         <button class="edit-cancel-btn"><i data-lucide="x"></i></button>
     `;
     // Prepend the editing bar to the chat input area
     chatInputArea.prepend(editingBar);
     lucide.createIcons(); // Create icon for the cancel button

     const editCancelButton = editingBar.querySelector('.edit-cancel-btn');
     editCancelButton.addEventListener('click', () => {
          exitEditMode();
     });

     const enterEditMode = (conversationId, messageIndex) => {
          editingMessageDetails = { conversationId: conversationId, messageIndex: messageIndex };
          document.querySelector('.chatbot-container').classList.add('editing-mode');
          const messageBubbleToHide = document.getElementById(`message-${conversationId}-${messageIndex}`);
          if (messageBubbleToHide) {
               messageBubbleToHide.classList.add('hidden-when-editing');
          }
          sendButton.textContent = 'Save Edit'; // Change send button text
          console.log('Entered edit mode for message:', conversationId, messageIndex);
     };

     const exitEditMode = () => {
         if (editingMessageDetails !== null) {
              const messageBubbleToShow = document.getElementById(`message-${editingMessageDetails.conversationId}-${editingMessageDetails.messageIndex}`);
              if (messageBubbleToShow) {
                   messageBubbleToShow.classList.remove('hidden-when-editing');
              }
              editingMessageDetails = null;
              document.querySelector('.chatbot-container').classList.remove('editing-mode');
              sendButton.textContent = 'Send'; // Reset send button text
               chatInput.value = ''; // Clear input on cancel
               // Also clear any attached files if in edit mode? Depending on desired behavior.
               // For now, leave file handling as is unless explicitly requested to clear on cancel.
              console.log('Exited edit mode.');
         }
     };


    // --- Core Chat Logic ---
    async function handleSendMessage() {
        const messageText = chatInput.value.trim();
        const imageFile = attachedFile;
        const imageURLForBubble = previewObjectURL; // Store URL for potential re-display

        // If editing and no text/image, treat as cancel
        if (editingMessageDetails !== null && !messageText && !imageFile) {
             exitEditMode();
             return;
        }

        if (!messageText && !imageFile && editingMessageDetails === null) return; // Don't send empty message unless editing


        if (!welcomeScreen.classList.contains('hidden')) {
            welcomeScreen.classList.add('hidden');
            messageLog.classList.remove('hidden');
        }

        let currentConversation = chatState.conversations.find(conv => conv.id === chatState.activeConversationId);

        if (editingMessageDetails !== null && currentConversation) {
             // Editing an existing message
             console.log('Saving edit for message:', editingMessageDetails);
             const messageIndex = editingMessageDetails.messageIndex;
             const editedMessage = currentConversation.messages[messageIndex];

             editedMessage.content = messageText; // Update message content
             // Handle image: if a new image is attached while editing, replace the old one
             if (imageFile) {
                  editedMessage.imageUrl = imageURLForBubble;
             } else if (editedMessage.imageUrl && imageURLForBubble === null && attachedFile === null) {
                  // If no new image is attached and there was an old one, and no file is selected, remove the old one
                  delete editedMessage.imageUrl;
             }


             // Remove subsequent bot messages if editing a user message
             if (editedMessage.role === 'user') {
                  currentConversation.messages = currentConversation.messages.slice(0, messageIndex + 1);
             }


             exitEditMode(); // Exit edit mode after saving

             renderMessages(chatState.activeConversationId); // Re-render messages
             saveChatbotData(); // Save updated state

             // Re-trigger bot response for edited user message
             if (editedMessage.role === 'user') {
                  const thinkingBubble = appendMessage('', 'bot', true);
                  await fetchAndStreamForEdit(currentConversation, thinkingBubble);
             }

        } else if (isNewChatPending || !currentConversation) {
             // Create and add new chat item on the first message or if no active conversation
             const newConversationId = Date.now().toString(); // Simple unique ID
             const newName = messageText.substring(0, 30) + (messageText.length > 30 ? '...' : ''); // Use first part of message as name
             if (!newName) newName = `New Chat ${chatState.conversations.length + 1}`; // Fallback name if message is only whitespace/image

             const newUserMessage = { role: 'user', content: messageText };
             if (imageURLForBubble) newUserMessage.imageUrl = imageURLForBubble;

             const newConversation = {
                  id: newConversationId,
                  name: newName,
                  messages: [newUserMessage]
             };

             chatState.conversations.unshift(newConversation); // Add to the beginning
             chatState.activeConversationId = newConversationId;
             isNewChatPending = false; // Reset the pending state
             console.log('Creating new conversation item on first message:', newConversation);

             renderSidebar(); // Update sidebar with new item
             // Messages will be rendered below
             currentConversation = newConversation; // Set current conversation to the newly created one

              // Display user message after creating conversation
             appendMessage(messageText, 'user', false, imageURLForBubble, newConversationId, 0); // Pass conversation and message index

             // Clear input area
             chatInput.value = '';
             imagePreviewContainer.innerHTML = '';
             attachedFile = null;
             fileInput.value = '';
             previewObjectURL = null;

             saveChatbotData(); // Save state after adding user message

             // Display thinking bubble and get bot response
             const thinkingBubble = appendMessage('', 'bot', true);
             await fetchAndStream(currentConversation.messages, chatState.settings.model, thinkingBubble, currentConversation);


        } else {
             // Append new message to existing active conversation
             const newUserMessage = { role: 'user', content: messageText };
             if (imageURLForBubble) newUserMessage.imageUrl = imageURLForBubble;
             currentConversation.messages.push(newUserMessage);
             const messageIndex = currentConversation.messages.length - 1; // Index of the new message
             console.log('Appending message to existing conversation:', chatState.activeConversationId, newUserMessage);

             // Display user message
             appendMessage(messageText, 'user', false, imageURLForBubble, chatState.activeConversationId, messageIndex); // Pass conversation and message index

             // Clear input area
             chatInput.value = '';
             imagePreviewContainer.innerHTML = '';
             attachedFile = null;
             fileInput.value = '';
             previewObjectURL = null;

             saveChatbotData(); // Save state after adding user message

             // Display thinking bubble and get bot response
             const thinkingBubble = appendMessage('', 'bot', true);
             await fetchAndStream(currentConversation.messages, chatState.settings.model, thinkingBubble, currentConversation);
         }
     }


     // New helper function to handle streaming response after edit
     async function fetchAndStreamForEdit(conversation, thinkingBubble) {
         // Prepare messages for API (include history up to edited message)
         const messagesForApi = [];
          // System prompt logic is now handled inside fetchAndStream
         // Include messages up to the edited one for context
          conversation.messages.forEach(msg => {
              // For API, include image data if present
              if (msg.imageUrl && msg.role === 'user') {
                  // Need to get base64 data from URL for API - this is complex with object URLs after page reload
                  // For simplicity in this example, we'll only send text for history
                  messagesForApi.push({ role: msg.role, content: msg.content });
              } else {
                 messagesForApi.push({ role: msg.role, content: msg.content });
              }
          });

         await fetchAndStream(messagesForApi, chatState.settings.model, thinkingBubble, conversation);
     }


    // Modify fetchAndStream to save bot message to state
    async function fetchAndStream(messagesForApi, model, thinkingBubble, conversation) {
        console.log('messagesForApi received in fetchAndStream:', messagesForApi);

        const getCurrentDate = () => new Date().toISOString().split('T')[0];
        let finalSystemPrompt = chatState.settings.systemPrompt;

        if (model === 'searchgpt') {
            finalSystemPrompt = `You are Fronix Search GPT\nYour aim is to provide real time info based on user's query, the current date is ${getCurrentDate()}`;
        } else {
            // Append additional prompt and date for other models
            const defaultPrompt = "You are Fronix, a large language model being used in a website called Fronix made by Z-SHADOW ULTRA.\nYou are chatting with the user via the Fronix web app. This means most of the time your lines should be a sentence or two, unless the user's request requires reasoning or long-form outputs. Never use emojis, unless explicitly asked to.\nKnowledge cutoff: 2024-06\n\nImage input capabilities: Enabled\nPersonality: v2\nOver the course of the conversation, you adapt to the user’s tone and preference. Try to match the user’s vibe, tone, and generally how they are speaking. You want the conversation to feel natural. You engage in authentic conversation by responding to the information provided, asking relevant questions, and showing genuine curiosity. If natural, continue the conversation with casual conversation.\n\nIf the user asks to web search or get latest information or information subjected to change tell him to use the web search option which in at the left hand side of the message text box .";
            finalSystemPrompt = `${defaultPrompt}\n${finalSystemPrompt}\ndate: ${getCurrentDate()}`;
        }
        
        const finalMessages = [{ role: 'system', content: finalSystemPrompt }, ...messagesForApi];
        
        const payload = { model, messages: finalMessages, stream: true };
        let botMessageContent = '';
        let botMessageIndex = -1; // To track the index of the bot message being streamed

        try {
            const response = await fetch('https://text.pollinations.ai/openai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                referrer: 'wisdom-core'
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
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
                             // Stream finished, save the complete bot message
                             if (conversation && botMessageIndex !== -1) {
                                  conversation.messages[botMessageIndex].content = botMessageContent; // Final content
                                  saveChatbotData(); // Save state after receiving full bot message
                             }
                            return; // Stream finished
                        }
                        try {
                            const json = JSON.parse(dataStr);
                            const contentPart = json.choices?.[0]?.delta?.content || '';
                            if (contentPart) {
                                if (isFirstChunk) {
                                    thinkingBubble.querySelector('.message-content').innerHTML = '';
                                     // Add bot message to state on first chunk
                                     if (conversation) {
                                         const newBotMessage = { role: 'bot', content: '' };
                                         conversation.messages.push(newBotMessage);
                                         botMessageIndex = conversation.messages.length - 1; // Get the index
                                     }
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

            // Save the error message in the conversation state if a conversation object was provided
            if (conversation) {
                 const errorMsg = { role: 'bot', content: `Error: ${err.message}` };
                 if (botMessageIndex !== -1) {
                     conversation.messages[botMessageIndex] = errorMsg; // Replace partial message with error
                 } else {
                     conversation.messages.push(errorMsg); // Add error as a new message
                 }
                 saveChatbotData();
            }
        }
    }
    
    function appendMessage(text, role, isTyping = false, imageUrl = null, conversationId = null, messageIndex = null) {
        const messageBubble = document.createElement('div');
        messageBubble.className = `message-bubble ${role}-message`;
        // Add a unique ID and store metadata on the bubble for event delegation and hiding
        if (conversationId !== null && messageIndex !== null) {
             messageBubble.id = `message-${conversationId}-${messageIndex}`;
             messageBubble.dataset.conversationId = conversationId;
             messageBubble.dataset.messageIndex = messageIndex;
        }
    
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
            // Use a div for text content to easily select it later
            const textElement = document.createElement('div');
            textElement.className = 'message-text-content'; // Add a class to select text easily
            textElement.innerHTML = role === 'bot' ? marked.parse(text) : text; // Keep marked.parse for bot
            contentDiv.appendChild(textElement);


             // Add action icons container
             const actionsDiv = document.createElement('div');
             actionsDiv.className = 'message-actions';

             // Copy icon for both user and bot
             actionsDiv.innerHTML += `
                 <button class="action-icon copy-btn" aria-label="Copy message"><i data-lucide="copy"></i></button>
             `;

            if (role === 'user') {
                 // Edit icon only for user messages
                 actionsDiv.innerHTML += `
                     <button class="action-icon edit-btn" aria-label="Edit message"><i data-lucide="file-pen-line"></i></button>
                 `;
            }
             if (actionsDiv.innerHTML) { // Only append if there are actions
                 messageBubble.appendChild(actionsDiv);
             }
        }
    
        messageBubble.appendChild(contentDiv);
        messageLog.appendChild(messageBubble);
    
        // Re-create icons after adding new elements
        lucide.createIcons();
        messageLog.scrollTop = messageLog.scrollHeight;
    
        return messageBubble;
    }

    // --- Message Actions Event Delegation ---
    messageLog.addEventListener('click', (e) => {
         const target = e.target;
         const actionButton = target.closest('.action-icon');

         if (actionButton) {
             const messageBubble = actionButton.closest('.message-bubble'); // Can be user or bot message
             if (!messageBubble) return;

             const conversationId = messageBubble.dataset.conversationId;
             const messageIndex = parseInt(messageBubble.dataset.messageIndex, 10);
             const messageRole = messageBubble.classList.contains('user-message') ? 'user' : 'bot';


             if (isNaN(messageIndex) || !conversationId) {
                  console.error('Could not get message details from data attributes.');
                  return;
             }

             const action = actionButton.classList.contains('copy-btn') ? 'copy' : (actionButton.classList.contains('edit-btn') ? 'edit' : null);

             if (!action) return; // Not a recognized action button

             const conversation = chatState.conversations.find(conv => conv.id === conversationId);
             if (!conversation || !conversation.messages[messageIndex]) {
                  console.error('Could not find conversation or message in state.');
                  return;
             }

             const messageTextContentElement = messageBubble.querySelector('.message-text-content'); // Get the div with text

             if (action === 'copy') {
                 if (messageTextContentElement) {
                     const textToCopy = messageTextContentElement.innerText; // Use innerText to get rendered text
                      navigator.clipboard.writeText(textToCopy).then(() => {
                          console.log('Message copied to clipboard!');
                          // Optional: Show a temporary feedback (e.g., tooltip)
                          // alert('Copied!'); // Simple alert for feedback
                      }).catch(err => {
                          console.error('Failed to copy message: ', err);
                      });
                 }
             } else if (action === 'edit' && messageRole === 'user') { // Only allow edit for user messages
                  if (messageTextContentElement) {
                      const textToEdit = messageTextContentElement.innerText; // Use innerText
                      chatInput.value = textToEdit;
                      enterEditMode(conversationId, messageIndex); // Enter edit mode
                       // Do NOT change send button text here, it's handled in enterEditMode
                  }
             }
         }
    });


    // --- Event Listeners ---
    sendButton.addEventListener('click', handleSendMessage);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    // Settings Modal Listeners already exist and are modified above

    // Helper to convert file to Base64 (used for preview, not currently for API history)
    const toBase64 = file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });

    // --- Initial Load ---
    loadChatbotData(); // Load state from local storage
    loadAndApplyTheme(); // Apply theme based on loaded state
    renderSidebar(); // Render sidebar based on loaded conversations
    // Render messages for the active conversation is now handled within renderSidebar's conversation click or default init
    if (chatState.activeConversationId) {
        renderMessages(chatState.activeConversationId);
    } else {
        resetChatView(); // Show welcome screen if no active chat
    }

});