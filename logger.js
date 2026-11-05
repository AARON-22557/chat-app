const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(__dirname, 'logs');
const CHATS_DIR = path.join(LOGS_DIR, 'chats');
const SANCTIONS_FILE = path.join(LOGS_DIR, 'sanciones.json');
const SERVER_LOG_FILE = path.join(LOGS_DIR, 'servidor.log');

// Ensure log directories exist
function ensureDirs() {
    if (!fs.existsSync(LOGS_DIR)) {
        fs.mkdirSync(LOGS_DIR, { recursive: true });
    }
    if (!fs.existsSync(CHATS_DIR)) {
        fs.mkdirSync(CHATS_DIR, { recursive: true });
    }
    if (!fs.existsSync(SANCTIONS_FILE)) {
        fs.writeFileSync(SANCTIONS_FILE, JSON.stringify([], null, 2), 'utf8');
    }
}

ensureDirs();

function appendServerLog(type, message) {
    try {
        const timestamp = new Date().toISOString();
        const logLine = `[${timestamp}] [${type}] ${message}\n`;
        fs.appendFile(SERVER_LOG_FILE, logLine, 'utf8', (err) => {
            if (err) console.error('Error writing to servidor.log:', err);
        });
    } catch (e) {
        console.error('appendServerLog error:', e);
    }
}

function logChatMessage(roomCode, msgData) {
    try {
        const dateStr = new Date().toISOString().slice(0, 10);
        const fileName = `chat_sala_${roomCode}_${dateStr}.json`;
        const filePath = path.join(CHATS_DIR, fileName);

        let messages = [];
        if (fs.existsSync(filePath)) {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                messages = JSON.parse(content || '[]');
            } catch (err) {
                messages = [];
            }
        }

        messages.push({
            id: msgData.id || Date.now().toString(),
            timestamp: msgData.timestamp || new Date().toLocaleTimeString(),
            isoDate: new Date().toISOString(),
            senderId: msgData.senderId,
            senderName: msgData.senderName,
            isBoss: !!msgData.isBoss,
            isBot: !!msgData.isBot,
            text: msgData.text
        });

        fs.writeFileSync(filePath, JSON.stringify(messages, null, 2), 'utf8');
    } catch (e) {
        console.error('logChatMessage error:', e);
    }
}

function logSanction(sanctionData) {
    try {
        let sanctions = [];
        if (fs.existsSync(SANCTIONS_FILE)) {
            try {
                const content = fs.readFileSync(SANCTIONS_FILE, 'utf8');
                sanctions = JSON.parse(content || '[]');
            } catch (err) {
                sanctions = [];
            }
        }

        const entry = {
            id: Date.now().toString(),
            isoDate: new Date().toISOString(),
            timestamp: new Date().toLocaleTimeString(),
            roomCode: sanctionData.roomCode,
            bossId: sanctionData.bossId,
            bossName: sanctionData.bossName,
            targetId: sanctionData.targetId,
            targetName: sanctionData.targetName,
            durationSeconds: sanctionData.durationSeconds,
            reason: sanctionData.reason || 'Comportamiento inadecuado',
            action: sanctionData.durationSeconds > 0 ? 'BAN_APPLIED' : 'BAN_LIFTED'
        };

        sanctions.push(entry);

        fs.writeFileSync(SANCTIONS_FILE, JSON.stringify(sanctions, null, 2), 'utf8');

        appendServerLog('SANCTION', `Room ${sanctionData.roomCode}: ${entry.bossName} -> ${entry.targetName} (${entry.durationSeconds}s)`);
    } catch (e) {
        console.error('logSanction error:', e);
    }
}

function getSanctionsHistory() {
    try {
        if (!fs.existsSync(SANCTIONS_FILE)) return [];
        return JSON.parse(fs.readFileSync(SANCTIONS_FILE, 'utf8') || '[]');
    } catch (e) {
        return [];
    }
}

function getRoomChatHistory(roomCode) {
    try {
        const dateStr = new Date().toISOString().slice(0, 10);
        const fileName = `chat_sala_${roomCode}_${dateStr}.json`;
        const filePath = path.join(CHATS_DIR, fileName);
        if (!fs.existsSync(filePath)) return [];
        return JSON.parse(fs.readFileSync(filePath, 'utf8') || '[]');
    } catch (e) {
        return [];
    }
}

module.exports = {
    appendServerLog,
    logChatMessage,
    logSanction,
    getSanctionsHistory,
    getRoomChatHistory,
    CHATS_DIR,
    SANCTIONS_FILE
};
