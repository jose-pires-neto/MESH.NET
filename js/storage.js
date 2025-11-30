class StorageService {
    constructor() {
        this.dbPromise = idb.openDB('mesh-social-db', 1, {
            upgrade(db) {
                // Store for posts
                if (!db.objectStoreNames.contains('posts')) {
                    const postsStore = db.createObjectStore('posts', { keyPath: 'id' });
                    postsStore.createIndex('timestamp', 'timestamp');
                }
                // Store for user profile/settings
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings');
                }
            },
        });
    }

    async savePost(post) {
        const db = await this.dbPromise;
        await db.put('posts', post);
    }

    async getPosts() {
        const db = await this.dbPromise;
        return await db.getAllFromIndex('posts', 'timestamp');
    }

    async saveProfile(username, id, avatar = null, bio = null) {
        const db = await this.dbPromise;
        await db.put('settings', username, 'username');
        await db.put('settings', id, 'userId');
        if (avatar) await db.put('settings', avatar, 'avatar');
        if (bio) await db.put('settings', bio, 'bio');
    }

    async getProfile() {
        const db = await this.dbPromise;
        const username = await db.get('settings', 'username');
        const userId = await db.get('settings', 'userId');
        const avatar = await db.get('settings', 'avatar');
        const bio = await db.get('settings', 'bio');
        if (username && userId) {
            return { username, userId, avatar, bio };
        }
        return null;
    }
}
