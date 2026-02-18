const API_BASE = `${window.location.origin}/api`;

const api = {
    login: async (username) => {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        return res.json();
    },

    getAllTopics: async () => {
        const res = await fetch(`${API_BASE}/topics`);
        return res.json();
    },

    createTopic: async (title, creatorId) => {
        const res = await fetch(`${API_BASE}/topics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, creatorId })
        });
        return res.json();
    },

    subscribe: async (topicId, userId) => {
        const res = await fetch(`${API_BASE}/topics/${topicId}/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });
        return res.json();
    },

    unsubscribe: async (topicId, userId) => {
        const res = await fetch(`${API_BASE}/topics/${topicId}/unsubscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        });
        return res.json();
    },

    getUserSubscriptions: async (userId) => {
        const res = await fetch(`${API_BASE}/users/${userId}/subscriptions`);
        return res.json();
    },

    getMessages: async (topicId) => {
        const res = await fetch(`${API_BASE}/topics/${topicId}/messages`);
        return res.json();
    },

    sendMessage: async (topicId, userId, content) => {
        const res = await fetch(`${API_BASE}/topics/${topicId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, content })
        });
        return res.json();
    }
};