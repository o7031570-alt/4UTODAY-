// ===== CONFIGURATION =====
// Your Google Sheets CSV URL (already filled in)
const API_BASE_URL = "https://fourutoday.onrender.com";
// Refresh interval in milliseconds (30 seconds)
const REFRESH_INTERVAL = 30000;
// =========================

let allPosts = [];
let uniqueTags = new Set();

// DOM Elements
const postsContainer = document.getElementById('postsContainer');
const tagFilter = document.getElementById('tagFilter');
const refreshBtn = document.getElementById('refreshBtn');
const loadingEl = document.getElementById('loading');
const noPostsEl = document.getElementById('noPosts');
const countdownEl = document.getElementById('countdown');

// Fetch and parse CSV data
async function fetchPosts() {
    try {
        loadingEl.style.display = 'block';
        noPostsEl.style.display = 'none';

        // Add timestamp to prevent caching
        const timestamp = new Date().getTime();
        const url = `${CSV_URL}&_=${timestamp}`;
        
        const response = await fetch(url);
        const csvText = await response.text();

        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                allPosts = results.data
                    .filter(row => row.Title && row.Title.trim() !== '')
                    .map((post, index) => ({
                        ...post,
                        // Generate a unique ID for each post based on content
                        id: `${post.Title}_${index}_${Date.now()}`
                    }))
                    .reverse(); // Show newest posts first
                
                extractTags();
                populateTagFilter();
                displayPosts(allPosts);
                loadingEl.style.display = 'none';
                
                if (allPosts.length === 0) {
                    noPostsEl.style.display = 'block';
                } else {
                    noPostsEl.style.display = 'none';
                }
            },
            error: function(err) {
                console.error('CSV parsing error:', err);
                loadingEl.style.display = 'none';
                noPostsEl.style.display = 'block';
                noPostsEl.innerHTML = `<p>Error loading posts. Please check your Google Sheet URL.</p>`;
            }
        });
    } catch (error) {
        console.error('Fetch error:', error);
        loadingEl.style.display = 'none';
        noPostsEl.style.display = 'block';
        noPostsEl.innerHTML = `<p>Failed to fetch posts. Check your internet connection.</p>`;
    }
}

// Extract unique tags from all posts
function extractTags() {
    uniqueTags.clear();
    allPosts.forEach(post => {
        if (post.Tags) {
            // Split by comma, semicolon, or space
            post.Tags.split(/[,;\s]+/)
                .filter(tag => tag.trim() !== '')
                .forEach(tag => {
                    uniqueTags.add(tag.trim().toLowerCase());
                });
        }
    });
}

// Populate the tag filter dropdown
function populateTagFilter() {
    const currentSelection = tagFilter.value;
    tagFilter.innerHTML = '<option value="all">All Posts</option>';
    
    // Convert to array, sort alphabetically
    const sortedTags = Array.from(uniqueTags).sort();
    
    sortedTags.forEach(tag => {
        if (tag) {
            const option = document.createElement('option');
            option.value = tag;
            // Capitalize first letter for display
            option.textContent = tag.charAt(0).toUpperCase() + tag.slice(1);
            tagFilter.appendChild(option);
        }
    });
    
    // Restore previous selection if possible
    if (currentSelection && Array.from(uniqueTags).includes(currentSelection)) {
        tagFilter.value = currentSelection;
    }
}

// Display posts in the grid
function displayPosts(posts) {
    postsContainer.innerHTML = '';
    
    if (posts.length === 0) {
        postsContainer.innerHTML = `
            <div class="no-filter-results">
                <i class="fas fa-search"></i>
                <h3>No posts found</h3>
                <p>Try selecting a different tag or check back later.</p>
            </div>
        `;
        return;
    }
    
    posts.forEach(post => {
        const card = document.createElement('article');
        card.className = 'post-card';
        card.dataset.id = post.id;

        // Build media preview
        let mediaHtml = '';
        const fileUrl = post['File/Image URL'] || post['FileURL'] || post['Image URL'] || '';
        
        if (fileUrl) {
            const isVideo = fileUrl.match(/\.(mp4|webm|ogg|mov|avi)$/i) || 
                           fileUrl.includes('youtube.com') || 
                           fileUrl.includes('youtu.be');
            const isAudio = fileUrl.match(/\.(mp3|wav|ogg|m4a)$/i);
            
            if (isVideo) {
                if (fileUrl.includes('youtube.com') || fileUrl.includes('youtu.be')) {
                    // Extract YouTube ID
                    const videoId = fileUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
                    if (videoId) {
                        mediaHtml = `
                            <div class="post-image youtube-container">
                                <iframe 
                                    src="https://www.youtube.com/embed/${videoId[1]}" 
                                    frameborder="0" 
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                    allowfullscreen>
                                </iframe>
                            </div>
                        `;
                    } else {
                        mediaHtml = `<div class="post-image" style="background:#eee; display:flex; align-items:center; justify-content:center; color:#888;"><i class="fas fa-video"></i> Video Link</div>`;
                    }
                } else {
                    mediaHtml = `<video class="post-image" controls poster="https://via.placeholder.com/400x200/0088cc/ffffff?text=Video"><source src="${fileUrl}" type="video/mp4">Your browser does not support videos.</video>`;
                }
            } else if (isAudio) {
                mediaHtml = `<div class="post-image audio-container" style="background:#0088cc; color:white; display:flex; align-items:center; justify-content:center; flex-direction:column; padding:20px;">
                                <i class="fas fa-music" style="font-size:3rem; margin-bottom:10px;"></i>
                                <audio controls style="width:100%;">
                                    <source src="${fileUrl}" type="audio/mpeg">
                                    Your browser does not support audio.
                                </audio>
                            </div>`;
            } else {
                // Image or other file
                mediaHtml = `<img class="post-image" src="${fileUrl}" alt="${post.Title}" loading="lazy" onerror="this.onerror=null; this.src='https://via.placeholder.com/400x200/eee/666?text=Image+Not+Found'">`;
            }
        } else {
            mediaHtml = `<div class="post-image no-image" style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); color:white; display:flex; align-items:center; justify-content:center;">
                            <i class="fas fa-paperclip" style="font-size:3rem;"></i>
                        </div>`;
        }

        // Build tags
        let tagsHtml = '';
        if (post.Tags) {
            tagsHtml = post.Tags.split(/[,;\s]+/)
                .filter(tag => tag.trim() !== '')
                .map(tag => `<span class="tag">${tag.trim()}</span>`)
                .join('');
        }

        // Build description (with line breaks)
        const description = post.Description || post.Desc || 'No description available';
        const descriptionWithBreaks = description.replace(/\n/g, '<br>');

        card.innerHTML = `
            ${mediaHtml}
            <div class="post-content">
                <h2 class="post-title">${escapeHtml(post.Title)}</h2>
                <p class="post-description">${descriptionWithBreaks}</p>
                ${tagsHtml ? `<div class="post-tags">${tagsHtml}</div>` : ''}
                ${fileUrl ? `<a href="${fileUrl}" class="post-link" target="_blank" rel="noopener noreferrer"><i class="fas fa-external-link-alt"></i> ${getLinkText(fileUrl)}</a>` : ''}
            </div>
        `;
        postsContainer.appendChild(card);
    });
}

// Get appropriate link text based on file type
function getLinkText(url) {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'Watch on YouTube';
    if (url.match(/\.(mp4|webm|ogg|mov|avi)$/i)) return 'Download Video';
    if (url.match(/\.(mp3|wav|ogg|m4a)$/i)) return 'Download Audio';
    if (url.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) return 'View Full Image';
    if (url.match(/\.(pdf|doc|docx|xls|xlsx)$/i)) return 'Download Document';
    return 'Download File';
}

// Simple HTML escaping
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Filter posts by selected tag
function filterPosts() {
    const selectedTag = tagFilter.value;
    if (selectedTag === 'all') {
        displayPosts(allPosts);
    } else {
        const filtered = allPosts.filter(post =>
            post.Tags && 
            post.Tags.toLowerCase().split(/[,;\s]+/).some(tag => tag.trim() === selectedTag)
        );
        displayPosts(filtered);
    }
}

// Countdown timer for auto-refresh
let countdown = REFRESH_INTERVAL / 1000;
function updateCountdown() {
    countdown--;
    countdownEl.textContent = countdown;
    if (countdown <= 0) {
        countdown = REFRESH_INTERVAL / 1000;
        fetchPosts();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchPosts();
    setInterval(fetchPosts, REFRESH_INTERVAL);
    setInterval(updateCountdown, 1000);
});

// Event Listeners
tagFilter.addEventListener('change', filterPosts);
refreshBtn.addEventListener('click', () => {
    countdown = REFRESH_INTERVAL / 1000;
    countdownEl.textContent = countdown;
    fetchPosts();
});
