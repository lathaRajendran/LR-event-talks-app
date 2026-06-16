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
    const exportCsvBtn = document.getElementById('export-csv-btn');

    // Theme Toggle Elements
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');

    // Tweet Modal Elements
    const tweetModal = document.getElementById('tweet-modal');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCount = document.getElementById('char-count');
    const tweetPreviewText = document.getElementById('tweet-preview-text');
    const postTweetBtn = document.getElementById('post-tweet-btn');
    const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
    const closeModalBtn = document.getElementById('close-modal');

    // Toast Container
    const toastContainer = document.getElementById('toast-container');

    // State
    let releases = [];
    let currentFilter = 'all';
    let searchQuery = '';

    // Toast Notification System
    function showToast(message, type = 'info') {
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let iconClass = 'fa-circle-info';
        if (type === 'success') iconClass = 'fa-circle-check';
        if (type === 'warning') iconClass = 'fa-triangle-exclamation';
        if (type === 'error') iconClass = 'fa-circle-exclamation';
        
        toast.innerHTML = `
            <i class="fa-solid ${iconClass} toast-icon"></i>
            <span class="toast-message">${message}</span>
        `;
        
        toastContainer.appendChild(toast);
        
        // Remove from DOM after transition finishes
        setTimeout(() => {
            toast.style.animation = 'toastFadeOut 0.3s ease forwards';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 4700);
    }

    // Initialize Theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        themeIcon.className = 'fa-solid fa-sun';
    } else {
        document.body.classList.remove('light-theme');
        themeIcon.className = 'fa-solid fa-moon';
    }

    themeToggleBtn.addEventListener('click', () => {
        const isLight = document.body.classList.toggle('light-theme');
        if (isLight) {
            themeIcon.className = 'fa-solid fa-sun';
            localStorage.setItem('theme', 'light');
            showToast('Switched to Light theme', 'info');
        } else {
            themeIcon.className = 'fa-solid fa-moon';
            localStorage.setItem('theme', 'dark');
            showToast('Switched to Dark theme', 'info');
        }
    });

    // Fetch releases from API
    async function fetchReleases() {
        if (!navigator.onLine) {
            showToast('Cannot fetch updates: you are currently offline.', 'warning');
            showError('You are offline. Please check your network connection and click Try Again.');
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/releases');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            releases = await response.json();
            renderFeed();
            showToast('Successfully fetched latest BigQuery releases.', 'success');
        } catch (error) {
            console.error('Error fetching release notes:', error);
            showError(error.message || 'Failed to fetch release notes from the server.');
            showToast('Failed to fetch release notes from the server.', 'error');
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
        return temp.textContent || temp.innerText || "";
    }

    // Helper to extract filtered items for Export CSV / Filter checking
    function getFilteredUpdates() {
        const list = [];
        releases.forEach(release => {
            const parsedUpdates = parseReleaseContent(release.content);
            parsedUpdates.forEach((update, idx) => {
                // Type Filter
                if (currentFilter !== 'all' && update.type !== currentFilter) {
                    return;
                }
                // Search Query Filter
                if (searchQuery) {
                    const plainText = getPlainText(update.content).toLowerCase();
                    const titleText = release.title.toLowerCase();
                    const tagText = update.typeLabel.toLowerCase();
                    if (!plainText.includes(searchQuery) && !titleText.includes(searchQuery) && !tagText.includes(searchQuery)) {
                        return;
                    }
                }
                list.push({
                    date: release.title,
                    type: update.typeLabel,
                    content: getPlainText(update.content)
                });
            });
        });
        return list;
    }

    // Export current view of releases to a CSV file
    function exportToCSV() {
        const filteredList = getFilteredUpdates();
        if (filteredList.length === 0) {
            showToast('No data matches the current filters to export.', 'warning');
            return;
        }

        let csvRows = [];
        csvRows.push('"Date","Type","Content"');

        filteredList.forEach(item => {
            const date = item.date.replace(/"/g, '""');
            const type = item.type.replace(/"/g, '""');
            const content = item.content.trim().replace(/\s+/g, ' ').replace(/"/g, '""');
            csvRows.push(`"${date}","${type}","${content}"`);
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `bigquery_releases_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast(`Successfully exported ${filteredList.length} updates to CSV.`, 'success');
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
                            <button class="copy-trigger" data-date="${release.title}" data-index="${idx}">
                                <i class="fa-regular fa-copy"></i> Copy
                            </button>
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

        // Add event listeners to the copy buttons
        document.querySelectorAll('.copy-trigger').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const date = btn.getAttribute('data-date');
                const idx = parseInt(btn.getAttribute('data-index'), 10);
                
                const releaseObj = releases.find(r => r.title === date);
                if (releaseObj) {
                    const parsed = parseReleaseContent(releaseObj.content);
                    const updateObj = parsed[idx];
                    if (updateObj) {
                        const plainText = getPlainText(updateObj.content);
                        const formattedText = `BigQuery Release (${date}) - ${updateObj.typeLabel}:\n${plainText}`;
                        try {
                            await navigator.clipboard.writeText(formattedText);
                            showToast('Copied release note to clipboard!', 'success');
                            
                            // Visual feedback on button
                            const icon = btn.querySelector('i');
                            const textSpan = btn.childNodes[btn.childNodes.length - 1];
                            
                            btn.style.color = 'var(--accent-green)';
                            icon.className = 'fa-solid fa-check';
                            textSpan.textContent = ' Copied!';
                            
                            setTimeout(() => {
                                btn.style.color = '';
                                icon.className = 'fa-regular fa-copy';
                                textSpan.textContent = ' Copy';
                            }, 2000);
                        } catch (err) {
                            console.error('Failed to copy text: ', err);
                            showToast('Failed to copy to clipboard.', 'error');
                        }
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

    // Update Live Preview Character count
    function updateTweetPreview(text) {
        const len = text.length;
        charCount.textContent = len;
        
        charCount.parentElement.className = 'tweet-char-count';
        if (len > 260 && len <= 280) {
            charCount.parentElement.classList.add('warning');
            postTweetBtn.disabled = false;
        } else if (len > 280) {
            charCount.parentElement.classList.add('danger');
            postTweetBtn.disabled = true; // Prevent tweeting if over limit
        } else {
            postTweetBtn.disabled = false;
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
            showToast('Your tweet exceeds the 280 character limit.', 'error');
            return;
        }
        const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(tweetUrl, '_blank');
        closeTweetModal();
        showToast('Redirecting to X / Twitter...', 'info');
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

    // Export CSV Trigger
    exportCsvBtn.addEventListener('click', exportToCSV);

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

    // Online/Offline Listeners
    window.addEventListener('online', () => {
        showToast('You are back online. Refreshing release notes...', 'success');
        fetchReleases();
    });
    window.addEventListener('offline', () => {
        showToast('You are offline. Showing cached information.', 'warning');
    });

    // Initial Fetch
    fetchReleases();
});
