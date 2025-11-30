// App State
console.log("App version: Simple Login Restored"); // Debug Log
let myId = null;
let myUsername = null;
let signalingService = null;
let p2pManager = null;
let storageService = null;
let networkVisualizer = null;
const posts = []; // Array of post objects

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const appContainer = document.getElementById('app-container');
const usernameInput = document.getElementById('username-input');
const joinBtn = document.getElementById('join-btn');
const currentUserAvatar = document.getElementById('current-user-avatar');
const currentUserName = document.getElementById('current-user-name');
const connectionStatus = document.getElementById('connection-status');
const postContent = document.getElementById('post-content');
const postBtn = document.getElementById('post-btn');
const feedContainer = document.getElementById('feed-container');
const peersList = document.getElementById('peers-list');
// Image Upload Elements
const imageInput = document.getElementById('image-input');
const attachImageBtn = document.getElementById('attach-image-btn');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const removeImageBtn = document.getElementById('remove-image-btn');
// Profile Elements
const profileLink = document.getElementById('profile-link');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const settingsAvatarInput = document.getElementById('settings-avatar-input');
const settingsAvatarRandomBtn = document.getElementById('settings-avatar-random-btn');
const settingsBioInput = document.getElementById('settings-bio-input');

let currentImageBase64 = null;
let myAvatar = null;
let myBio = null;

// Helper: Generate random ID
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// Helper: Get initials
function getInitials(name) {
    return name.slice(0, 2).toUpperCase();
}

// Helper: Format time
function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// UI: Render a post
function renderPost(post) {
    const postEl = document.createElement('div');
    postEl.className = 'p-6 border-b border-mono-200 hover:bg-mono-50 transition-colors';

    // Use avatar if available, else initials
    const avatarHtml = post.avatar
        ? `<img src="${post.avatar}" class="w-10 h-10 rounded-full object-cover border border-mono-200">`
        : `<div class="w-10 h-10 rounded-full bg-mono-200 flex items-center justify-center text-mono-600 font-bold">${getInitials(post.username)}</div>`;

    postEl.innerHTML = `
        <div class="flex space-x-4">
            <div class="flex-shrink-0">
                ${avatarHtml}
            </div>
            <div class="flex-1">
                <div class="flex items-center space-x-2">
                    <span class="font-bold text-mono-900">${post.username}</span>
                    <span class="text-xs text-mono-400">@${post.userId.substr(0, 6)} · ${formatTime(post.timestamp)}</span>
                </div>
                <p class="mt-1 text-mono-800 text-lg leading-relaxed">${post.content}</p>
                ${post.image ? `<div class="mt-3"><img src="${post.image}" class="rounded-lg max-h-96 w-auto border border-mono-200 object-cover"></div>` : ''}
            </div>
        </div>
    `;
    // Prepend to feed (newest first)
    // Check if empty state exists and remove it
    if (feedContainer.children.length === 1 && feedContainer.children[0].classList.contains('text-center')) {
        feedContainer.innerHTML = '';
    }
    feedContainer.insertBefore(postEl, feedContainer.firstChild);
}

// UI: Update Peer List
function updatePeerList() {
    peersList.innerHTML = '';
    const peers = Object.keys(p2pManager.peers);

    if (peers.length === 0) {
        peersList.innerHTML = '<p class="text-sm text-mono-400">No active peers.</p>';
        connectionStatus.textContent = 'Disconnected';
        connectionStatus.className = 'text-xs text-mono-400 font-mono';
        return;
    }

    connectionStatus.textContent = `Connected to ${peers.length} peer(s)`;
    connectionStatus.className = 'text-xs text-green-600 font-mono font-bold';

    peers.forEach(peerId => {
        const el = document.createElement('div');
        el.className = 'flex items-center space-x-3 p-2 rounded-lg hover:bg-mono-50';
        el.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-mono-200 flex items-center justify-center text-xs text-mono-600 font-bold">
                ${peerId.substr(0, 2).toUpperCase()}
            </div>
            <div class="overflow-hidden">
                <p class="text-sm font-medium text-mono-900 truncate">Peer ${peerId.substr(0, 6)}</p>
                <p class="text-xs text-green-600">Connected</p>
            </div>
        `;
        peersList.appendChild(el);
    });
}

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
    cachedPosts.forEach(post => {
        // Avoid duplicates if any
        if (!posts.find(p => p.id === post.id)) {
            posts.push(post);
            renderPost(post);
        }
    });

    loginScreen.classList.add('hidden');
    appContainer.classList.remove('hidden');

    // Initialize Visualizer
    networkVisualizer = new NetworkVisualizer('network-canvas');
    networkVisualizer.addNode('me'); // Add myself

    // Initialize Services
    signalingService = new SignalingService(
        myId,
        (peerId, initiator) => {
            // On Peer Found (via Firebase)
            p2pManager.connectToPeer(peerId, initiator);
        },
        (signalData) => {
            // On Signal Received (via Firebase)
            p2pManager.handleSignal(signalData);
        }
    );

    p2pManager = new P2PManager(
        myId,
        signalingService,
        (data, peerId) => {
            // On Data Received (via WebRTC)
            if (data.type === 'post') {
                // Check if we already have this post
                if (!posts.find(p => p.id === data.payload.id)) {
                    posts.push(data.payload);
                    renderPost(data.payload);
                    storageService.savePost(data.payload); // Persist
                }
            } else if (data.type === 'profile-update') {
                // Handle profile update (could update peer list UI or cache peer info)
                console.log(`[App] Profile update from ${peerId}:`, data.payload);
            }
        },
        (peerId) => {
            // On Peer Connect
            updatePeerList();
            networkVisualizer.addNode(peerId);
            networkVisualizer.addConnection('me', peerId);

            // Send my profile to new peer
            p2pManager.sendProfileUpdate(peerId, {
                username: myUsername,
                userId: myId,
                avatar: myAvatar,
                bio: myBio
            });

            // Sync: Send my posts to the new peer
            console.log(`[App] Syncing ${posts.length} posts to ${peerId}`);
            posts.forEach(post => {
                p2pManager.sendDirect(peerId, {
                    type: 'post',
                    payload: post
                });
            });
        },
        (peerId) => {
            // On Peer Disconnect
            updatePeerList();
            networkVisualizer.removeNode(peerId);
        }
    );
}

// Event Listeners
// Image Upload Logic
attachImageBtn.addEventListener('click', () => imageInput.click());

imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        if (file.size > 100 * 1024) { // 100KB limit for P2P stability
            alert('Image too large! Please choose an image under 100KB.');
            imageInput.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            currentImageBase64 = e.target.result;
            imagePreview.src = currentImageBase64;
            imagePreviewContainer.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
});

removeImageBtn.addEventListener('click', () => {
    currentImageBase64 = null;
    imageInput.value = '';
    imagePreviewContainer.classList.add('hidden');
});

// Profile Logic
function updateProfileUI() {
    currentUserName.textContent = myUsername;
    if (myAvatar) {
        currentUserAvatar.innerHTML = `<img src="${myAvatar}" class="w-full h-full rounded-full object-cover">`;
    } else {
        currentUserAvatar.textContent = getInitials(myUsername);
        currentUserAvatar.innerHTML = getInitials(myUsername); // Reset to text
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

    // Broadcast update
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
    console.log("Join button clicked");
    const username = usernameInput.value.trim();
    if (username) {
        initApp(username);
    }
});

// Auto-login check
// Auto-login check
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM Content Loaded");

    // Initialize Storage
    try {
        if (typeof idb === 'undefined') {
            console.error("IDB library not loaded!");
            alert("Error: Database library failed to load. Please refresh.");
            return;
        }
        storageService = new StorageService();
        console.log("Storage Service Initialized");
    } catch (err) {
        console.error("Failed to init storage:", err);
    }

    // Restore Session
    try {
        if (storageService) {
            const profile = await storageService.getProfile();
            if (profile && profile.username) {
                console.log('Restoring session for:', profile.username);
                initApp(profile.username);
            }
        }
    } catch (err) {
        console.error("Error restoring session:", err);
    }
});

postBtn.addEventListener('click', async () => {
    const content = postContent.value.trim();
    if (!content && !currentImageBase64) return;

    const post = {
        id: generateId(),
        userId: myId,
        username: myUsername,
        content: content,
        image: currentImageBase64,
        avatar: myAvatar, // Include avatar in post
        timestamp: Date.now()
    };

    // Render locally
    posts.push(post);
    renderPost(post);
    storageService.savePost(post); // Persist

    // Broadcast to peers
    p2pManager.broadcast({
        type: 'post',
        payload: post
    });

    // Clear input
    postContent.value = '';
    currentImageBase64 = null;
    imageInput.value = '';
    imagePreviewContainer.classList.add('hidden');
});
