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

// Logic: Handle Vote
function handleVote(postId, value) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (!post.votes) post.votes = {};

    const previousVote = post.votes[myId] || 0;

    // Toggle vote if clicking same button
    if (previousVote === value) {
        delete post.votes[myId];
        post.score -= value;
    } else {
        post.votes[myId] = value;
        post.score += (value - previousVote);
    }

    // Update UI
    const scoreEl = document.getElementById(`score-${postId}`);
    if (scoreEl) scoreEl.textContent = post.score;

    // Update button styles
    const upBtn = document.querySelector(`.upvote-btn[data-id="${postId}"]`);
    const downBtn = document.querySelector(`.downvote-btn[data-id="${postId}"]`);

    if (upBtn) upBtn.classList.toggle('text-orange-500', post.votes[myId] === 1);
    if (downBtn) downBtn.classList.toggle('text-blue-500', post.votes[myId] === -1);

    storageService.savePost(post);

    // Broadcast vote
    p2pManager.broadcast({
        type: 'vote',
        payload: {
            postId: postId,
            userId: myId,
            value: post.votes[myId] || 0, // 0 means removed vote
            newScore: post.score
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
    if (typeof post.score !== 'number') post.score = 0;

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
            <span class="font-bold text-mono-700 text-sm" id="score-${post.id}">${post.score}</span>
            <button class="p-1 rounded hover:bg-mono-200 transition-colors downvote-btn ${myVote === -1 ? 'text-blue-500' : 'text-mono-400'}" data-id="${post.id}">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 20l8-8h-6v-8h-4v8h-6z"/></svg>
            </button>
        </div>
        <div class="flex-1">
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
            ${post.image ? `<div class="mt-3"><img src="${post.image}" class="rounded-lg max-h-96 w-auto border border-mono-200 object-cover"></div>` : ''}
        </div>
    `;

    // Attach event listeners for votes
    const upBtn = postEl.querySelector('.upvote-btn');
    const downBtn = postEl.querySelector('.downvote-btn');

    upBtn.onclick = () => handleVote(post.id, 1);
    downBtn.onclick = () => handleVote(post.id, -1);

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
            renderPost(post);
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
                    renderPost(data.payload);
                    storageService.savePost(data.payload);
                }
            } else if (data.type === 'profile-update') {
                console.log(`[App] Profile update from ${peerId}:`, data.payload);
                peerProfiles[peerId] = data.payload;
                updatePeerList();
            } else if (data.type === 'vote') {
                const { postId, userId, value, newScore } = data.payload;
                const post = posts.find(p => p.id === postId);
                if (post) {
                    if (!post.votes) post.votes = {};

                    if (value === 0) {
                        delete post.votes[userId];
                    } else {
                        post.votes[userId] = value;
                    }

                    // Optimistically use the broadcaster's score or recalculate? 
                    // Let's trust the broadcaster's score for now to avoid desync
                    post.score = newScore;

                    storageService.savePost(post);

                    // Update UI
                    const scoreEl = document.getElementById(`score-${postId}`);
                    if (scoreEl) scoreEl.textContent = post.score;
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
        score: 0,
        votes: {}
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
