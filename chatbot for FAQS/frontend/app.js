// API Configuration
const API_BASE_URL = window.location.origin; // Same origin when hosted by FastAPI

// State Management
let faqDatabase = [];
let activeCategory = "All";

// DOM Cache
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatViewport = document.getElementById("chat-viewport");
const welcomeCard = document.getElementById("welcome-card");

const chatTabTrigger = document.getElementById("chat-tab-trigger");
const explorerTabTrigger = document.getElementById("explorer-tab-trigger");
const chatPanel = document.getElementById("chat-panel");
const explorerPanel = document.getElementById("explorer-panel");

const faqExplorerGrid = document.getElementById("faq-explorer-grid");
const faqSearchInput = document.getElementById("faq-search-input");
const searchClearBtn = document.getElementById("search-clear-btn");
const faqCountSpan = document.getElementById("faq-count");

const categoryItems = document.querySelectorAll(".category-item");
const suggestButtons = document.querySelectorAll(".suggest-btn");
const toastContainer = document.getElementById("toast-container");

// ==========================================================================
// Initialization & Event Binds
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    // 1. Fetch entire FAQ database for local explorer
    fetchFAQs();

    // 2. Tab selection handling
    chatTabTrigger.addEventListener("click", () => switchTab("chat"));
    explorerTabTrigger.addEventListener("click", () => switchTab("explorer"));

    // 3. Chat form submission
    chatForm.addEventListener("submit", (e) => {
        e.preventDefault();
        handleUserMessageSubmit();
    });

    // 4. Bind suggest question buttons
    suggestButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const question = btn.getAttribute("data-question");
            submitQuestionDirectly(question);
        });
    });

    // 5. Sidebar category filters
    categoryItems.forEach(item => {
        item.addEventListener("click", () => {
            categoryItems.forEach(el => el.classList.remove("active"));
            item.classList.add("active");
            activeCategory = item.getAttribute("data-category");
            
            // Switch view to explorer when checking specific categories
            switchTab("explorer");
            renderFilteredFAQs();
        });
    });

    // 6. Explorer live search
    faqSearchInput.addEventListener("input", () => {
        const query = faqSearchInput.value.trim();
        searchClearBtn.style.display = query ? "block" : "none";
        renderFilteredFAQs();
    });

    // 7. Clear search button
    searchClearBtn.addEventListener("click", () => {
        faqSearchInput.value = "";
        searchClearBtn.style.display = "none";
        renderFilteredFAQs();
        faqSearchInput.focus();
    });
});

// ==========================================================================
// API Handlers & UI Builders
// ==========================================================================

/**
 * Fetches FAQ database from backend.
 */
async function fetchFAQs() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/faqs`);
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        faqDatabase = await response.json();
        renderFilteredFAQs();
    } catch (err) {
        console.error("Error retrieving FAQ index:", err);
        showToast("Could not load FAQ database. Is the backend server running?", "error");
    }
}

/**
 * Handles submission of a message from the text bar.
 */
function handleUserMessageSubmit() {
    const text = chatInput.value.trim();
    if (!text) return;

    chatInput.value = "";
    submitQuestionDirectly(text);
}

/**
 * Core submission loop. Inserts message bubble, triggers typing delay, runs NLP API, binds suggestions.
 */
async function submitQuestionDirectly(queryText) {
    // Hide welcome card if present
    if (welcomeCard) {
        welcomeCard.style.display = "none";
    }

    // Insert user message bubble
    appendMessageBubble("user", queryText);

    // Auto-scroll viewport down
    scrollViewport();

    // Create and append bot typing bubble
    const typingBubble = appendTypingIndicator();
    scrollViewport();

    try {
        // Post request to chat endpoint
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message: queryText })
        });

        if (!response.ok) {
            throw new Error(`Server returned code: ${response.status}`);
        }

        const data = await response.json();

        // Organic typing delay feel
        setTimeout(() => {
            typingBubble.remove();
            processBotResponse(data);
        }, 550);

    } catch (err) {
        console.error("Error communicating with chat API:", err);
        setTimeout(() => {
            typingBubble.remove();
            appendMessageBubble("bot", "🚨 Sorry, I encountered an issue connecting to the Aura AI service. Please verify the local FastAPI server is online.", null, false);
            scrollViewport();
        }, 550);
    }
}

/**
 * Processes API data and draws the appropriate response layouts.
 */
function processBotResponse(apiData) {
    const { match, score, suggested, alternatives } = apiData;

    let responseHtml = "";
    let isSuccessfulMatch = false;

    if (match) {
        isSuccessfulMatch = true;
        // Main answer block
        responseHtml = `
            <div class="faq-answer-main">
                <p>${match.answer}</p>
            </div>
        `;
    } else {
        // Fallback response with suggested closest match if present
        if (suggested) {
            responseHtml = `
                <div class="faq-fallback-info">
                    <p>I couldn't find a high-confidence match for your question. Did you mean:</p>
                    <button class="suggest-btn alt-link-btn" style="margin-top: 10px; font-weight: 500;" data-question="${suggested.question}">
                        👉 ${suggested.question}
                    </button>
                </div>
            `;
        } else {
            responseHtml = `
                <div class="faq-fallback-info">
                    <p>I'm sorry, I couldn't find any FAQs similar to your question in our database. Can you try rephrasing or checking another category?</p>
                </div>
            `;
        }
    }

    // Append alternative matches if available
    if (alternatives && alternatives.length > 0) {
        const links = alternatives.map(alt => 
            `<button class="alt-link-btn" data-question="${alt.question}">${alt.question}</button>`
        ).join("");

        responseHtml += `
            <div class="suggested-alternatives-box">
                <span>Related Topics:</span>
                <div class="alt-links-container">
                    ${links}
                </div>
            </div>
        `;
    }

    // Add UI components for Feedback loops
    responseHtml += `
        <div class="feedback-box">
            <button class="feedback-btn like-btn" aria-label="Helpful" title="Helpful">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                </svg>
            </button>
            <button class="feedback-btn dislike-btn" aria-label="Not helpful" title="Not helpful">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path>
                </svg>
            </button>
        </div>
    `;

    // Append standard bot bubble
    const bubble = appendMessageBubble("bot", responseHtml, isSuccessfulMatch ? score : null, true);
    scrollViewport();

    // Bind events inside the newly generated response bubble
    bindDynamicBubbleEvents(bubble);
}

/**
 * Utility to register events on newly injected elements (like upvotes, suggested clicks).
 */
function bindDynamicBubbleEvents(bubbleElement) {
    // 1. Bind alt links inside the bubble to submit automatically
    const subLinks = bubbleElement.querySelectorAll(".alt-link-btn");
    subLinks.forEach(link => {
        link.addEventListener("click", () => {
            const query = link.getAttribute("data-question");
            submitQuestionDirectly(query);
        });
    });

    // 2. Bind thumbs feedback interactions
    const likeBtn = bubbleElement.querySelector(".like-btn");
    const dislikeBtn = bubbleElement.querySelector(".dislike-btn");

    if (likeBtn && dislikeBtn) {
        likeBtn.addEventListener("click", () => {
            likeBtn.classList.toggle("active");
            dislikeBtn.classList.remove("active");
            showToast("Thank you for your feedback!", "success");
        });

        dislikeBtn.addEventListener("click", () => {
            dislikeBtn.classList.toggle("active");
            likeBtn.classList.remove("active");
            showToast("Feedback recorded. We will improve our matches.", "success");
        });
    }
}

// ==========================================================================
// DOM Modification Utilities
// ==========================================================================

/**
 * Creates and injects a single chat bubble.
 */
function appendMessageBubble(sender, content, score = null, isHtml = false) {
    const row = document.createElement("div");
    row.className = `message-row ${sender}-row`;

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";

    // Build top status tag/info line
    let infoHtml = "";
    if (sender === "bot") {
        const scoreBadge = score ? `<span class="match-badge">NLP Match: ${Math.round(score * 100)}%</span>` : "";
        infoHtml = `
            <div class="message-info">
                <span>Aura Support</span>
                ${scoreBadge}
            </div>
        `;
    } else {
        infoHtml = `
            <div class="message-info">
                <span>You</span>
            </div>
        `;
    }

    bubble.innerHTML = infoHtml;

    if (isHtml) {
        const bodyDiv = document.createElement("div");
        bodyDiv.innerHTML = content;
        bubble.appendChild(bodyDiv);
    } else {
        const p = document.createElement("p");
        p.textContent = content;
        bubble.appendChild(p);
    }

    row.appendChild(bubble);
    chatViewport.appendChild(row);
    return bubble;
}

/**
 * Appends simulated typing indicator widget.
 */
function appendTypingIndicator() {
    const row = document.createElement("div");
    row.className = "message-row bot-row typing-indicator-row";

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";

    bubble.innerHTML = `
        <div class="message-info">
            <span>Aura is typing</span>
        </div>
        <div class="typing-dots">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;

    row.appendChild(bubble);
    chatViewport.appendChild(row);
    return row;
}

/**
 * Safely scrolls chatbot window downwards.
 */
function scrollViewport() {
    chatViewport.scrollTo({
        top: chatViewport.scrollHeight,
        behavior: "smooth"
    });
}

/**
 * Navigates dashboard viewport between tabs.
 */
function switchTab(targetTab) {
    if (targetTab === "chat") {
        chatTabTrigger.classList.add("active");
        chatTabTrigger.setAttribute("aria-selected", "true");
        explorerTabTrigger.classList.remove("active");
        explorerTabTrigger.setAttribute("aria-selected", "false");

        chatPanel.classList.add("active");
        explorerPanel.classList.remove("active");
    } else {
        explorerTabTrigger.classList.add("active");
        explorerTabTrigger.setAttribute("aria-selected", "true");
        chatTabTrigger.classList.remove("active");
        chatTabTrigger.setAttribute("aria-selected", "false");

        explorerPanel.classList.add("active");
        chatPanel.classList.remove("active");
    }
}

// ==========================================================================
// FAQ Knowledge Base Explorer Panels
// ==========================================================================

/**
 * Re-filters FAQ array based on search and category inputs, and updates grid list.
 */
function renderFilteredFAQs() {
    if (!faqExplorerGrid) return;

    faqExplorerGrid.innerHTML = "";
    const searchVal = faqSearchInput.value.trim().toLowerCase();

    // Perform dual filtering: category AND search keywords
    const filtered = faqDatabase.filter(faq => {
        const categoryMatches = (activeCategory === "All" || faq.category === activeCategory);
        
        let textMatches = true;
        if (searchVal) {
            textMatches = faq.question.toLowerCase().includes(searchVal) || 
                          faq.answer.toLowerCase().includes(searchVal) ||
                          faq.keywords.some(kw => kw.toLowerCase().includes(searchVal));
        }

        return categoryMatches && textMatches;
    });

    // Update records counter
    faqCountSpan.textContent = filtered.length;

    if (filtered.length === 0) {
        faqExplorerGrid.innerHTML = `
            <div class="no-results-message" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 16px; opacity: 0.5;">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
                <p style="font-size: 1.05rem; font-weight: 500;">No matching FAQs found</p>
                <p style="font-size: 0.85rem; margin-top: 4px;">Try refining your keywords or changing the category filter.</p>
            </div>
        `;
        return;
    }

    // Build the FAQ cards
    filtered.forEach(faq => {
        const card = document.createElement("article");
        card.className = "faq-card";
        card.setAttribute("tabindex", "0");

        const tagsHtml = faq.keywords.map(kw => `<span class="keyword-tag">${kw}</span>`).join("");

        card.innerHTML = `
            <div class="faq-card-header">
                <span class="faq-card-category">${faq.category}</span>
            </div>
            <h4>${faq.question}</h4>
            <div class="faq-card-answer">${faq.answer}</div>
            <div class="faq-card-keywords">
                ${tagsHtml}
            </div>
        `;

        // Expand-on-click toggler
        card.addEventListener("click", () => {
            card.classList.toggle("expanded");
        });

        // Accessible click on Enter key press
        card.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                card.classList.toggle("expanded");
            }
        });

        faqExplorerGrid.appendChild(card);
    });
}

// ==========================================================================
// Toast Alerts Controller
// ==========================================================================

/**
 * Creates and shows a dynamic alert toast on bottom right.
 */
function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    let icon = "";
    if (type === "success") {
        icon = `
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        `;
    } else {
        icon = `
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
        `;
    }

    toast.innerHTML = `
        ${icon}
        <span>${message}</span>
    `;

    toastContainer.appendChild(toast);

    // Self-destruct toast after 3.5 seconds
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(50px)";
        toast.style.transition = "opacity 0.4s ease, transform 0.4s ease";
        setTimeout(() => {
            toast.remove();
        }, 400);
    }, 3500);
}
