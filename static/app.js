document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = document.getElementById('refresh-icon');
    const searchInput = document.getElementById('search-input');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const loader = document.getElementById('loader');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    const retryBtn = document.getElementById('retry-btn');
    const feedContainer = document.getElementById('feed-container');

    // Tweet Modal Elements
    const tweetModal = document.getElementById('tweet-modal');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCount = document.getElementById('char-count');
    const tweetPreviewText = document.getElementById('tweet-preview-text');
    const postTweetBtn = document.getElementById('post-tweet-btn');
    const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
    const closeModalBtn = document.getElementById('close-modal');

    // State
    let releases = [];
    let currentFilter = 'all';
    let searchQuery = '';

    // Fetch releases from API
    async function fetchReleases() {
        setLoading(true);
        try {
            const response = await fetch('/api/releases');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            releases = await response.json();
            renderFeed();
        } catch (error) {
            console.error('Error fetching release notes:', error);
            showError(error.message || 'Failed to fetch release notes from the server.');
        } finally {
            setLoading(false);
        }
    }

    // Set Loading state
    function setLoading(isLoading) {
        if (isLoading) {
            loader.classList.remove('hidden');
            feedContainer.classList.add('hidden');
            errorMessage.classList.add('hidden');
            refreshIcon.classList.add('spinning');
            refreshBtn.disabled = true;
        } else {
            loader.classList.add('hidden');
            feedContainer.classList.remove('hidden');
            refreshIcon.classList.remove('spinning');
            refreshBtn.disabled = false;
        }
    }

    // Show Error State
    function showError(message) {
        errorText.textContent = message;
        errorMessage.classList.remove('hidden');
        feedContainer.classList.add('hidden');
        loader.classList.add('hidden');
    }

    // Helper to format date relative or clean
    function formatRelativeTime(dateStr) {
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) return 'Today';
            if (diffDays === 2) return 'Yesterday';
            if (diffDays <= 7) return `${diffDays} days ago`;
            
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch (e) {
            return '';
        }
    }

    // Parse HTML string to sub-items based on H3 tags
    function parseReleaseContent(htmlContent) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        
        const items = [];
        let currentHeader = 'Update';
        let currentContentHtml = '';
        
        // Iterate over children
        Array.from(tempDiv.childNodes).forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE && node.tagName === 'H3') {
                if (currentContentHtml.trim() !== '') {
                    items.push({
                        type: normalizeType(currentHeader),
                        typeLabel: currentHeader,
                        content: currentContentHtml.trim()
                    });
                    currentContentHtml = '';
                }
                currentHeader = node.textContent.trim();
            } else {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    currentContentHtml += node.outerHTML;
                } else {
                    currentContentHtml += node.textContent;
                }
            }
        });
        
        if (currentContentHtml.trim() !== '') {
            items.push({
                type: normalizeType(currentHeader),
                typeLabel: currentHeader,
                content: currentContentHtml.trim()
            });
        }
        
        return items;
    }

    // Normalize headers to standard classes (Feature, Changed, Deprecated, etc.)
    function normalizeType(headerText) {
        const text = headerText.toLowerCase();
        if (text.includes('feature')) return 'feature';
        if (text.includes('change') || text.includes('update')) return 'changed';
        if (text.includes('deprecat') || text.includes('remov')) return 'deprecated';
        return 'changed'; // fallback
    }

    // Extract raw text content from html
    function getPlainText(html) {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        // Clean up some space before links or list items
        return temp.textContent || temp.innerText || "";
    }

    // Render the Feed to UI
    function renderFeed() {
        feedContainer.innerHTML = '';
        
        const filteredReleases = releases.map(release => {
            // Parse and filter the individual sub-updates in the release
            const parsedUpdates = parseReleaseContent(release.content);
            const filteredUpdates = parsedUpdates.filter(update => {
                // Type Filter
                if (currentFilter !== 'all' && update.type !== currentFilter) {
                    return false;
                }
                
                // Search Query Filter
                if (searchQuery) {
                    const plainText = getPlainText(update.content).toLowerCase();
                    const titleText = release.title.toLowerCase();
                    const tagText = update.typeLabel.toLowerCase();
                    return plainText.includes(searchQuery) || titleText.includes(searchQuery) || tagText.includes(searchQuery);
                }
                
                return true;
            });
            
            return {
                ...release,
                updates: filteredUpdates
            };
        }).filter(release => release.updates.length > 0); // Only keep days that have matching updates

        if (filteredReleases.length === 0) {
            feedContainer.innerHTML = `
                <div class="error-container" style="background: rgba(255,255,255,0.02); border-color: var(--border-color);">
                    <i class="fa-solid fa-folder-open" style="color: var(--text-muted);"></i>
                    <h3>No releases found</h3>
                    <p>Try refining your search keyword or selection filters.</p>
                </div>
            `;
            return;
        }

        filteredReleases.forEach(release => {
            const card = document.createElement('article');
            card.className = 'card';
            
            const relativeTime = formatRelativeTime(release.updated);
            
            let cardHtml = `
                <div class="card-header">
                    <h2 class="card-date"><i class="fa-solid fa-calendar-days"></i> ${release.title}</h2>
                    <span class="card-relative-time">${relativeTime}</span>
                </div>
                <div class="card-body">
            `;

            release.updates.forEach((update, idx) => {
                cardHtml += `
                    <div class="update-item ${update.type}-type">
                        <span class="update-tag ${update.type}-tag">${update.typeLabel}</span>
                        <div class="update-content">${update.content}</div>
                        <div class="update-footer">
                            <button class="tweet-trigger" data-date="${release.title}" data-index="${idx}">
                                <i class="fa-brands fa-x-twitter"></i> Tweet Update
                            </button>
                        </div>
                    </div>
                `;
            });

            cardHtml += `</div>`;
            card.innerHTML = cardHtml;
            feedContainer.appendChild(card);
        });

        // Add event listeners to the tweet buttons
        document.querySelectorAll('.tweet-trigger').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const date = btn.getAttribute('data-date');
                const idx = parseInt(btn.getAttribute('data-index'), 10);
                
                // Find matching release and sub-update
                const releaseObj = releases.find(r => r.title === date);
                if (releaseObj) {
                    const parsed = parseReleaseContent(releaseObj.content);
                    const updateObj = parsed[idx];
                    if (updateObj) {
                        openTweetModal(date, updateObj);
                    }
                }
            });
        });
    }

    // Modal Handling
    function openTweetModal(date, update) {
        const plainText = getPlainText(update.content);
        
        // Truncate plain text if it's too long, leaving room for header and hashtags
        const header = `BigQuery Release (${date}): `;
        const footer = ` #BigQuery #GoogleCloud`;
        const maxTextLen = 280 - header.length - footer.length - 4; // 4 characters for '...' and formatting
        
        let trimmedText = plainText;
        if (plainText.length > maxTextLen) {
            trimmedText = plainText.substring(0, maxTextLen) + '...';
        }
        
        const initialTweetText = `${header}"${trimmedText}"${footer}`;
        
        tweetTextarea.value = initialTweetText;
        updateTweetPreview(initialTweetText);
        
        tweetModal.classList.remove('hidden');
        tweetTextarea.focus();
    }

    function closeTweetModal() {
        tweetModal.classList.add('hidden');
    }

    function updateTweetPreview(text) {
        const len = text.length;
        charCount.textContent = len;
        
        // Stylize character count based on limits
        charCount.parentElement.className = 'tweet-char-count';
        if (len > 260 && len <= 280) {
            charCount.parentElement.classList.add('warning');
        } else if (len > 280) {
            charCount.parentElement.classList.add('danger');
        }
        
        tweetPreviewText.textContent = text;
    }

    // Event Listeners for Tweet Edit
    tweetTextarea.addEventListener('input', (e) => {
        updateTweetPreview(e.target.value);
    });

    postTweetBtn.addEventListener('click', () => {
        const text = tweetTextarea.value;
        if (text.length > 280) {
            alert('Your tweet exceeds the 280 character limit.');
            return;
        }
        const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(tweetUrl, '_blank');
        closeTweetModal();
    });

    cancelTweetBtn.addEventListener('click', closeTweetModal);
    closeModalBtn.addEventListener('click', closeTweetModal);
    
    // Close modal if clicking overlay
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) {
            closeTweetModal();
        }
    });

    // Refresh controls
    refreshBtn.addEventListener('click', fetchReleases);
    retryBtn.addEventListener('click', fetchReleases);

    // Search input
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderFeed();
    });

    // Filters
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-type');
            renderFeed();
        });
    });

    // Keyboard support for modal ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !tweetModal.classList.contains('hidden')) {
            closeTweetModal();
        }
    });

    // Initial Fetch
    fetchReleases();
});
