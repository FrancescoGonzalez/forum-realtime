const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const db = require('./database/db');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.post('/api/auth/login', async (req, res) => {
    const { username } = req.body;
    if (!username || !username.trim()) {
        return res.status(400).json({ error: 'Username richiesto' });
    }

    const trimmed = username.trim();
    let user = await db.findUserByUsername(trimmed);

    if (!user) {
        user = {
            id: uuidv4(),
            username: trimmed
        };
        await db.createUser(user);
    }

    res.json(user);
});

app.get('/api/topics', async (req, res) => {
    const topics = await db.getAllTopics();
    res.json(topics);
});

app.post('/api/topics', async (req, res) => {
    const { title, creatorId } = req.body;

    const creator = await db.findUserById(creatorId);
    if (!creator) {
        return res.status(400).json({ error: 'Utente non trovato' });
    }

    const topic = {
        id: uuidv4(),
        title,
        creatorId,
        creatorName: creator.username
    };

    await db.createTopic(topic);
    await db.subscribe(topic.id, creatorId);
    io.emit('topic-created', topic);
    res.json(topic);
});

app.post('/api/topics/:topicId/subscribe', async (req, res) => {
    const { topicId } = req.params;
    const { userId } = req.body;

    await db.subscribe(topicId, userId);
    res.json({ success: true });
});

app.post('/api/topics/:topicId/unsubscribe', async (req, res) => {
    const { topicId } = req.params;
    const { userId } = req.body;

    await db.unsubscribe(topicId, userId);
    res.json({ success: true });
});

app.get('/api/users/:userId/subscriptions', async (req, res) => {
    const { userId } = req.params;
    const topics = await db.getUserSubscriptions(userId);
    res.json(topics);
});

app.get('/api/topics/:topicId/messages', async (req, res) => {
    const { topicId } = req.params;
    const messages = await db.getMessages(topicId);
    res.json(messages);
});

app.post('/api/topics/:topicId/messages', async (req, res) => {
    const { topicId } = req.params;
    const { userId, content } = req.body;

    const user = await db.findUserById(userId);
    if (!user) {
        return res.status(400).json({ error: 'Utente non trovato' });
    }

    const message = {
        id: uuidv4(),
        topicId,
        userId,
        username: user.username,
        content,
        timestamp: Date.now()
    };

    await db.createMessage(message);

    const subscribers = await db.getSubscribers(topicId);
    const topic = await db.getTopic(topicId);

    subscribers.forEach(subscriberId => {
        if (subscriberId !== userId) {
            io.emit(`notification-${subscriberId}`, {
                topicId,
                topicTitle: topic.title,
                message: `Nuovo messaggio da ${user.username}`,
                timestamp: Date.now()
            });
        }
    });

    io.emit(`message-${topicId}`, message);
    res.json(message);
});

io.on('connection', (socket) => {
    console.log('Client connesso:', socket.id);

    socket.on('disconnect', () => {
        console.log('Client disconnesso:', socket.id);
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server in esecuzione su http://0.0.0.0:${PORT}`);
});