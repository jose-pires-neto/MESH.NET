// App State
console.log("App version: Graph Interaction + Mobile Fix");
let myId = null;
let myUsername = null;
let signalingService = null;
let p2pManager = null;
let storageService = null;
let networkVisualizer = null;
let mobileNetworkVisualizer = null;
const posts = []; // Array of post objects
let myAvatar = null;
let myBio = null;
let peerProfiles = {}; // Cache for peer profiles { peerId: { username, avatar, bio } }
let currentImageBase64 = null;

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const appContainer = document.getElementById('app-container');
const usernameInput = document.getElementById('username-input');
const joinBtn = document.getElementById('join-btn');
const currentUserAvatar = document.getElementById('current-user-avatar');
const currentUserName = document.getElementById('current-user-name');
const connectionStatus = document.getElementById('connection-status');
const feedContainer = document.getElementById('feed-container');
const peersList = document.getElementById('peers-list');
const mobilePeersList = document.getElementById('mobile-peers-list');

// FAB & Modal Elements
const fabCreatePost = document.getElementById('fab-create-post');
const createPostModal = document.getElementById('create-post-modal');
const closeCreatePostBtn = document.getElementById('close-create-post-btn');
const submitPostBtn = document.getElementById('submit-post-btn');
const modalPostContent = document.getElementById('modal-post-content');
const modalImageInput = document.getElementById('modal-image-input');
const modalAttachImageBtn = document.getElementById('modal-attach-image-btn');
const modalImagePreviewContainer = document.getElementById('modal-image-preview-container');
const modalImagePreview = document.getElementById('modal-image-preview');
const modalRemoveImageBtn = document.getElementById('modal-remove-image-btn');
const modalUserAvatar = document.getElementById('modal-user-avatar');

// Mobile Nav Elements
const mobileNavFeed = document.getElementById('mobile-nav-feed');
const mobileNavNetwork = document.getElementById('mobile-nav-network');
const mobileNavProfile = document.getElementById('mobile-nav-profile');
const mainView = document.querySelector('main');
const mobileNetworkView = document.getElementById('mobile-network-view');

// Profile Elements
const profileLink = document.getElementById('profile-link');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const settingsAvatarInput = document.getElementById('settings-avatar-input');
const settingsAvatarRandomBtn = document.getElementById('settings-avatar-random-btn');
const settingsBioInput = document.getElementById('settings-bio-input');

// Peer Modal Elements
const peerModal = document.getElementById('peer-modal');
const closePeerModalBtn = document.getElementById('close-peer-modal-btn');
const peerModalAvatar = document.getElementById('peer-modal-avatar');
const peerModalUsername = document.getElementById('peer-modal-username');
const peerModalId = document.getElementById('peer-modal-id');
const peerModalBio = document.getElementById('peer-modal-bio');
const peerModalPosts = document.getElementById('peer-modal-posts');

// Thread Modal Elements
const threadModal = document.getElementById('thread-modal');
const closeThreadBtn = document.getElementById('close-thread-btn');
const threadContainer = document.getElementById('thread-container');
const threadParentPost = document.getElementById('thread-parent-post');
const threadReplies = document.getElementById('thread-replies');
const threadReplyInput = document.getElementById('thread-reply-input');
const threadReplyBtn = document.getElementById('thread-reply-btn');
const threadUserAvatar = document.getElementById('thread-user-avatar');

let currentThreadId = null;

// Helper: Generate random ID
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// Helper: Get initials
function getInitials(name) {
    return name ? name.slice(0, 2).toUpperCase() : '?';
}

// Helper: Format time
function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Helper: Calculate Votes
function calculateVotes(post) {
    let upvotes = 0;
    let downvotes = 0;
    if (post.votes) {
        Object.values(post.votes).forEach(v => {
            if (v === 1) upvotes++;
            if (v === -1) downvotes++;
        });
    }
    return { upvotes, downvotes };
}

// Logic: Handle Vote
function handleVote(postId, value) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (!post.votes) post.votes = {};

    const previousVote = post.votes[myId] || 0;

    // Toggle vote if clicking same button
    if (previousVote === value) {
        delete post.votes[myId];
    } else {
        post.votes[myId] = value;
    }

    // Recalculate counts
    const { upvotes, downvotes } = calculateVotes(post);
    post.upvotes = upvotes;
    post.downvotes = downvotes;
    post.score = upvotes - downvotes; // Keep score for sorting

    // Update UI (Feed)
    const upEl = document.getElementById(`upvotes-${postId}`);
    const downEl = document.getElementById(`downvotes-${postId}`);
    if (upEl) upEl.textContent = post.upvotes;
    if (downEl) downEl.textContent = post.downvotes;

    // Update UI (Thread View - Parent Post)
    const threadUpEl = document.getElementById(`thread-upvotes-${postId}`);
    const threadDownEl = document.getElementById(`thread-downvotes-${postId}`);
    if (threadUpEl) threadUpEl.textContent = post.upvotes;
    if (threadDownEl) threadDownEl.textContent = post.downvotes;

    // Update button styles (Feed)
    const upBtn = document.querySelector(`.upvote-btn[data-id="${postId}"]`);
    const downBtn = document.querySelector(`.downvote-btn[data-id="${postId}"]`);

    if (upBtn) {
        upBtn.classList.toggle('text-orange-500', post.votes[myId] === 1);
        upBtn.classList.toggle('text-mono-400', post.votes[myId] !== 1);
    }
    if (downBtn) {
        downBtn.classList.toggle('text-blue-500', post.votes[myId] === -1);
        downBtn.classList.toggle('text-mono-400', post.votes[myId] !== -1);
    }

    // Update button styles (Thread View)
    const threadUpBtn = document.getElementById(`thread-upvote-${postId}`);
    const threadDownBtn = document.getElementById(`thread-downvote-${postId}`);

    if (threadUpBtn) {
        threadUpBtn.classList.toggle('text-orange-500', post.votes[myId] === 1);
        threadUpBtn.classList.toggle('text-mono-400', post.votes[myId] !== 1);
    }
    if (threadDownBtn) {
        threadDownBtn.classList.toggle('text-blue-500', post.votes[myId] === -1);
        threadDownBtn.classList.toggle('text-mono-400', post.votes[myId] !== -1);
    }

    storageService.savePost(post);

    // Broadcast vote
    p2pManager.broadcast({
        type: 'vote',
        payload: {
            postId: postId,
            userId: myId,
            value: post.votes[myId] || 0
        }
    });
}

// UI: Render a post
function renderPost(post) {
    // Check if element already exists to update it instead of recreating
    let postEl = document.getElementById(`post-${post.id}`);
    const isNew = !postEl;

    if (isNew) {
        postEl = document.createElement('div');
        postEl.id = `post-${post.id}`;
        postEl.className = 'p-6 border-b border-mono-200 hover:bg-mono-50 transition-colors flex space-x-4';
    }

    // Ensure votes initialized
    if (!post.votes) post.votes = {};

    // Calculate initial counts if missing
    if (typeof post.upvotes !== 'number' || typeof post.downvotes !== 'number') {
        const counts = calculateVotes(post);
        post.upvotes = counts.upvotes;
        post.downvotes = counts.downvotes;
        post.score = counts.upvotes - counts.downvotes;
    }

    const myVote = post.votes[myId] || 0;

    // Use avatar if available, else initials
    const avatarHtml = post.avatar
        ? `<img src="${post.avatar}" class="w-10 h-10 rounded-full object-cover border border-mono-200">`
        : `<div class="w-10 h-10 rounded-full bg-mono-200 flex items-center justify-center text-mono-600 font-bold">${getInitials(post.username)}</div>`;

    postEl.innerHTML = `
        <div class="flex flex-col items-center space-y-1 pt-1">
            <button class="p-1 rounded hover:bg-mono-200 transition-colors upvote-btn ${myVote === 1 ? 'text-orange-500' : 'text-mono-400'}" data-id="${post.id}">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4l-8 8h6v8h4v-8h6z"/></svg>
            </button>
            <span class="font-bold text-mono-700 text-sm" id="upvotes-${post.id}">${post.upvotes || 0}</span>
            
            <button class="p-1 rounded hover:bg-mono-200 transition-colors downvote-btn ${myVote === -1 ? 'text-blue-500' : 'text-mono-400'}" data-id="${post.id}">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 20l8-8h-6v-8h-4v8h-6z"/></svg>
            </button>
            <span class="font-bold text-mono-700 text-sm" id="downvotes-${post.id}">${post.downvotes || 0}</span>
        </div>
        <div class="flex-1 cursor-pointer post-content-area" data-id="${post.id}">
            <div class="flex items-center space-x-2">
                <div class="flex-shrink-0">
                    ${avatarHtml}
                </div>
                <div>
                    <span class="font-bold text-mono-900">${post.username}</span>
                    <span class="text-xs text-mono-400">@${post.userId.substr(0, 6)} · ${formatTime(post.timestamp)}</span>
                </div>
            </div>
            <p class="mt-2 text-mono-800 text-lg leading-relaxed">${post.content}</p>
            ${post.image ? `<div class="mt-3"><img src="${post.image}" class="rounded-lg max-h-64 md:max-h-96 w-full object-cover border border-mono-200"></div>` : ''}
            
            <!-- Action Bar -->
            <div class="mt-3 flex items-center justify-between text-mono-500">
                <div class="flex items-center space-x-4">
                    <button class="flex items-center space-x-1 hover:bg-mono-100 p-2 rounded-full transition-colors reply-btn" data-id="${post.id}">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                        <span class="text-sm font-medium" id="reply-count-${post.id}">${post.replyCount || 0}</span>
                        <span class="text-sm font-medium hidden md:inline">Comments</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    // Attach event listeners for votes
    const upBtn = postEl.querySelector('.upvote-btn');
    const downBtn = postEl.querySelector('.downvote-btn');

    upBtn.onclick = (e) => { e.stopPropagation(); handleVote(post.id, 1); };
    downBtn.onclick = (e) => { e.stopPropagation(); handleVote(post.id, -1); };

    // Thread Click Handler
    const contentArea = postEl.querySelector('.post-content-area');
    contentArea.onclick = (e) => {
        // Prevent opening thread if clicking a button inside content area (if any)
        if (e.target.closest('button')) return;
        openThread(post);
    };

    const replyBtn = postEl.querySelector('.reply-btn');
    replyBtn.onclick = (e) => {
        e.stopPropagation();
        openThread(post);
        // Focus reply input
        setTimeout(() => threadReplyInput.focus(), 300);
    };

    if (isNew) {
        // Prepend to feed (sort logic handled separately or simple prepend)
        // For now, simple prepend, but we might want to re-sort
        feedContainer.insertBefore(postEl, feedContainer.firstChild);

        // Remove "Waiting for peers" if present
        const waitingMsg = feedContainer.querySelector('.text-center.text-mono-400');
        if (waitingMsg) waitingMsg.remove();
    }
}

// UI: Update Peer List
function updatePeerList() {
    const updateList = (container) => {
        if (!container) return;
        container.innerHTML = '';
        const peers = Object.keys(p2pManager.peers);

        if (peers.length === 0) {
            container.innerHTML = '<p class="text-sm text-mono-400">No active peers.</p>';
            return;
        }

        peers.forEach(peerId => {
            const profile = peerProfiles[peerId] || {};
            const displayName = profile.username || `Peer ${peerId.substr(0, 6)}`;

            const el = document.createElement('div');
            el.className = 'flex items-center space-x-3 p-2 rounded-lg hover:bg-mono-50 cursor-pointer';
            el.onclick = () => onNodeClick(peerId); // Click to open modal

            el.innerHTML = `
                <div class="w-8 h-8 rounded-full bg-mono-200 flex items-center justify-center text-xs text-mono-600 font-bold overflow-hidden">
                    ${profile.avatar ? `<img src="${profile.avatar}" class="w-full h-full object-cover">` : getInitials(displayName)}
                </div>
                <div class="overflow-hidden">
                    <p class="text-sm font-medium text-mono-900 truncate">${displayName}</p>
                    <p class="text-xs text-green-600">Connected</p>
                </div>
            `;
            container.appendChild(el);
        });
    };

    updateList(peersList);
    updateList(mobilePeersList);

    const peerCount = Object.keys(p2pManager.peers).length;
    connectionStatus.textContent = `Connected to ${peerCount} peer(s)`;
    connectionStatus.className = 'text-xs text-green-600 font-mono font-bold';
}

// Handler: Node/Peer Click
const onNodeClick = (nodeId) => {
    if (nodeId === 'me') return; // Optionally show own profile

    const profile = peerProfiles[nodeId] || { username: 'Unknown Peer', bio: 'No info available.' };
    const peerPosts = posts.filter(p => p.userId === nodeId).sort((a, b) => b.timestamp - a.timestamp).slice(0, 3);

    // Populate Modal
    peerModalUsername.textContent = profile.username || 'Unknown Peer';
    peerModalId.textContent = `ID: ${nodeId.substr(0, 8)}...`;
    peerModalBio.textContent = profile.bio || 'No bio available.';

    if (profile.avatar) {
        peerModalAvatar.innerHTML = `<img src="${profile.avatar}" class="w-full h-full object-cover">`;
    } else {
        peerModalAvatar.innerHTML = `<div class="w-full h-full flex items-center justify-center text-2xl font-bold text-mono-400">${getInitials(profile.username || '?')}</div>`;
    }

    // Recent Posts
    peerModalPosts.innerHTML = '';
    if (peerPosts.length > 0) {
        peerPosts.forEach(post => {
            const el = document.createElement('div');
            el.className = 'p-2 bg-mono-50 rounded border border-mono-100 mb-2';
            el.textContent = post.content || '(Image)';
            peerModalPosts.appendChild(el);
        });
    } else {
        peerModalPosts.innerHTML = '<p class="text-center text-mono-400">No recent posts.</p>';
    }

    peerModal.classList.remove('hidden');
};

// Core: Initialize App
async function initApp(username) {
    console.log("initApp called with:", username);
    myUsername = username;

    // Check if we have a stored ID
    const profile = await storageService.getProfile();

    if (profile && profile.username === username) {
        myId = profile.userId;
        myAvatar = profile.avatar;
        myBio = profile.bio;
    } else {
        myId = generateId();
        await storageService.saveProfile(myUsername, myId);
    }

    currentUserAvatar.textContent = getInitials(myUsername);
    currentUserName.textContent = myUsername;

    // Update Profile UI with loaded data
    if (myAvatar) {
        currentUserAvatar.innerHTML = `<img src="${myAvatar}" class="w-full h-full rounded-full object-cover">`;
    }

    // Load cached posts
    const cachedPosts = await storageService.getPosts();

    // Sort by Score Ascending (so highest score is rendered last and ends up at top)
    cachedPosts.sort((a, b) => {
        const scoreA = a.score || 0;
        const scoreB = b.score || 0;
        if (scoreA !== scoreB) return scoreA - scoreB;
        return a.timestamp - b.timestamp;
    });

    cachedPosts.forEach(post => {
        if (!posts.find(p => p.id === post.id)) {
            posts.push(post);
            if (!post.parentId) {
                renderPost(post);
            }
        }
    });

    loginScreen.classList.add('hidden');
    appContainer.classList.remove('hidden');

    // Initialize Visualizer with Click Handler
    networkVisualizer = new NetworkVisualizer('network-canvas', onNodeClick);
    networkVisualizer.addNode('me');

    if (document.getElementById('mobile-network-canvas')) {
        mobileNetworkVisualizer = new NetworkVisualizer('mobile-network-canvas', onNodeClick);
        mobileNetworkVisualizer.addNode('me');
    }

    // Initialize Services
    signalingService = new SignalingService(
        myId,
        (peerId, initiator) => {
            p2pManager.connectToPeer(peerId, initiator);
        },
        (signalData) => {
            p2pManager.handleSignal(signalData);
        }
    );

    p2pManager = new P2PManager(
        myId,
        signalingService,
        (data, peerId) => {
            // On Data Received
            if (data.type === 'post') {
                if (!posts.find(p => p.id === data.payload.id)) {
                    posts.push(data.payload);
                    if (!data.payload.parentId) {
                        renderPost(data.payload);
                    } else {
                        // If it's a reply, update the parent's reply count
                        const parentPost = posts.find(p => p.id === data.payload.parentId);
                        if (parentPost) {
                            parentPost.replyCount = (parentPost.replyCount || 0) + 1;
                            // Update UI for reply count
                            const replyCountEl = document.getElementById(`reply-count-${parentPost.id}`);
                            if (replyCountEl) replyCountEl.textContent = parentPost.replyCount;
                            storageService.savePost(parentPost);
                        }

                        // If we are viewing the thread, render the reply
                        if (currentThreadId === data.payload.parentId) {
                            renderThreadReply(data.payload);
                        }
                    }
                    storageService.savePost(data.payload);
                }
            } else if (data.type === 'profile-update') {
                console.log(`[App] Profile update from ${peerId}:`, data.payload);
                peerProfiles[peerId] = data.payload;
                updatePeerList();
            } else if (data.type === 'vote') {
                const { postId, userId, value } = data.payload;
                const post = posts.find(p => p.id === postId);
                if (post) {
                    if (!post.votes) post.votes = {};

                    if (value === 0) {
                        delete post.votes[userId];
                    } else {
                        post.votes[userId] = value;
                    }

                    // Recalculate
                    const { upvotes, downvotes } = calculateVotes(post);
                    post.upvotes = upvotes;
                    post.downvotes = downvotes;
                    post.score = upvotes - downvotes;

                    storageService.savePost(post);

                    // Update UI (Feed)
                    const upEl = document.getElementById(`upvotes-${postId}`);
                    const downEl = document.getElementById(`downvotes-${postId}`);
                    if (upEl) upEl.textContent = post.upvotes;
                    if (downEl) downEl.textContent = post.downvotes;

                    // Update UI (Thread View)
                    const threadUpEl = document.getElementById(`thread-upvotes-${postId}`);
                    const threadDownEl = document.getElementById(`thread-downvotes-${postId}`);
                    if (threadUpEl) threadUpEl.textContent = post.upvotes;
                    if (threadDownEl) threadDownEl.textContent = post.downvotes;
                }
            }
        },
        (peerId) => {
            // On Peer Connect
            updatePeerList();
            networkVisualizer.addNode(peerId);
            networkVisualizer.addConnection('me', peerId);
            if (mobileNetworkVisualizer) {
                mobileNetworkVisualizer.addNode(peerId);
                mobileNetworkVisualizer.addConnection('me', peerId);
            }

            // Send my profile
            p2pManager.sendProfileUpdate(peerId, {
                username: myUsername,
                userId: myId,
                avatar: myAvatar,
                bio: myBio
            });
        },
        (peerId) => {
            // On Peer Disconnect
            updatePeerList();
            networkVisualizer.removeNode(peerId);
            if (mobileNetworkVisualizer) {
                mobileNetworkVisualizer.removeNode(peerId);
            }
        }
    );
}

// Event Listeners
modalAttachImageBtn.addEventListener('click', () => modalImageInput.click());

modalImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        if (file.size > 500 * 1024) { // Increased limit to 500KB
            alert('Image too large! Please choose an image under 500KB.');
            modalImageInput.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            currentImageBase64 = e.target.result;
            modalImagePreview.src = currentImageBase64;
            modalImagePreviewContainer.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
});

modalRemoveImageBtn.addEventListener('click', () => {
    currentImageBase64 = null;
    modalImageInput.value = '';
    modalImagePreviewContainer.classList.add('hidden');
});

// FAB & Modal Logic
fabCreatePost.addEventListener('click', () => {
    createPostModal.classList.remove('hidden');
    // Small delay to allow display:flex to apply before opacity transition
    setTimeout(() => {
        createPostModal.classList.remove('opacity-0', 'scale-95');
        appContainer.classList.add('blur-md', 'scale-[0.98]'); // Blur background
    }, 10);

    // Update modal avatar
    if (myAvatar) {
        modalUserAvatar.innerHTML = `<img src="${myAvatar}" class="w-full h-full rounded-full object-cover">`;
    } else {
        modalUserAvatar.textContent = getInitials(myUsername);
    }
});

function closeModal() {
    createPostModal.classList.add('opacity-0', 'scale-95');
    appContainer.classList.remove('blur-md', 'scale-[0.98]');
    setTimeout(() => {
        createPostModal.classList.add('hidden');
    }, 300); // Match transition duration
}

closeCreatePostBtn.addEventListener('click', closeModal);

submitPostBtn.addEventListener('click', async () => {
    const content = modalPostContent.value.trim();
    if (!content && !currentImageBase64) return;

    const post = {
        id: generateId(),
        userId: myId,
        username: myUsername,
        content: content,
        image: currentImageBase64,
        avatar: myAvatar,
        timestamp: Date.now(),
        timestamp: Date.now(),
        score: 0,
        votes: {},
        replyCount: 0
    };

    posts.push(post);
    renderPost(post);
    storageService.savePost(post);

    p2pManager.broadcast({
        type: 'post',
        payload: post
    });

    // Reset and Close
    modalPostContent.value = '';
    currentImageBase64 = null;
    modalImageInput.value = '';
    modalImagePreviewContainer.classList.add('hidden');
    closeModal();
});

function updateProfileUI() {
    currentUserName.textContent = myUsername;
    if (myAvatar) {
        currentUserAvatar.innerHTML = `<img src="${myAvatar}" class="w-full h-full rounded-full object-cover">`;
    } else {
        currentUserAvatar.textContent = getInitials(myUsername);
    }
}

profileLink.addEventListener('click', () => {
    settingsAvatarInput.value = myAvatar || '';
    settingsBioInput.value = myBio || '';
    settingsModal.classList.remove('hidden');
});

closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
});

if (closePeerModalBtn) {
    closePeerModalBtn.addEventListener('click', () => {
        peerModal.classList.add('hidden');
    });
}

settingsAvatarRandomBtn.addEventListener('click', () => {
    const randomId = Math.floor(Math.random() * 1000);
    settingsAvatarInput.value = `https://picsum.photos/seed/${randomId}/200`;
});

saveSettingsBtn.addEventListener('click', async () => {
    myAvatar = settingsAvatarInput.value.trim();
    myBio = settingsBioInput.value.trim();

    await storageService.saveProfile(myUsername, myId, myAvatar, myBio);
    updateProfileUI();
    settingsModal.classList.add('hidden');

    p2pManager.broadcast({
        type: 'profile-update',
        payload: {
            username: myUsername,
            userId: myId,
            avatar: myAvatar,
            bio: myBio
        }
    });
});

joinBtn.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    if (username) {
        initApp(username);
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (typeof idb === 'undefined') {
            console.error("IDB library not loaded!");
            alert("Error: Database library failed to load. Please refresh.");
            return;
        }
        storageService = new StorageService();
    } catch (err) {
        console.error("Failed to init storage:", err);
    }

    try {
        if (storageService) {
            const profile = await storageService.getProfile();
            if (profile && profile.username) {
                initApp(profile.username);
            }
        }
    } catch (err) {
        console.error("Error restoring session:", err);
    }
});

// Thread Logic
function openThread(post) {
    currentThreadId = post.id;
    threadModal.classList.remove('hidden');

    // Render Parent
    threadParentPost.innerHTML = '';
    // Clone logic or re-render? Re-rendering is safer to get fresh state
    // We can reuse renderPost logic but append to a different container? 
    // Or just manually build HTML for parent to look slightly different (bigger?)
    // Let's reuse renderPost but we need to modify it to accept a container.
    // For now, let's just manually render the parent to keep it simple and customizable.

    const avatarHtml = post.avatar
        ? `<img src="${post.avatar}" class="w-12 h-12 rounded-full object-cover border border-mono-200">`
        : `<div class="w-12 h-12 rounded-full bg-mono-200 flex items-center justify-center text-mono-600 font-bold text-lg">${getInitials(post.username)}</div>`;

    const myVote = (post.votes && post.votes[myId]) || 0;

    threadParentPost.innerHTML = `
        <div class="p-6">
            <div class="flex items-center space-x-3 mb-4">
                ${avatarHtml}
                <div>
                    <h3 class="font-bold text-mono-900 text-lg">${post.username}</h3>
                    <span class="text-mono-500">@${post.userId.substr(0, 6)}</span>
                </div>
            </div>
            <p class="text-xl text-mono-900 leading-relaxed mb-4">${post.content}</p>
            ${post.image ? `<div class="mb-4 flex justify-center bg-mono-50 rounded-xl overflow-hidden"><img src="${post.image}" class="max-h-[50vh] w-auto object-contain"></div>` : ''}
            <div class="text-sm text-mono-400 border-b border-mono-100 pb-4 mb-4">
                ${new Date(post.timestamp).toLocaleString()}
            </div>
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-6">
                    <div class="flex items-center space-x-2">
                        <button id="thread-upvote-${post.id}" class="p-2 rounded-full hover:bg-mono-100 transition-colors ${myVote === 1 ? 'text-orange-500' : 'text-mono-400'}">
                            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4l-8 8h6v8h4v-8h6z"/></svg>
                        </button>
                        <span class="font-bold text-mono-900 text-lg" id="thread-upvotes-${post.id}">${post.upvotes || 0}</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button id="thread-downvote-${post.id}" class="p-2 rounded-full hover:bg-mono-100 transition-colors ${myVote === -1 ? 'text-blue-500' : 'text-mono-400'}">
                            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 20l8-8h-6v-8h-4v8h-6z"/></svg>
                        </button>
                        <span class="font-bold text-mono-900 text-lg" id="thread-downvotes-${post.id}">${post.downvotes || 0}</span>
                    </div>
                </div>
                <div class="flex items-center space-x-2 text-mono-500">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                    <span class="font-medium">${post.replyCount || 0} Comments</span>
                </div>
            </div>
        </div>
    `;

    // Attach listeners for parent post in thread
    document.getElementById(`thread-upvote-${post.id}`).onclick = () => handleVote(post.id, 1);
    document.getElementById(`thread-downvote-${post.id}`).onclick = () => handleVote(post.id, -1);

    // Render Replies
    threadReplies.innerHTML = '';
    const replies = posts.filter(p => p.parentId === post.id).sort((a, b) => a.timestamp - b.timestamp);
    replies.forEach(reply => renderThreadReply(reply));

    // Setup Reply Input Avatar
    if (myAvatar) {
        threadUserAvatar.innerHTML = `<img src="${myAvatar}" class="w-full h-full object-cover">`;
    } else {
        threadUserAvatar.textContent = getInitials(myUsername);
    }
}

function renderThreadReply(reply) {
    const el = document.createElement('div');
    el.className = 'p-6 border-b border-mono-100 flex space-x-4';

    const avatarHtml = reply.avatar
        ? `<img src="${reply.avatar}" class="w-10 h-10 rounded-full object-cover border border-mono-200">`
        : `<div class="w-10 h-10 rounded-full bg-mono-200 flex items-center justify-center text-mono-600 font-bold">${getInitials(reply.username)}</div>`;

    const myVote = (reply.votes && reply.votes[myId]) || 0;

    el.innerHTML = `
        <div class="flex flex-col items-center space-y-1 pt-1">
            <button class="p-1 rounded hover:bg-mono-200 transition-colors upvote-btn ${myVote === 1 ? 'text-orange-500' : 'text-mono-400'}" data-id="${reply.id}">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4l-8 8h6v8h4v-8h6z"/></svg>
            </button>
            <span class="font-bold text-mono-700 text-xs" id="upvotes-${reply.id}">${reply.upvotes || 0}</span>
            
            <button class="p-1 rounded hover:bg-mono-200 transition-colors downvote-btn ${myVote === -1 ? 'text-blue-500' : 'text-mono-400'}" data-id="${reply.id}">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 20l8-8h-6v-8h-4v8h-6z"/></svg>
            </button>
            <span class="font-bold text-mono-700 text-xs" id="downvotes-${reply.id}">${reply.downvotes || 0}</span>
        </div>
        <div class="flex-1">
            <div class="flex items-center space-x-2">
                <div class="flex-shrink-0">${avatarHtml}</div>
                <div>
                    <span class="font-bold text-mono-900 text-sm">${reply.username}</span>
                    <span class="text-xs text-mono-400">@${reply.userId.substr(0, 6)} · ${formatTime(reply.timestamp)}</span>
                </div>
            </div>
            <p class="mt-1 text-mono-800 leading-relaxed">${reply.content}</p>
        </div>
    `;

    // Attach vote listeners for reply
    const upBtn = el.querySelector('.upvote-btn');
    const downBtn = el.querySelector('.downvote-btn');
    upBtn.onclick = () => handleVote(reply.id, 1);
    downBtn.onclick = () => handleVote(reply.id, -1);

    threadReplies.appendChild(el);
}

closeThreadBtn.addEventListener('click', () => {
    threadModal.classList.add('hidden');
    currentThreadId = null;
});

threadReplyBtn.addEventListener('click', () => {
    const content = threadReplyInput.value.trim();
    if (!content) return;

    const reply = {
        id: generateId(),
        userId: myId,
        username: myUsername,
        content: content,
        avatar: myAvatar,
        timestamp: Date.now(),
        parentId: currentThreadId,
        upvotes: 0,
        downvotes: 0,
        votes: {},
        replyCount: 0
    };

    posts.push(reply);
    renderThreadReply(reply);
    storageService.savePost(reply);

    // Update parent post reply count
    const parentPost = posts.find(p => p.id === currentThreadId);
    if (parentPost) {
        parentPost.replyCount = (parentPost.replyCount || 0) + 1;
        storageService.savePost(parentPost);

        // Update UI in thread view if visible (it is)
        // We might want to update the parent post UI in the thread view to show new count?
        // But we just added the reply to the list, so the count is implicit.
        // However, we should update the "X Comments" text in the parent post header if we added it.
        // For now, let's just update the feed UI counter.
        const replyCountEl = document.getElementById(`reply-count-${parentPost.id}`);
        if (replyCountEl) replyCountEl.textContent = parentPost.replyCount;
    }

    p2pManager.broadcast({
        type: 'post',
        payload: reply
    });

    threadReplyInput.value = '';
});

// Old Post Btn Listener Removed

// Mobile Navigation Logic
if (mobileNavFeed) {
    mobileNavFeed.addEventListener('click', () => {
        mainView.classList.remove('hidden');
        mobileNetworkView.classList.add('hidden');

        mobileNavFeed.classList.add('text-mono-900');
        mobileNavFeed.classList.remove('text-mono-400');
        mobileNavNetwork.classList.add('text-mono-400');
        mobileNavNetwork.classList.remove('text-mono-900');
        mobileNavProfile.classList.add('text-mono-400');
        mobileNavProfile.classList.remove('text-mono-900');
    });

    mobileNavNetwork.addEventListener('click', () => {
        mainView.classList.add('hidden');
        mobileNetworkView.classList.remove('hidden');

        mobileNavNetwork.classList.add('text-mono-900');
        mobileNavNetwork.classList.remove('text-mono-400');
        mobileNavFeed.classList.add('text-mono-400');
        mobileNavFeed.classList.remove('text-mono-900');
        mobileNavProfile.classList.add('text-mono-400');
        mobileNavProfile.classList.remove('text-mono-900');
    });

    mobileNavProfile.addEventListener('click', () => {
        settingsAvatarInput.value = myAvatar || '';
        settingsBioInput.value = myBio || '';
        settingsModal.classList.remove('hidden');
    });
}
