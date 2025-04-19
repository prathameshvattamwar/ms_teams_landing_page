document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const railButtons = document.querySelectorAll(".app-rail .rail-button");
  const listPaneTitle = document.getElementById("list-pane-title");
  const itemListContent = document.getElementById("item-list-content");
  const contentTitle = document.getElementById("content-title");
  const messageListContainer = document.getElementById(
    "message-list-container"
  );
  const messageList = document.getElementById("message-list");
  const messageInput = document.getElementById("message-input");
  const sendButton = document.getElementById("send-button");
  const newItemButton = document.getElementById("new-item-button");
  const simulateReceiveButton = document.getElementById(
    "simulate-receive-button"
  );
  const listSearchInput = document.getElementById("list-search-input");
  const clearSearchBtn = document.querySelector(".clear-search-btn");
  const typingIndicator = document.getElementById("typing-indicator");
  const typingIndicatorSender = typingIndicator?.querySelector(
    ".typing-indicator-sender"
  ); // Use optional chaining
  const contentTabs = document.querySelectorAll(
    ".content-tabs .tab-button:not(.add-tab-button)"
  );
  const tabContents = document.querySelectorAll(".tab-content"); // General selector

  // --- Application State ---
  let appState = {
    currentView: "chat",
    activeItemId: null,
    listFilter: "",
    typingTimeoutId: null,
  };

  // --- Data (will be loaded from/saved to Local Storage) ---
  let data = {
    chats: [], // { id, name, avatar, lastMessagePreview, timestamp, isPinned, status, unreadCount }
    teams: [], // { id, name, avatar } - Minimal team implementation
    messages: {}, // { chatId: [ { id, chatId, sender, text, timestamp, type, isRead, reactions: [{ type, count, users }] } ] }
  };

  // --- Constants ---
  const LS_STATE_KEY = "teamsCloneAppState_v2"; // Update key for new structure
  const LS_DATA_KEY = "teamsCloneAppData_v2";
  const TYPING_INDICATOR_DURATION = 1500; // ms

  // --- Initialization ---
  function initApp() {
    loadState();
    loadData();
    setupEventListeners();
    renderApp();
    // Auto-resize textarea
    autosizeTextarea(messageInput);
  }

  // --- State Management ---
  function loadState() {
    const savedState = localStorage.getItem(LS_STATE_KEY);
    if (savedState) {
      appState = { ...appState, ...JSON.parse(savedState) }; // Merge defaults with saved
    }
    appState.currentView = appState.currentView || "chat";
    listSearchInput.value = appState.listFilter || ""; // Restore search term
    toggleClearSearchButton();
  }

  function saveState() {
    // Don't save temporary state like typingTimeoutId
    const stateToSave = { ...appState };
    delete stateToSave.typingTimeoutId;
    localStorage.setItem(LS_STATE_KEY, JSON.stringify(stateToSave));
  }

  // --- Data Management ---
  function loadData() {
    const savedData = localStorage.getItem(LS_DATA_KEY);
    if (savedData) {
      data = JSON.parse(savedData);
      // Ensure essential structures exist if loading older data/corrupted
      data.chats = data.chats || [];
      data.teams = data.teams || [];
      data.messages = data.messages || {};
      // Ensure new fields exist on older chat data
      data.chats.forEach((chat) => {
        chat.isPinned = chat.isPinned ?? false;
        chat.status = chat.status ?? "available"; // Default status
        chat.unreadCount = chat.unreadCount ?? 0;
      });
      // Ensure messages have new fields
      Object.values(data.messages).forEach((msgArray) => {
        msgArray.forEach((msg) => {
          msg.isRead = msg.isRead ?? msg.type === "received"; // Default received as read? Or false? Let's say false initially
          msg.reactions = msg.reactions ?? [];
        });
      });
    } else {
      seedDefaultData();
      saveData();
    }
    // Set initial active item if none exists or invalid
    if (!findActiveItem()) {
      const items = appState.currentView === "chat" ? data.chats : data.teams;
      if (items.length > 0) {
        // Try to find the first non-pinned chat first
        const firstRecent = items.find((item) => !item.isPinned);
        appState.activeItemId = firstRecent ? firstRecent.id : items[0].id;
      } else {
        appState.activeItemId = null;
      }
      saveState(); // Save the potentially updated activeItemId
    }
  }

  function saveData() {
    localStorage.setItem(LS_DATA_KEY, JSON.stringify(data));
  }

  function seedDefaultData() {
    const chatId1 = generateId();
    const chatId2 = generateId();
    const chatId3 = generateId();
    data.chats = [
      {
        id: chatId1,
        name: "Rohit Singh",
        avatar: "https://img.freepik.com/free-vector/blue-circle-with-white-user_78370-4707.jpg",
        lastMessagePreview: "Okay",
        timestamp: Date.now() - 5 * 60 * 1000,
        isPinned: true,
        status: "available",
        unreadCount: 0,
      },
      {
        id: chatId2,
        name: "Group of Branding",
        avatar: "https://cdn2.iconfinder.com/data/icons/outline-basic-ui-set/139/Profile_GroupFriend-Outline-512.png",
        lastMessagePreview: "You: Good Morning Team, Today's Tickets...",
        timestamp: Date.now() - 10 * 60 * 1000,
        isPinned: true,
        status: "available",
        unreadCount: 1,
      },
      {
        id: chatId3,
        name: "Project Phoenix",
        avatar: "https://cdn2.iconfinder.com/data/icons/outline-basic-ui-set/139/Profile_GroupFriend-Outline-512.png",
        lastMessagePreview: "John: Meeting moved to 3 PM.",
        timestamp: Date.now() - 86400000,
        isPinned: false,
        status: "available",
        unreadCount: 0,
      },
      // Add more chats if needed
    ];
    data.teams = [
      {
        id: generateId(),
        name: "Development Team",
        avatar: "https://cdn2.iconfinder.com/data/icons/outline-basic-ui-set/139/Profile_GroupFriend-Outline-512.png",
      },
      {
        id: generateId(),
        name: "Marketing Crew",
        avatar: "https://cdn2.iconfinder.com/data/icons/outline-basic-ui-set/139/Profile_GroupFriend-Outline-512.png",
      },
    ];
    data.messages = {
      [chatId1]: [
        {
          id: generateId(),
          chatId: chatId1,
          sender: "Rohit Singh",
          text: "**Rahul Kumar** & **Ashwin Grover**, is it an off for you guys today?",
          timestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
          type: "received",
          isRead: true,
          reactions: [],
        }, // Yesterday
        {
          id: generateId(),
          chatId: chatId1,
          sender: "Ashwin Grover",
          text: "Hi *Rohit Singh* - Good Morning, We are working today.",
          timestamp: Date.now() - 6 * 60 * 1000,
          type: "received",
          isRead: true,
          reactions: [],
        }, // Today
        {
          id: generateId(),
          chatId: chatId1,
          sender: "Rohit Singh",
          text: "Okay",
          timestamp: Date.now() - 5 * 60 * 1000,
          type: "received",
          isRead: true,
          reactions: [{ type: "👍", count: 1, users: ["You"] }],
        }, // Today, with reaction
      ],
      [chatId2]: [
        {
          id: generateId(),
          chatId: chatId2,
          sender: "You",
          text: "Good Morning Team, \n How was going?",
          timestamp: Date.now() - 10 * 60 * 1000,
          type: "sent",
          isRead: false,
          reactions: [],
        }, // isRead false initially
      ],
      [chatId3]: [
        {
          id: generateId(),
          chatId: chatId3,
          sender: "John",
          text: "Meeting moved to 3 PM.",
          timestamp: Date.now() - 86400000,
          type: "received",
          isRead: true,
          reactions: [],
        },
      ],
    };
  }

  // --- Rendering Functions ---

  function renderApp() {
    renderRail();
    renderListPane();
    renderContentArea();
    updateInputState();
  }

  function renderRail() {
    railButtons.forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.view === appState.currentView
      );
    });
  }

  function renderListPane() {
    const view = appState.currentView;
    listPaneTitle.textContent = view.charAt(0).toUpperCase() + view.slice(1);
    newItemButton.title = view === "chat" ? "New Chat" : "New Team";

    let itemsToRender = (view === "chat" ? data.chats : data.teams).filter(
      (item) =>
        item.name.toLowerCase().includes(appState.listFilter.toLowerCase())
    ); // Apply filter

    // Sort chats by timestamp (most recent first), keep pinned status in mind later
    if (view === "chat") {
      itemsToRender.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }
    // Basic alphabetical sort for teams
    if (view === "teams") {
      itemsToRender.sort((a, b) => a.name.localeCompare(b.name));
    }

    itemListContent.innerHTML = ""; // Clear previous items

    const pinnedItems = itemsToRender.filter(
      (item) => view === "chat" && item.isPinned
    );
    const recentItems = itemsToRender.filter(
      (item) => view !== "chat" || !item.isPinned
    );

    if (pinnedItems.length > 0) {
      const header = document.createElement("li");
      header.className = "list-section-header";
      header.textContent = "Pinned";
      itemListContent.appendChild(header);
      pinnedItems.forEach((item) => {
        const listItem = createListItemElement(item, view);
        itemListContent.appendChild(listItem);
      });
    }

    if (recentItems.length > 0) {
      if (view === "chat") {
        // Only show "Recent" header for chats if there were pinned items
        const header = document.createElement("li");
        header.className = "list-section-header";
        header.textContent = "Recent";
        // Only add header if there are recent items AND pinned items, or if ONLY recent items exist and we need *a* header visually maybe? Let's keep it simple: add if recent exist.
        if (pinnedItems.length > 0 || recentItems.length > 0) {
          // Add if any recent items exist
          itemListContent.appendChild(header);
        }
      }
      recentItems.forEach((item) => {
        const listItem = createListItemElement(item, view);
        itemListContent.appendChild(listItem);
      });
    }

    if (itemsToRender.length === 0 && appState.listFilter) {
      itemListContent.innerHTML = `<li class="list-item-placeholder">No ${view}s found matching "${appState.listFilter}".</li>`;
    } else if (itemsToRender.length === 0) {
      itemListContent.innerHTML = `<li class="list-item-placeholder">No ${view}s found.</li>`;
    }
  }

  function createListItemElement(item, view) {
    const li = document.createElement("li");
    li.className = "list-item";
    li.dataset.itemId = item.id;
    li.classList.toggle("active", item.id === appState.activeItemId);

    const avatarContainer = document.createElement("div");
    avatarContainer.className = "avatar-container";

    const avatarImg = document.createElement("img");
    avatarImg.src =
      item.avatar ||
      `https://via.placeholder.com/40/cccccc/fff?text=${item.name.charAt(0)}`;
    avatarImg.alt = "Avatar";
    avatarImg.className = "avatar";
    avatarContainer.appendChild(avatarImg);

    // Add presence dot for chats only for now
    if (view === "chat" && item.status === "available") {
      const presenceDot = document.createElement("div");
      presenceDot.className = "presence-dot";
      avatarContainer.appendChild(presenceDot); // Append to container
    }

    const detailsDiv = document.createElement("div");
    detailsDiv.className = "item-details";

    const nameDiv = document.createElement("div");
    nameDiv.className = "item-name";
    nameDiv.textContent = item.name;

    if (view === "chat" && item.timestamp) {
      const timestampSpan = document.createElement("span");
      timestampSpan.className = "item-timestamp";
      timestampSpan.textContent = formatTimestamp(item.timestamp);
      nameDiv.appendChild(timestampSpan);
    }

    detailsDiv.appendChild(nameDiv);

    if (view === "chat" && item.lastMessagePreview) {
      const previewDiv = document.createElement("div");
      previewDiv.className = "item-preview";
      // Simple way to show sender for preview if available
      const previewText = item.lastMessagePreview.startsWith("You:")
        ? item.lastMessagePreview
        : item.lastMessagePreview; // Already includes sender in seed data, otherwise logic needed
      previewDiv.textContent = previewText;
      detailsDiv.appendChild(previewDiv);
    }

    li.appendChild(avatarContainer); // Use the container
    li.appendChild(detailsDiv);

    // Add unread badge for chats
    if (view === "chat" && item.unreadCount > 0) {
      const unreadBadge = document.createElement("span");
      unreadBadge.className = "unread-badge";
      unreadBadge.textContent = item.unreadCount > 9 ? "9+" : item.unreadCount; // Limit display
      li.appendChild(unreadBadge);
    }

    li.addEventListener("click", () => handleListItemClick(item.id));
    // Add context menu listener here later for pinning etc.

    return li;
  }

  function renderContentArea() {
    const activeItem = findActiveItem();

    // Reset tabs and content visibility
    contentTabs.forEach((t) => t.classList.remove("active"));
    tabContents.forEach((tc) => (tc.style.display = "none")); // Hide all tab contents
    const chatTab = document.querySelector('.tab-button[data-tab="chat"]');
    const messageArea = document.querySelector(".message-area-container");

    if (activeItem && appState.currentView === "chat") {
      contentTitle.textContent = activeItem.name;
      messageList.innerHTML = ""; // Clear previous messages
      messageArea.style.display = "flex"; // Show message area
      chatTab?.classList.add("active"); // Activate chat tab
      simulateReceiveButton.style.display = "inline-block";

      const messages = (data.messages[activeItem.id] || []).sort(
        (a, b) => a.timestamp - b.timestamp
      ); // Ensure sorted by time
      let lastMessageDate = null;

      if (messages.length === 0) {
        messageList.innerHTML = `<div class="message-placeholder">No messages yet. Start the conversation!</div>`;
      } else {
        messages.forEach((msg) => {
          const messageDate = new Date(msg.timestamp).toDateString();
          // Insert date separator if date changed
          if (messageDate !== lastMessageDate) {
            const dateSeparator = createDateSeparatorElement(msg.timestamp);
            messageList.appendChild(dateSeparator);
            lastMessageDate = messageDate;
          }

          const messageElement = createMessageElement(msg, activeItem);
          messageList.appendChild(messageElement);
        });
        // Mark messages in this chat as read (simulation)
        markMessagesAsRead(activeItem.id);
      }
      scrollToBottom(messageListContainer); // Scroll after rendering
    } else if (activeItem && appState.currentView === "teams") {
      contentTitle.textContent = activeItem.name;
      messageArea.style.display = "flex"; // Still show message area container for teams
      chatTab?.classList.add("active"); // Activate chat tab for teams too?
      messageList.innerHTML = `<div class="message-placeholder">Team channel content for **${activeItem.name}** (e.g., posts, files). Not implemented.</div>`;
      simulateReceiveButton.style.display = "none";
    } else {
      contentTitle.textContent = `Select a ${appState.currentView}`;
      messageArea.style.display = "none"; // Hide message area if no item selected
      simulateReceiveButton.style.display = "none";
      messageList.innerHTML = `<div class="message-placeholder">Select an item from the list on the left.</div>`;
    }
    updateInputState(); // Update input based on whether a chat/team is active
  }

  function createDateSeparatorElement(timestamp) {
    const div = document.createElement("div");
    div.className = "message-date-separator";
    div.textContent = formatTimestamp(timestamp, false, true); // Get full date format
    return div;
  }

  function createMessageElement(message, chatInfo) {
    const div = document.createElement("div");
    div.classList.add("message", message.type); // 'sent' or 'received'
    div.dataset.messageId = message.id;

    if (message.type === "received") {
      const avatarImg = document.createElement("img");
      avatarImg.src =
        chatInfo.avatar ||
        `https://via.placeholder.com/32/777/fff?text=${message.sender.charAt(
          0
        )}`;
      avatarImg.alt = "Avatar";
      avatarImg.className = "avatar";
      div.appendChild(avatarImg);
    }

    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";

    if (message.type === "received") {
      const senderDiv = document.createElement("div");
      senderDiv.className = "message-sender";
      senderDiv.textContent = message.sender; // Use sender name from message data
      contentDiv.appendChild(senderDiv);
    }

    const bubbleDiv = document.createElement("div");
    bubbleDiv.className = "message-bubble";
    // Basic Markdown Parsing (Careful with complex HTML injection in real apps)
    bubbleDiv.innerHTML = formatMarkdown(message.text);

    // Add reaction button placeholder
    const reactionButton = document.createElement("button");
    reactionButton.className = "message-reactions-button";
    reactionButton.innerHTML = '<i class="fa-regular fa-face-smile"></i>'; // Placeholder icon
    reactionButton.title = "Add reaction";
    // Add event listener for reaction button click here if implementing
    bubbleDiv.appendChild(reactionButton);

    const timeDiv = document.createElement("div");
    timeDiv.className = "message-time";
    timeDiv.textContent = formatTimestamp(message.timestamp, true); // Show time

    // Add read receipt for sent messages
    if (message.type === "sent") {
      const receiptSpan = document.createElement("span");
      receiptSpan.className = "read-receipt";
      receiptSpan.innerHTML = message.isRead
        ? '<i class="fa-solid fa-check-double"></i>'
        : '<i class="fa-solid fa-check"></i>'; // Double check for read
      receiptSpan.classList.toggle("read", message.isRead);
      timeDiv.appendChild(receiptSpan); // Append to time div
    }

    contentDiv.appendChild(bubbleDiv);
    contentDiv.appendChild(timeDiv);
    div.appendChild(contentDiv);

    return div;
  }

  function formatMarkdown(text) {
    if (!text) return "";
    // Replace **bold** with <strong>
    text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    // Replace *italic* with <em>
    text = text.replace(/\*(.*?)\*/g, "<em>$1</em>");
    // Convert newlines to <br> for display in HTML
    text = text.replace(/\n/g, "<br>");
    return text;
  }

  function updateInputState() {
    const canSendMessage =
      appState.currentView === "chat" && appState.activeItemId !== null;
    messageInput.disabled = !canSendMessage;
    sendButton.disabled = !canSendMessage || messageInput.value.trim() === ""; // Also disable if input empty

    if (!canSendMessage) {
      messageInput.placeholder = `Cannot send messages in ${appState.currentView}`;
      messageInput.value = ""; // Clear input if switching away
      messageInput.style.height = "auto"; // Reset height
    } else {
      messageInput.placeholder = "Type a new message";
    }
  }

  function autosizeTextarea(textarea) {
    textarea.addEventListener("input", () => {
      textarea.style.height = "auto"; // Reset height
      textarea.style.height = `${textarea.scrollHeight}px`; // Set to scroll height
      // Also update send button state based on content
      updateInputState();
    });
  }

  function showTypingIndicator(senderName) {
    if (!typingIndicator || !typingIndicatorSender) return;
    typingIndicatorSender.textContent = senderName;
    typingIndicator.style.display = "block";
    // Clear previous timeout if any
    if (appState.typingTimeoutId) {
      clearTimeout(appState.typingTimeoutId);
    }
    // Set new timeout to hide indicator
    appState.typingTimeoutId = setTimeout(() => {
      hideTypingIndicator();
    }, TYPING_INDICATOR_DURATION);
  }

  function hideTypingIndicator() {
    if (!typingIndicator) return;
    typingIndicator.style.display = "none";
    appState.typingTimeoutId = null;
  }

  // --- Event Handlers ---
  function setupEventListeners() {
    railButtons.forEach((button) => {
      button.addEventListener("click", () =>
        handleRailClick(button.dataset.view)
      );
    });

    sendButton.addEventListener("click", handleSendMessage);
    messageInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        if (!sendButton.disabled) {
          // Check if send is allowed
          handleSendMessage();
        }
      } else {
        // Simulate typing indicator from user perspective (optional)
      }
    });
    // Update send button state on input
    messageInput.addEventListener("input", updateInputState);

    newItemButton.addEventListener("click", handleNewItem);
    simulateReceiveButton.addEventListener("click", handleSimulateReceive);

    // Search/Filter Listener
    listSearchInput.addEventListener("input", handleListFilterChange);
    clearSearchBtn.addEventListener("click", clearListFilter);

    // Tab switching
    contentTabs.forEach((tab) => {
      tab.addEventListener("click", () => handleTabClick(tab.dataset.tab));
    });
  }

  function handleRailClick(view) {
    if (appState.currentView !== view) {
      appState.currentView = view;
      // Reset active item when changing view? Or keep last active? Let's reset.
      const items = view === "chat" ? data.chats : data.teams;
      // Select first non-pinned if possible
      const firstItem =
        items.find((item) => (view === "chat" ? !item.isPinned : true)) ||
        items[0];
      appState.activeItemId = firstItem ? firstItem.id : null;
      appState.listFilter = ""; // Clear filter when changing view
      listSearchInput.value = "";
      toggleClearSearchButton();
      saveState();
      renderApp();
    }
  }

  function handleListItemClick(itemId) {
    if (appState.activeItemId !== itemId) {
      appState.activeItemId = itemId;
      // Reset unread count for this chat if it's a chat
      if (appState.currentView === "chat") {
        const chatIndex = data.chats.findIndex((c) => c.id === itemId);
        if (chatIndex > -1 && data.chats[chatIndex].unreadCount > 0) {
          data.chats[chatIndex].unreadCount = 0;
          saveData(); // Save the cleared count
          // Need to re-render list pane to remove badge
          renderListPane();
        }
        // Simulate marking received messages as read when chat is opened
        markMessagesAsRead(itemId);
      }

      saveState();
      // Only need to re-render list (for active class) and content area
      // Render list pane needed if unread count changed
      renderContentArea(); // Renders content and marks messages read internally

      // Explicitly re-render list pane *after* potential unread count change
      const activeListItem = itemListContent.querySelector(".list-item.active");
      if (activeListItem) activeListItem.classList.remove("active", "unread"); // Assuming unread class exists
      const newActiveItem = itemListContent.querySelector(
        `.list-item[data-item-id="${itemId}"]`
      );
      if (newActiveItem) {
        newActiveItem.classList.add("active");
        const badge = newActiveItem.querySelector(".unread-badge");
        if (badge) badge.remove(); // Remove badge visually immediately
      }
    }
  }

  function markMessagesAsRead(chatId) {
    const messages = data.messages[chatId] || [];
    let changed = false;
    messages.forEach((msg) => {
      if (msg.type === "received" && !msg.isRead) {
        // In a real app, this would be more complex (e.g., only messages before a certain timestamp)
        // msg.isRead = true; // For now, let's not mark received as read this way
        // changed = true;
      }
      // If *this* user sent messages and they weren't marked read, mark them now (simulation)
      if (msg.type === "sent" && !msg.isRead) {
        msg.isRead = true;
        changed = true;
      }
    });
    if (changed) {
      saveData();
      // If the current view is this chat, re-render content to show updated receipts
      if (appState.activeItemId === chatId) {
        renderContentArea();
      }
    }
  }

  function handleSendMessage() {
    const text = messageInput.value.trim();
    if (
      text === "" ||
      !appState.activeItemId ||
      appState.currentView !== "chat"
    ) {
      return;
    }

    const newMessage = {
      id: generateId(),
      chatId: appState.activeItemId,
      sender: "You", // Hardcoded user name
      text: text,
      timestamp: Date.now(),
      type: "sent",
      isRead: false, // Sent messages start as unread by recipient
      reactions: [],
    };

    addMessageToData(newMessage);

    messageInput.value = "";
    messageInput.style.height = "auto"; // Reset height after sending
    renderContentArea(); // Update message list
    renderListPane(); // Update preview and timestamp order
    saveData();
    updateInputState(); // Re-disable send button if needed
  }

  function handleNewItem() {
    const view = appState.currentView;
    let newItemName = prompt(`Enter name for new ${view}:`, `New ${view}`);

    if (newItemName) {
      newItemName = newItemName.trim();
      if (newItemName === "") return;

      const newItem = {
        id: generateId(),
        name: newItemName,
        avatar: `https://via.placeholder.com/40/${Math.floor(
          Math.random() * 16777215
        ).toString(16)}/fff?text=${newItemName.charAt(0).toUpperCase()}`, // Random color
      };

      if (view === "chat") {
        newItem.lastMessagePreview = "Chat created.";
        newItem.timestamp = Date.now();
        newItem.isPinned = false;
        newItem.status = "offline"; // New chats start offline?
        newItem.unreadCount = 0;
        data.chats.push(newItem);
        data.messages[newItem.id] = [];
      } else if (view === "teams") {
        data.teams.push(newItem);
        // Add default channel? Team data structure needs more thought
      }

      appState.activeItemId = newItem.id; // Select the new item
      saveState();
      saveData();
      renderApp();
    }
  }

  function handleSimulateReceive() {
    if (!appState.activeItemId || appState.currentView !== "chat") return;

    const activeChat = findActiveItem();
    if (!activeChat) return;

    // Simulate typing indicator
    showTypingIndicator(activeChat.name);

    // Delay message arrival slightly after typing indicator
    setTimeout(() => {
      const simulatedMessage = {
        id: generateId(),
        chatId: appState.activeItemId,
        sender: activeChat.name,
        text: `Simulated reply at ${formatTimestamp(
          Date.now(),
          true
        )}. *Sometimes* using markdown!`,
        timestamp: Date.now(),
        type: "received",
        isRead: appState.activeItemId === activeChat.id, // Mark as read only if chat is currently active
        reactions: [],
      };

      addMessageToData(simulatedMessage);

      // Update unread count if chat is NOT active
      if (appState.activeItemId !== simulatedMessage.chatId) {
        const chatIndex = data.chats.findIndex(
          (c) => c.id === simulatedMessage.chatId
        );
        if (chatIndex > -1) {
          data.chats[chatIndex].unreadCount =
            (data.chats[chatIndex].unreadCount || 0) + 1;
        }
      } else {
        // If chat IS active, mark any previously *sent* messages as read by the simulated user
        markMessagesAsRead(simulatedMessage.chatId); // This will now mark SENT messages as read
      }

      // Re-render affected parts
      renderContentArea(); // Update message list (will show read receipts if applicable)
      renderListPane(); // Update preview, timestamp, and unread badge
      saveData(); // Persist changes
    }, 800); // Delay message after typing starts
  }

  function handleListFilterChange() {
    appState.listFilter = listSearchInput.value;
    toggleClearSearchButton();
    saveState(); // Save filter state
    renderListPane(); // Re-render list with filter applied
  }

  function clearListFilter() {
    listSearchInput.value = "";
    handleListFilterChange(); // Trigger update
  }

  function toggleClearSearchButton() {
    clearSearchBtn.style.display = listSearchInput.value
      ? "inline-block"
      : "none";
  }

  function handleTabClick(tabId) {
    // Hide all tab contents
    tabContents.forEach((tc) => (tc.style.display = "none"));
    // Deactivate all tab buttons
    contentTabs.forEach((t) => t.classList.remove("active"));

    // Activate the clicked tab button
    const clickedTabButton = document.querySelector(
      `.tab-button[data-tab="${tabId}"]`
    );
    clickedTabButton?.classList.add("active");

    // Show the corresponding content
    const messageArea = document.querySelector(".message-area-container");
    if (tabId === "chat") {
      messageArea.style.display = "flex"; // Show chat/message area
    } else {
      messageArea.style.display = "none"; // Hide message area for other tabs
      const contentToShow = document.getElementById(`${tabId}-content`);
      if (contentToShow) {
        contentToShow.style.display = "block"; // Show specific tab content
      }
    }
  }

  // --- Helper Functions ---

  function findActiveItem() {
    if (!appState.activeItemId) return null;
    const source = appState.currentView === "chat" ? data.chats : data.teams;
    return source.find((item) => item.id === appState.activeItemId) || null;
  }

  function addMessageToData(messageObject) {
    const chatId = messageObject.chatId;
    if (!data.messages[chatId]) {
      data.messages[chatId] = [];
    }
    data.messages[chatId].push(messageObject);

    const chatIndex = data.chats.findIndex((chat) => chat.id === chatId);
    if (chatIndex > -1) {
      // Update preview carefully
      let preview = messageObject.text.replace(/<br>/g, " ").substring(0, 40); // Replace <br> added by markdown
      preview =
        `${messageObject.sender}: ${preview}` +
        (messageObject.text.length > 40 ? "..." : "");
      data.chats[chatIndex].lastMessagePreview = preview;
      data.chats[chatIndex].timestamp = messageObject.timestamp;
      // Don't touch unread count here, handled in receive simulation
    }
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9); // Longer random part
  }

  function formatTimestamp(ts, showTime = false, fullDate = false) {
    if (!ts) return "";
    const date = new Date(ts);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
    const diffDays = (today - messageDate) / (1000 * 60 * 60 * 24);

    if (fullDate) {
      return date.toLocaleDateString([], {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }

    if (showTime) {
      // Always show time if requested
      return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }

    // Format for list preview (no time unless today)
    if (diffDays < 1) {
      // Today
      return date.toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } else if (diffDays < 2) {
      // Yesterday
      return "Yesterday";
    } else if (diffDays < 7) {
      // Within the last week
      return date.toLocaleDateString([], { weekday: "short" }); // e.g., "Mon"
    } else {
      // Older than a week
      return date.toLocaleDateString([], { month: "numeric", day: "numeric" }); // e.g., "4/16"
    }
  }

  function scrollToBottom(element) {
    if (element) {
      // Use setTimeout to ensure scrolling happens after DOM updates potentially finish
      setTimeout(() => {
        element.scrollTop = element.scrollHeight;
      }, 0);
    }
  }

  // --- Start the application ---
  initApp();
});
