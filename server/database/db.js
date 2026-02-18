const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'forum_realtime',
    waitForConnections: true,
    connectionLimit: 10
});

class Database {
    async findUserByUsername(username) {
        const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
        return rows[0] || null;
    }

    async findUserById(userId) {
        const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
        if (!rows[0]) return null;
        return { id: rows[0].id, username: rows[0].username };
    }

    async createUser(user) {
        await pool.execute(
            'INSERT INTO users (id, username) VALUES (?, ?)',
            [user.id, user.username]
        );
        return user;
    }

    async getAllTopics() {
        const [rows] = await pool.execute(
            `SELECT t.id, t.title, t.creator_id AS creatorId, u.username AS creatorName
             FROM topics t JOIN users u ON t.creator_id = u.id`
        );
        return rows;
    }

    async getTopic(topicId) {
        const [rows] = await pool.execute(
            `SELECT t.id, t.title, t.creator_id AS creatorId, u.username AS creatorName
             FROM topics t JOIN users u ON t.creator_id = u.id
             WHERE t.id = ?`,
            [topicId]
        );
        return rows[0] || null;
    }

    async createTopic(topic) {
        await pool.execute(
            'INSERT INTO topics (id, title, creator_id) VALUES (?, ?, ?)',
            [topic.id, topic.title, topic.creatorId]
        );
        return topic;
    }

    async subscribe(topicId, userId) {
        await pool.execute(
            'INSERT IGNORE INTO subscriptions (topic_id, user_id) VALUES (?, ?)',
            [topicId, userId]
        );
        return true;
    }

    async unsubscribe(topicId, userId) {
        await pool.execute(
            'DELETE FROM subscriptions WHERE topic_id = ? AND user_id = ?',
            [topicId, userId]
        );
        return true;
    }

    async getSubscribers(topicId) {
        const [rows] = await pool.execute(
            'SELECT user_id FROM subscriptions WHERE topic_id = ?',
            [topicId]
        );
        return rows.map(r => r.user_id);
    }

    async getUserSubscriptions(userId) {
        const [rows] = await pool.execute(
            `SELECT t.id, t.title, t.creator_id AS creatorId, u.username AS creatorName
             FROM subscriptions s
             JOIN topics t ON s.topic_id = t.id
             JOIN users u ON t.creator_id = u.id
             WHERE s.user_id = ?`,
            [userId]
        );
        return rows;
    }

    async getMessages(topicId) {
        const [rows] = await pool.execute(
            `SELECT m.id, m.topic_id AS topicId, m.user_id AS userId, u.username, m.content, m.timestamp
             FROM messages m JOIN users u ON m.user_id = u.id
             WHERE m.topic_id = ?
             ORDER BY m.timestamp ASC`,
            [topicId]
        );
        return rows;
    }

    async createMessage(message) {
        await pool.execute(
            'INSERT INTO messages (id, topic_id, user_id, content, timestamp) VALUES (?, ?, ?, ?, ?)',
            [message.id, message.topicId, message.userId, message.content, message.timestamp]
        );
        return message;
    }
}

const db = new Database();
module.exports = db;