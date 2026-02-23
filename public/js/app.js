class ForumApp {
    constructor() {
        this.currentUser = sessionStorage.getItem('userId') || '';
        this.username = sessionStorage.getItem('username') || '';
        this.topics = [];
        this.myTopics = [];
        this.selectedTopic = null;
        this.messages = [];
        this.unreadCounts = {};
        this.socket = io(window.location.origin);
        this._messageTopicId = null;

        this.init();
    }

    async init() {
        if (!this.currentUser || !this.username) {
            this.renderLogin();
        } else {
            this.setupWebSocket();
            await this.loadTopics();
            this.render();
        }
    }

    async login() {
        const input = document.getElementById('login-input');
        const name = input.value.trim();
        if (!name) return;

        const user = await api.login(name);
        this.currentUser = user.id;
        this.username = user.username;
        sessionStorage.setItem('userId', user.id);
        sessionStorage.setItem('username', user.username);

        this.setupWebSocket();
        await this.loadTopics();
        this.render();
    }

    logout() {
        sessionStorage.removeItem('username');
        sessionStorage.removeItem('userId');
        location.reload();
    }

    renderLogin() {
        const root = document.getElementById('root');
        root.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
          <h1 class="text-2xl font-bold text-indigo-900 mb-2 text-center">Forum Real-time</h1>
          <p class="text-gray-500 text-sm text-center mb-6">Choose a username to enter</p>
          <input
            id="login-input"
            type="text"
            placeholder="Your username..."
            class="w-full px-4 py-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            onkeydown="if(event.key==='Enter') app.login()"
            autofocus
          />
          <button
            onclick="app.login()"
            class="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold transition"
          >
            Enter
          </button>
        </div>
      </div>
    `;
    }

    setupWebSocket() {
        this.socket.on(`notification-${this.currentUser}`, (notification) => {
            const topicId = notification.topicId;
            if (this.selectedTopic?.id !== topicId) {
                this.unreadCounts[topicId] = (this.unreadCounts[topicId] || 0) + 1;
                this.renderSidebar();
            }
        });

        this.socket.on('topic-created', () => {
            this.loadTopics();
        });
    }

    listenToTopicMessages(topicId) {
        if (this._messageTopicId === topicId) return;

        if (this._messageTopicId) {
            this.socket.off(`message-${this._messageTopicId}`);
        }

        this._messageTopicId = topicId;
        this.socket.on(`message-${topicId}`, (message) => {
            const isDuplicate = this.messages.some(m => m.id === message.id);
            if (!isDuplicate) {
                this.messages.push(message);
                this.renderMessages();
            }
        });
    }

    async loadTopics() {
        this.topics = await api.getAllTopics();
        this.myTopics = await api.getUserSubscriptions(this.currentUser);
        this.renderSidebar();
    }

    async createTopic() {
        const title = prompt('Topic title:');
        if (!title) return;

        await api.createTopic(title, this.currentUser);
        await this.loadTopics();
    }

    async subscribe(topicId) {
        await api.subscribe(topicId, this.currentUser);
        await this.loadTopics();
    }

    async unsubscribe(topicId) {
        await api.unsubscribe(topicId, this.currentUser);
        if (this.selectedTopic?.id === topicId) {
            this.selectedTopic = null;
            this.messages = [];
            this._messageTopicId = null;
            this.socket.off(`message-${topicId}`);
            this.renderChat();
        }
        await this.loadTopics();
    }

    async selectTopic(topic) {
        this.selectedTopic = topic;
        this.unreadCounts[topic.id] = 0;
        this.messages = await api.getMessages(topic.id);
        this.listenToTopicMessages(topic.id);
        this.renderChat();
        this.renderSidebar();
    }

    async sendMessage() {
        const input = document.getElementById('message-input');
        const content = input.value.trim();

        if (!content || !this.selectedTopic) return;

        await api.sendMessage(
            this.selectedTopic.id,
            this.currentUser,
            content
        );

        input.value = '';
    }

    render() {
        const root = document.getElementById('root');

        root.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div class="max-w-7xl mx-auto">
          <div class="bg-white rounded-lg shadow-lg p-6 mb-6 flex items-center justify-between">
            <h1 class="text-3xl font-bold text-indigo-900">Forum Real-time</h1>
            <div class="flex items-center gap-3">
              <span class="text-sm text-gray-600">👤 <strong>${this.username}</strong></span>
              <button
                onclick="app.logout()"
                class="px-3 py-1.5 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
              >
                Logout
              </button>
              <button
                onclick="app.createTopic()"
                class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                + New Topic
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-1">
              <div id="sidebar-container" class="bg-white rounded-lg shadow-lg p-6"></div>
            </div>
            <div class="lg:col-span-2">
              <div id="chat-container" class="bg-white rounded-lg shadow-lg p-6 h-[600px] flex flex-col"></div>
            </div>
          </div>
        </div>
      </div>
    `;

        this.renderSidebar();
        this.renderChat();
    }

    renderSidebar() {
        const container = document.getElementById('sidebar-container');
        if (!container) return;

        const availableTopics = this.topics.filter(
            t => !this.myTopics.find(mt => mt.id === t.id)
        );

        container.innerHTML = `
          <h2 class="text-xl font-bold mb-4">My Topics</h2>
          ${this.myTopics.length === 0 ?
            '<p class="text-gray-500 text-sm">You are not subscribed to any topic</p>' :
            this.myTopics.map(t => {
                const unread = this.unreadCounts[t.id] || 0;
                const isSelected = this.selectedTopic?.id === t.id;
                return `
              <div class="p-3 mb-2 rounded-lg border-2 ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'} cursor-pointer">
                <div onclick="app.selectTopic(${JSON.stringify(t).replace(/"/g, '&quot;')})" class="flex items-center justify-between">
                  <div>
                    <h3 class="font-semibold">${t.title}</h3>
                    <p class="text-xs text-gray-500">by ${t.creatorName}</p>
                  </div>
                  ${unread > 0 ? `<span class="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">${unread}</span>` : ''}
                </div>
                <button onclick="app.unsubscribe('${t.id}')" class="text-red-500 text-xs mt-2">
                  Unsubscribe
                </button>
              </div>
            `}).join('')
          }
          ${availableTopics.length > 0 ? `
            <h3 class="text-lg font-semibold mt-6 mb-3">Available Topics</h3>
            ${availableTopics.map(t => `
              <div class="p-3 mb-2 rounded-lg border-2 border-gray-200">
                <h3 class="font-semibold">${t.title}</h3>
                <p class="text-xs text-gray-500">by ${t.creatorName}</p>
                <button onclick="app.subscribe('${t.id}')" class="text-green-500 text-xs mt-2">
                  Subscribe
                </button>
              </div>
            `).join('')}
          ` : ''}
        `;
    }

    renderChat() {
        const container = document.getElementById('chat-container');
        if (!container) return;

        if (this.selectedTopic) {
            container.innerHTML = `
              <h2 class="text-2xl font-bold mb-4 border-b pb-4">${this.selectedTopic.title}</h2>
              <div id="messages-list" class="flex-1 overflow-y-auto mb-4 space-y-3"></div>
              <div class="flex gap-2">
                <input
                  id="message-input"
                  type="text"
                  placeholder="Write a message..."
                  class="flex-1 px-4 py-2 border rounded-lg"
                  onkeydown="if(event.key==='Enter') app.sendMessage()"
                />
                <button onclick="app.sendMessage()" class="px-6 py-2 bg-indigo-600 text-white rounded-lg">
                  Send
                </button>
              </div>
            `;
            this.renderMessages();
        } else {
            container.innerHTML = `
              <div class="flex-1 flex items-center justify-center text-gray-400">
                <p>Select a topic to view messages</p>
              </div>
            `;
        }
    }

    renderMessages() {
        const list = document.getElementById('messages-list');
        if (!list) return;

        list.innerHTML = this.messages.map(m => `
          <div class="p-3 rounded-lg ${m.userId === this.currentUser ? 'bg-indigo-100 ml-auto' : 'bg-gray-100'} max-w-[80%]">
            <div class="font-semibold text-sm">${m.username}</div>
            <p>${m.content}</p>
            <span class="text-xs text-gray-500">${new Date(m.timestamp).toLocaleTimeString()}</span>
          </div>
        `).join('');

        list.scrollTop = list.scrollHeight;
    }
}

const app = new ForumApp();