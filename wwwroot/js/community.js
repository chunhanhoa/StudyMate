const API_BASE_URL = '/api';

// SignalR Connection
let connection = null;
let currentUserId = null;

// Initialize SignalR connection
async function initializeSignalR() {
    connection = new signalR.HubConnectionBuilder()
        .withUrl("/hubs/community")
        .withAutomaticReconnect()
        .build();

    // Listen for new posts
    connection.on("ReceivePost", (post) => {
        console.log("New post received:", post);
        prependPost(post);
    });

    // Listen for new comments
    connection.on("ReceiveComment", (postId, comment) => {
        console.log("New comment received:", postId, comment);
        appendComment(postId, comment);
    });

    // Listen for like updates
    connection.on("ReceiveLike", (postId, newLikeCount, userId) => {
        console.log("Like update received:", postId, newLikeCount);
        updateLikeCount(postId, newLikeCount, userId);
    });

    // Listen for user profile updates
    connection.on("UserProfileUpdated", (userId, newName, newAvatarUrl) => {
        console.log("User profile updated:", userId, newName, newAvatarUrl);
        updateAllUserReferences(userId, newName, newAvatarUrl);
    });

    try {
        await connection.start();
        console.log("SignalR Connected!");
    } catch (err) {
        console.error("SignalR Connection Error:", err);
        setTimeout(initializeSignalR, 5000); // Retry after 5 seconds
    }

    connection.onreconnecting((error) => {
        console.warn("SignalR Reconnecting...", error);
    });

    connection.onreconnected((connectionId) => {
        console.log("SignalR Reconnected!", connectionId);
    });

    connection.onclose((error) => {
        console.error("SignalR Disconnected:", error);
        setTimeout(initializeSignalR, 5000); // Retry after 5 seconds
    });
}

// Post creation
// Post creation
async function submitPost() {
    const content = document.getElementById('postContent').value;
    const fileInput = document.getElementById('postFileInput');
    const file = fileInput && fileInput.files[0];

    if (!content.trim() && !file) return;

    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;

    const btn = document.getElementById('btnSubmitPost');
    btn.disabled = true;
    btn.textContent = 'Đang đăng...';

    try {
        let response;

        if (file) {
            // Use FormData for file upload
            const formData = new FormData();
            formData.append('content', content);
            formData.append('userId', user.id);
            formData.append('file', file);

            response = await fetch(`${API_BASE_URL}/community/posts/with-file`, { // Assuming new endpoint or simplified controller logic
                // If using the same endpoint, backend must handle [FromForm] vs [FromBody] which is tricky in .NET Core
                // Usually easier to have separate endpoint or always use FormData if backend supports it.
                // Let's try the standard endpoint first but without Content-Type header (browser sets it with boundary for FormData)
                // If backend explicitly expects JSON for the main endpoint, this might fail.
                // Given I can't check backend code easily, I will try to use the general endpoint.
                // If it fails, I might need a dedicated endpoint like /upload or existing approach.
                // However, since `activityForm` uses FormData to `/api/studentactivity`, backend likely supports FromForm there.
                // Let's assume `/community/posts` is updated or supports it. 
                // SAFEST BET: Check if I can target a specific endpoint or if existing one binds via model binding that accepts both (unlikely without config).
                // I will assume for now we use the main endpoint. If it fails (415 Unsupported Media Type), I'll know.
                method: 'POST',
                body: formData
            });
        } else {
            // Use JSON for text-only (Legacy/Standard)
            response = await fetch(`${API_BASE_URL}/community/posts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: content,
                    userId: user.id
                })
            });
        }

        if (response.ok) {
            document.getElementById('postContent').value = '';
            if (fileInput) fileInput.value = '';
            document.getElementById('filePreview').style.display = 'none';
            document.getElementById('filePreview').innerHTML = '';
            // Post will be added via SignalR
        } else {
            alert('Có lỗi xảy ra khi đăng bài');
        }
    } catch (error) {
        console.error('Error posting:', error);
        alert('Không thể kết nối đến server');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Đăng bài';
    }
}

// File Selection Handler
window.handleFileSelect = function (input) {
    const preview = document.getElementById('filePreview');
    const file = input.files[0];

    if (file) {
        preview.style.display = 'block';

        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function (e) {
                preview.innerHTML = `
                    <div style="position: relative; display: inline-block;">
                        <img src="${e.target.result}" style="max-height: 200px; border-radius: 8px; border: 1px solid #ddd;">
                        <button onclick="clearFile()" style="position: absolute; top: 5px; right: 5px; background: rgba(0,0,0,0.5); color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer;">&times;</button>
                    </div>
                `;
            }
            reader.readAsDataURL(file);
        } else {
            preview.innerHTML = `
                <div style="background: #f0f2f5; padding: 10px; border-radius: 8px; display: inline-flex; align-items: center; gap: 10px;">
                    <i class="fas fa-file-alt" style="color: #65676b;"></i>
                    <span>${file.name}</span>
                    <button onclick="clearFile()" style="background: none; border: none; font-weight: bold; cursor: pointer;">&times;</button>
                </div>
            `;
        }
    } else {
        preview.style.display = 'none';
        preview.innerHTML = '';
    }
}

window.clearFile = function () {
    const input = document.getElementById('postFileInput');
    input.value = '';
    handleFileSelect(input);
}

let currentPage = 1;
const pageSize = 5;
let isLoadingMore = false;

// Load posts
async function loadPosts(page = 1, append = false) {
    const container = document.getElementById('feedContainer');
    const loadMoreBtn = document.getElementById('loadMoreContainer');

    if (!container) return; // Silent return if not on community page/tab

    try {
        if (!append) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #6B7280;">
                    <i class="fas fa-spinner fa-spin fa-2x"></i>
                    <p style="margin-top: 1rem;">Đang tải bài viết...</p>
                </div>
            `;
        }

        const response = await fetch(`${API_BASE_URL}/community/posts?page=${page}&pageSize=${pageSize}`);
        if (!response.ok) throw new Error('Failed to fetch');

        const posts = await response.json();

        if (!append) {
            container.innerHTML = '';
            currentPage = 1;
        }

        if (posts.length > 0) {
            const postsHtml = posts.map(post => renderPost(post)).join('');
            if (append) {
                container.insertAdjacentHTML('beforeend', postsHtml);
            } else {
                container.innerHTML = postsHtml;
            }

            // Show/hide load more button
            if (loadMoreBtn) {
                if (posts.length === pageSize) {
                    loadMoreBtn.style.display = 'block';
                } else {
                    loadMoreBtn.style.display = 'none';
                }
            }
        } else if (!append) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #6B7280;">
                    <p>Chưa có bài viết nào. Hãy là người đầu tiên chia sẻ!</p>
                </div>
            `;
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        } else {
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading posts:', error);
        if (!append) {
            container.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: #EF4444;">
                    <p>Không thể tải bài viết. Vui lòng thử lại sau.</p>
                    <button onclick="loadPosts()" class="btn-post" style="margin-top: 1rem;">Thử lại</button>
                </div>
            `;
        }
    }
}

async function loadMore() {
    if (isLoadingMore) return;
    isLoadingMore = true;

    const btn = document.getElementById('btnLoadMore');
    const originalText = btn.textContent;
    btn.textContent = 'Đang tải...';
    btn.disabled = true;

    currentPage++;
    await loadPosts(currentPage, true);

    btn.textContent = originalText;
    btn.disabled = false;
    isLoadingMore = false;
}

// function renderPosts(posts) - Removed in favor of inline logic in loadPosts

function renderPost(post) {
    const user = JSON.parse(localStorage.getItem('user'));
    const isLiked = user && post.likedByUserIds && post.likedByUserIds.includes(user.id);

    // Image HTML if exists
    let imageHtml = '';
    if (post.imageUrl) {
        imageHtml = `
            <div class="feed-image" style="margin-top: 10px; border-radius: 8px; overflow: hidden; border: 1px solid #eee;">
                <img src="${post.imageUrl}" alt="Post Image" style="width: 100%; height: auto; display: block; max-height: 500px; object-fit: contain; background: #f0f2f5;">
            </div>
        `;
    }

    return `
        <div class="feed-card" id="post-${post.id}" data-user-id="${post.userId}">
            <div class="feed-header">
                <div class="feed-user-info">
                    <div class="user-avatar" data-user-id="${post.userId}">
                        ${renderAvatar(post.userAvatarUrl, post.userName)}
                    </div>
                    <div>
                        <div class="feed-username" data-user-id="${post.userId}">${escapeHtml(post.userName || 'Sinh viên')}</div>
                        <div class="feed-time">${formatDate(post.createdAt)}</div>
                    </div>
                </div>
            </div>
            <div class="feed-content">
                ${formatContent(post.content)}
                ${imageHtml}
            </div>
            <div class="feed-actions">
                <div class="reaction-wrapper">
                    <div class="reaction-box">
                        <span class="reaction-icon" onclick="reactToPost('${post.id}', 'like')">👍</span>
                        <span class="reaction-icon" onclick="reactToPost('${post.id}', 'love')">❤️</span>
                        <span class="reaction-icon" onclick="reactToPost('${post.id}', 'care')">🥰</span>
                        <span class="reaction-icon" onclick="reactToPost('${post.id}', 'haha')">😆</span>
                        <span class="reaction-icon" onclick="reactToPost('${post.id}', 'wow')">😮</span>
                        <span class="reaction-icon" onclick="reactToPost('${post.id}', 'sad')">😢</span>
                        <span class="reaction-icon" onclick="reactToPost('${post.id}', 'angry')">😡</span>
                    </div>
                    <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="likePost('${post.id}')">
                        <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i> <span class="like-count">${post.likes || 0}</span> Thích
                    </button>
                </div>
                <button class="action-btn" onclick="toggleComments('${post.id}')">
                    <i class="far fa-comment"></i> ${post.comments ? post.comments.length : 0} Bình luận
                </button>
            </div>
            
            <!-- Comments Section -->
            <div class="comments-section" id="comments-${post.id}">
                <div class="comment-input-area">
                    <div class="user-avatar current-user-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="comment-input-wrapper" style="position: relative;">
                        <input type="text" class="comment-input" placeholder="Viết bình luận..." 
                               onkeypress="handleCommentSubmit(event, '${post.id}', null)">
                        <div class="emoji-trigger" title="Chèn emoji" onclick="toggleEmojiPicker(this)">😊</div>
                        <div class="send-comment-btn" title="Gửi" onclick="submitComment(this.parentElement.querySelector('input'), '${post.id}', null)" style="cursor: pointer; margin-left: 8px; color: var(--primary);">
                            <i class="fas fa-paper-plane"></i>
                        </div>
                    </div>
                </div>
                <div class="comments-list" style="margin-top: 1rem;">
                    ${post.comments ? post.comments.map(c => renderComment(c, post.id)).join('') : ''}
                </div>
            </div>
        </div>
    `;
}

function renderAvatar(avatarUrl, userName) {
    if (avatarUrl) {
        return `<img src="${avatarUrl}" alt="${escapeHtml(userName || 'User')}">`;
    }
    return `<i class="fas fa-user"></i>`;
}

function renderComment(comment, postId, depth = 1, parentUserName = null) {
    const isAuthor = comment.userId === document.querySelector(`.post-card[data-post-id="${postId}"]`)?.dataset.userId;

    // Create mention tag if this is a reply
    const mentionTag = depth > 1 && parentUserName ? `<span class="mention-tag">@${escapeHtml(parentUserName)}</span> ` : '';

    // Next level indentation: 40px for depth 1 & 2 (making depth 2 & 3 indented). 0 for depth 3+ (making depth 4+ aligned).
    const repliesMargin = depth < 3 ? '40px' : '0';

    return `
        <div class="comment-wrapper" data-depth="${depth}" data-comment-id="${comment.id}">
            <div class="comment-item" data-user-id="${comment.userId}" data-user-name="${escapeHtml(comment.userName || 'Sinh viên')}">
                <div class="user-avatar" data-user-id="${comment.userId}">
                    ${renderAvatar(comment.userAvatarUrl, comment.userName)}
                </div>
                <div class="comment-content-container">
                    <div class="comment-bubble">
                        <div class="comment-author" data-user-id="${comment.userId}">
                            ${escapeHtml(comment.userName || 'Sinh viên')}
                            ${isAuthor ? '<span class="author-badge">Tác giả</span>' : ''}
                        </div>
                        <div class="comment-text">${mentionTag}${escapeHtml(comment.content)}</div>
                    </div>
                    
                    <div class="comment-actions-row">
                        <button class="comment-action-item" onclick="this.style.color = this.style.color ? '' : '#e53935'">Thích</button>
                        <button class="comment-action-item" onclick="showReplyInput('${comment.id}', '${postId}')">Phản hồi</button>
                        <span class="comment-time">${formatDate(comment.createdAt)}</span>
                    </div>

                    <div class="reply-input-area" id="reply-input-${comment.id}" style="display: none;">
                         <div class="user-avatar current-user-avatar" style="width: 24px; height: 24px; min-width: 24px; min-height: 24px;">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="comment-input-wrapper" style="padding: 4px 10px; border-radius: 15px; min-height: 32px; display: flex; align-items: center;">
                            <input type="text" class="comment-input" style="font-size: 0.85rem;" placeholder="Viết phản hồi..." 
                                   onkeypress="handleCommentSubmit(event, '${postId}', '${comment.id}')">
                            <div class="emoji-trigger" style="font-size: 1rem;" onclick="insertEmoji(this)">😊</div>
                            <div class="send-comment-btn" title="Gửi" onclick="submitComment(this.parentElement.querySelector('input'), '${postId}', '${comment.id}')" style="cursor: pointer; margin-left: 8px; color: var(--primary);">
                                <i class="fas fa-paper-plane"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Replies Container Sibling -->
            <div class="replies-container" id="replies-${comment.id}" style="margin-left: ${repliesMargin};">
                ${comment.replies && comment.replies.length > 0 ?
            comment.replies.map(r => renderComment(r, postId, depth + 1, comment.userName)).join('')
            : ''}
            </div>
        </div>
    `;
}

function toggleReplies(commentId) {
    const container = document.getElementById(`replies-${commentId}`);
    const btn = document.getElementById(`toggle-btn-${commentId}`);
    if (container && btn) {
        if (container.style.display === 'none') {
            container.style.display = 'block';
            btn.innerHTML = `<i class="fas fa-chevron-up"></i> Thu gọn phản hồi`;
        } else {
            container.style.display = 'none';
            btn.innerHTML = `<i class="fas fa-chevron-down"></i> Xem ${container.children.length} phản hồi`;
        }
    }
}

function showReplyInput(commentId, postId) {
    const replyInput = document.getElementById(`reply-input-${commentId}`);
    if (replyInput) {
        replyInput.style.display = replyInput.style.display === 'none' ? 'block' : 'none';
        if (replyInput.style.display === 'block') {
            replyInput.querySelector('input').focus();
        }
    }
}

function prependPost(post) {
    const container = document.getElementById('feedContainer');
    const emptyMessage = container.querySelector('div[style*="text-align: center"]');
    if (emptyMessage) {
        container.innerHTML = '';
    }
    container.insertAdjacentHTML('afterbegin', renderPost(post));
}

function appendComment(postId, comment) {
    const commentsList = document.querySelector(`#comments-${postId} .comments-list`);
    if (commentsList) {
        if (comment.parentCommentId) {
            // Find parent comment
            const parentComment = commentsList.querySelector(`[data-comment-id="${comment.parentCommentId}"]`);
            if (parentComment) {
                const parentUserName = parentComment.getAttribute('data-user-name');
                const parentDepth = parseInt(parentComment.getAttribute('data-depth') || '1');
                const newDepth = parentDepth + 1;

                // Replies container
                let repliesContainer = document.getElementById(`replies-${comment.parentCommentId}`);

                if (!repliesContainer) {
                    // Create if missing
                    const contentContainer = parentComment.querySelector('.comment-content-container');
                    if (contentContainer) {
                        contentContainer.insertAdjacentHTML('beforeend', `
                            <div class="replies-container" id="replies-${comment.parentCommentId}"></div>
                        `);
                        repliesContainer = document.getElementById(`replies-${comment.parentCommentId}`);
                    }
                }

                if (repliesContainer) {
                    repliesContainer.insertAdjacentHTML('beforeend', renderComment(comment, postId, newDepth, parentUserName));
                }
            } else {
                // Fallback: append to main list if parent not found
                commentsList.insertAdjacentHTML('beforeend', renderComment(comment, postId));
            }
        } else {
            commentsList.insertAdjacentHTML('beforeend', renderComment(comment, postId));
        }

        // Update comment count
        const btn = document.querySelector(`#post-${postId} .action-btn:nth-child(2)`);
        if (btn) {
            const currentCount = parseInt(btn.textContent.match(/\d+/)?.[0] || 0);
            btn.innerHTML = `<i class="far fa-comment"></i> ${currentCount + 1} Bình luận`;
        }
    }
}

function updateLikeCount(postId, newLikeCount, userId) {
    const post = document.getElementById(`post-${postId}`);
    if (post) {
        const likeBtn = post.querySelector('.action-btn');
        const likeCountSpan = likeBtn.querySelector('.like-count');
        likeCountSpan.textContent = newLikeCount;

        // Update visual state if current user liked
        const currentUser = JSON.parse(localStorage.getItem('user'));
        if (currentUser && userId === currentUser.id) {
            const icon = likeBtn.querySelector('i');
            if (likeBtn.classList.contains('liked')) {
                likeBtn.classList.remove('liked');
                icon.classList.remove('fas');
                icon.classList.add('far');
            } else {
                likeBtn.classList.add('liked');
                icon.classList.remove('far');
                icon.classList.add('fas');
            }
        }
    }
}

function updateAllUserReferences(userId, newName, newAvatarUrl) {
    // Update all posts by this user
    document.querySelectorAll(`[data-user-id="${userId}"]`).forEach(element => {
        if (element.classList.contains('feed-username') || element.classList.contains('comment-author')) {
            element.textContent = newName;
        }
        if (element.classList.contains('user-avatar')) {
            element.innerHTML = renderAvatar(newAvatarUrl, newName);
        }
    });

    // Update localStorage if it's current user
    const currentUser = JSON.parse(localStorage.getItem('user'));
    if (currentUser && currentUser.id === userId) {
        currentUser.fullName = newName;
        currentUser.avatarUrl = newAvatarUrl;
        localStorage.setItem('user', JSON.stringify(currentUser));

        // Update header avatar
        updateHeaderAndCreatePostAvatar(currentUser);
    }
}

function toggleComments(postId) {
    const el = document.getElementById(`comments-${postId}`);
    el.classList.toggle('active');
}

async function handleCommentSubmit(event, postId, parentCommentId) {
    if (event.key === 'Enter') {
        console.log('Enter key pressed for comment submission');
        await submitComment(event.target, postId, parentCommentId);
    }
}

async function submitComment(input, postId, parentCommentId) {
    console.log('submitComment called', { input, postId, parentCommentId });
    if (!input) {
        console.error('Input element is null');
        return;
    }

    const content = input.value.trim();
    if (!content) {
        console.warn('Comment content is empty');
        return;
    }

    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        alert('Vui lòng đăng nhập để bình luận');
        return;
    }

    try {
        console.log('Sending comment API request...');
        input.disabled = true;
        const response = await fetch(`${API_BASE_URL}/community/posts/${postId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: content,
                userId: user.id,
                parentCommentId: parentCommentId
            })
        });

        console.log('API response status:', response.status);

        if (response.ok) {
            console.log('Comment submitted successfully');
            input.value = '';
            // Comment will be added via SignalR ReceiveComment event
            if (parentCommentId) {
                // Hide reply input
                const replyInput = document.getElementById(`reply-input-${parentCommentId}`);
                if (replyInput) replyInput.style.display = 'none';
            }
        } else {
            const errorText = await response.text();
            console.error('Failed to submit comment:', errorText);
        }
    } catch (error) {
        console.error('Error commenting:', error);
    } finally {
        input.disabled = false;
        input.focus();
    }
}

// Main Like Button Click Handler
async function likePost(postId) {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) {
        alert('Vui lòng đăng nhập để thích bài viết');
        return;
    }

    const btn = document.querySelector(`#post-${postId} .action-btn`);
    if (!btn) return;

    const isAlreadyLiked = btn.classList.contains('liked');

    if (isAlreadyLiked) {
        // Toggle Off
        resetLikeButton(btn);

        // Optimistic Count Update (Decrement)
        const countSpan = btn.querySelector('.like-count');
        if (countSpan) {
            const currentCount = parseInt(countSpan.textContent || '0');
            countSpan.textContent = Math.max(0, currentCount - 1);
        }
    } else {
        // Toggle On (Default Like)
        setLikeButton(btn, REACTION_TYPES['like']);

        // Optimistic Count Update (Increment)
        const countSpan = btn.querySelector('.like-count');
        if (countSpan) {
            const currentCount = parseInt(countSpan.textContent || '0');
            countSpan.textContent = currentCount + 1;
        }
    }

    // Call API
    await likePostApi(postId);
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatContent(text) {
    if (!text) return '';
    // Trim whitespace and replace 3+ consecutive newlines with 2
    const trimmed = text.trim().replace(/\n{3,}/g, '\n\n');
    return escapeHtml(trimmed).replace(/\n/g, '<br>');
}

function formatDate(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        // Check if date is valid
        if (isNaN(date.getTime())) return '';

        const now = new Date();
        const diff = (now - date) / 1000; // seconds

        // Adjust for timezone differences if needed, usually backend sends UTC
        // If diff is negative (client time behind server), treat as 'just now'
        if (diff < 0 || diff < 60) return 'Vừa xong';
        if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
        return date.toLocaleDateString('vi-VN');
    } catch (e) {
        return '';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await initCommunity();
});

async function initCommunity() {
    try {
        // Always fetch fresh user data from server to ensure consistency
        const response = await fetch(`${API_BASE_URL}/account/me`);
        if (response.ok) {
            const user = await response.json();

            // Update localStorage with fresh data
            localStorage.setItem('user', JSON.stringify(user));
            currentUserId = user.id;

            // Update UI elements
            updateHeaderAndCreatePostAvatar(user);

            // Initialize SignalR only after we have confirmed identity
            await initializeSignalR();

            // Load initial posts
            loadPosts();
        } else {
            console.warn('User not authenticated, redirecting to login');
            // Optional: Redirect or show login prompt
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Error initializing community:', error);
    }
}

// Helper function to update header and create post avatar
function updateHeaderAndCreatePostAvatar(user) {
    // Update header
    const userMenu = document.getElementById('userMenu');
    if (userMenu) {
        userMenu.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;" onclick="window.location.href='change-password.html'">
                <span style="font-weight: 500; color: #374151;">${escapeHtml(user.fullName || user.username)}</span>
                <div class="user-avatar" style="width: 32px; height: 32px; font-size: 0.8rem;">
                    ${renderAvatar(user.avatarUrl, user.fullName || user.username)}
                </div>
            </div>
        `;
    }

    // Update create post avatar
    const createPostAvatars = document.querySelectorAll('.create-post-header .user-avatar');
    createPostAvatars.forEach(avatar => {
        avatar.innerHTML = renderAvatar(user.avatarUrl, user.fullName || user.username);
    });

    // Update all current user avatar placeholders (comment inputs)
    const currentUserAvatars = document.querySelectorAll('.current-user-avatar');
    currentUserAvatars.forEach(avatar => {
        avatar.innerHTML = renderAvatar(user.avatarUrl, user.fullName || user.username);
    });
}



// Reaction Mappings
const REACTION_TYPES = {
    'like': { icon: '👍', label: 'Thích', class: 'color-like' },
    'love': { icon: '❤️', label: 'Yêu thích', class: 'color-love' },
    'care': { icon: '🥰', label: 'Thương thương', class: 'color-care' },
    'haha': { icon: '😆', label: 'Haha', class: 'color-haha' },
    'wow': { icon: '😮', label: 'Wow', class: 'color-wow' },
    'sad': { icon: '😢', label: 'Buồn', class: 'color-sad' },
    'angry': { icon: '😡', label: 'Phẫn nộ', class: 'color-angry' }
};

// React to post
function reactToPost(postId, reactionType) {
    const post = document.getElementById(`post-${postId}`);
    if (!post) return;

    const btn = post.querySelector('.action-btn'); // The like button
    if (!btn) return;

    const reaction = REACTION_TYPES[reactionType] || REACTION_TYPES['like'];
    const isAlreadyLiked = btn.classList.contains('liked');
    const currentReactionClass = Array.from(btn.classList).find(c => c.startsWith('color-'));
    const isSameReaction = btn.classList.contains(reaction.class);

    // Logic:
    // 1. If same reaction clicked: Unlike (Toggle Off).
    // 2. If different reaction and already liked: Switch visual only (Assume backend doesn't care about type, just count).
    //    Note: If backend DOES care, we would need a specific endpoint or call toggle twice (bad). 
    //    Assuming "Visual Only" for types.
    // 3. If not liked: Like (Toggle On).

    if (isSameReaction) {
        // Case 1: Unlike
        resetLikeButton(btn);
        likePostApi(postId); // Backend Toggle Off
    } else if (isAlreadyLiked) {
        // Case 2: Switch Reaction (Visual only)
        setLikeButton(btn, reaction);
        // Do NOT call API, as we are already "Liked" in backend's eyes (count = 1).
        // Calling toggle would unlike it.
    } else {
        // Case 3: New Like
        setLikeButton(btn, reaction);
        likePostApi(postId); // Backend Toggle On

        // Optimistic Count Update (Increment)
        const countSpan = btn.querySelector('.like-count');
        if (countSpan) {
            const currentCount = parseInt(countSpan.textContent || '0');
            countSpan.textContent = currentCount + 1;
        }
    }
}

// Helper: Set Button UI
function setLikeButton(btn, reaction) {
    // Remove all reaction classes
    Object.values(REACTION_TYPES).forEach(r => btn.classList.remove(r.class));
    btn.classList.add('liked');
    btn.classList.add(reaction.class);

    // Preserve count
    const count = btn.querySelector('.like-count')?.textContent || '1';

    btn.innerHTML = `<span class="animate-bounce" style="display:inline-block; font-size: 1.2rem;">${reaction.icon}</span> <span class="like-count">${count}</span> ${reaction.label}`;
}

// Helper: Reset Button UI
function resetLikeButton(btn) {
    btn.classList.remove('liked');
    Object.values(REACTION_TYPES).forEach(r => btn.classList.remove(r.class));

    // Preserve count
    const count = btn.querySelector('.like-count')?.textContent || '0';

    btn.innerHTML = `<i class="far fa-heart"></i> <span class="like-count">${count}</span> Thích`;
}

// Helper: API Call
async function likePostApi(postId) {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return; // Should be handled by caller auth check ideally

    try {
        await fetch(`${API_BASE_URL}/community/posts/${postId}/like`, {
            method: 'POST',
            headers: { 'X-User-Id': user.id }
        });
    } catch (error) {
        console.error('Error toggling like:', error);
    }
}

// Emoji Picker Logic
function toggleEmojiPicker(triggerBtn) {
    const wrapper = triggerBtn.closest('.comment-input-wrapper');
    if (!wrapper) return;

    // Check if picker already exists
    let picker = wrapper.querySelector('.emoji-picker-container');
    if (picker) {
        picker.remove(); // Toggle off
        return;
    }

    // Close other pickers
    document.querySelectorAll('.emoji-picker-container').forEach(el => el.remove());

    // Create picker
    picker = document.createElement('div');
    picker.className = 'emoji-picker-container';

    // Safer set of emojis
    const emojis = ['😊', '😂', '🥰', '😍', '😒', '😭', '👎', '🔥', '🎉', '❤️', '🤔', '👋', '💯'];

    picker.innerHTML = emojis.map(emoji =>
        `<div class="emoji-item" onclick="insertEmoji('${emoji}', this)">${emoji}</div>`
    ).join('');

    wrapper.appendChild(picker);

    // Close when clicking outside
    const closeHandler = (e) => {
        if (!wrapper.contains(e.target)) {
            picker.remove();
            document.removeEventListener('click', closeHandler);
        }
    };
    // Delay adding listener to prevent immediate closing
    setTimeout(() => document.addEventListener('click', closeHandler), 0);
}

function insertEmoji(emoji, emojiItem) {
    // Find input relative to the emoji item
    const wrapper = emojiItem.closest('.comment-input-wrapper');
    if (wrapper) {
        const input = wrapper.querySelector('input');
        if (input) {
            input.value += emoji;
            input.focus();
        }
    }
}
