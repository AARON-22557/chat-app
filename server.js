const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const WebSocket = require('ws');
const logger = require('./logger');
const bot = require('./bot');

function getLocalIp() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
}

const PORT = process.env.PORT || 3000;
const DEFAULT_ROOM_CODE = '000000';

// Global error handlers to prevent crashes and ensure auto-recovery
process.on('uncaughtException', (err) => {
    console.error('⚠️ [CRITICAL] Uncaught exception:', err);
    logger.appendServerLog('ERROR_UNCAUGHT', err.stack || err.toString());
});

process.on('unhandledRejection', (reason) => {
    console.error('⚠️ [CRITICAL] Unhandled rejection:', reason);
    logger.appendServerLog('ERROR_REJECTION', String(reason));
});

// Rooms data structure:
// rooms[code] = { code, creatorId, createdTime, isDefault, users: Set<ws> }
const rooms = {};

function generateId() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// Initialize Default Public Room
function initDefaultRoom() {
    if (!rooms[DEFAULT_ROOM_CODE]) {
        rooms[DEFAULT_ROOM_CODE] = {
            code: DEFAULT_ROOM_CODE,
            creatorId: bot.BOT_ID,
            createdTime: Date.now(),
            isDefault: true,
            users: new Set()
        };
        logger.appendServerLog('SERVER', `Sala predeterminada lista: Código [${DEFAULT_ROOM_CODE}]`);
    }
}

// HTTP Server: Serves static files and API endpoints
const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // CORS headers for APIs
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // 1. API: Server Status
    if (pathname === '/api/status') {
        let totalUsers = 0;
        for (const code in rooms) {
            totalUsers += rooms[code].users.size;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'online',
            uptimeSeconds: Math.floor(process.uptime()),
            timestamp: new Date().toISOString(),
            roomsActive: Object.keys(rooms).length,
            totalUsersConnected: totalUsers,
            defaultRoom: DEFAULT_ROOM_CODE,
            networkIp: getLocalIp(),
            bot: {
                name: bot.BOT_NAME,
                id: bot.BOT_ID,
                status: 'active'
            }
        }, null, 2));
        return;
    }

    // 2. API: Sanctions History
    if (pathname === '/api/logs/sanctions') {
        const history = logger.getSanctionsHistory();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(history, null, 2));
        return;
    }

    // 3. API: Room Chat History (/api/logs/chats/:roomCode)
    if (pathname.startsWith('/api/logs/chats/')) {
        const roomCode = pathname.replace('/api/logs/chats/', '').trim();
        const chatLogs = logger.getRoomChatHistory(roomCode);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(chatLogs, null, 2));
        return;
    }

    // Serve static files
    let filePath = '.' + pathname;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.zip': 'application/zip'
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found - MicroOS</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + error.code, 'utf-8');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// WebSocket Server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    ws.userId = generateId();
    ws.roomCode = null;
    ws.userName = 'Usuario_' + ws.userId.substring(0, 2);
    ws.isBoss = false;
    ws.banUntil = 0;

    logger.appendServerLog('CONNECTION', `Cliente conectado: ID ${ws.userId}`);

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleMessage(ws, data);
        } catch (e) {
            console.error('Invalid JSON message:', e);
        }
    });

    ws.on('close', () => {
        logger.appendServerLog('DISCONNECT', `Cliente desconectado: ${ws.userName} (${ws.userId})`);
        leaveCurrentRoom(ws);
    });
});

function handleMessage(ws, data) {
    const { type, payload } = data;

    // A. CREAR SALA NUEVA
    if (type === 'CREATE_ROOM') {
        leaveCurrentRoom(ws);
        const code = payload.code || Math.floor(100000 + Math.random() * 900000).toString();
        ws.roomCode = code;
        ws.isBoss = true;
        if (payload.userName) ws.userName = payload.userName;

        rooms[code] = {
            code: code,
            creatorId: ws.userId,
            createdTime: Date.now(),
            isDefault: false,
            users: new Set()
        };

        rooms[code].users.add(ws);

        ws.send(JSON.stringify({
            type: 'ROOM_JOINED',
            payload: {
                code,
                userId: ws.userId,
                userName: ws.userName,
                isBoss: true
            }
        }));

        logger.appendServerLog('ROOM_CREATE', `Sala creada [${code}] por ${ws.userName}`);
        broadcastUserList(code);
        broadcastSystemMessage(code, `${ws.userName} (Jefe / Creador) ha creado la sala.`);

        // MicroBot Welcome
        setTimeout(() => {
            const welcome = bot.getBotWelcomeMessage(ws.userName, true, code);
            sendBotMessage(code, welcome);
        }, 600);
    } 
    // B. UNIRSE A SALA EXISTENTE
    else if (type === 'JOIN_ROOM') {
        leaveCurrentRoom(ws);
        const code = String(payload.code).trim();

        // If joining default room and not initialized, init it
        if (code === DEFAULT_ROOM_CODE) {
            initDefaultRoom();
        }

        if (!rooms[code]) {
            ws.send(JSON.stringify({
                type: 'ERROR',
                payload: { message: `El código de invitación "${code}" no existe.` }
            }));
            return;
        }

        ws.roomCode = code;
        ws.isBoss = (rooms[code].creatorId === ws.userId);
        if (payload.userName) ws.userName = payload.userName;

        rooms[code].users.add(ws);

        ws.send(JSON.stringify({
            type: 'ROOM_JOINED',
            payload: {
                code,
                userId: ws.userId,
                userName: ws.userName,
                isBoss: ws.isBoss
            }
        }));

        logger.appendServerLog('ROOM_JOIN', `${ws.userName} se unió a la sala [${code}]`);
        broadcastUserList(code);
        broadcastSystemMessage(code, `${ws.userName} se ha unido al chat.`);

        // MicroBot Welcome
        setTimeout(() => {
            const welcome = bot.getBotWelcomeMessage(ws.userName, ws.isBoss, code);
            sendBotMessage(code, welcome);
        }, 600);
    }
    // C. MENSAJE DE CHAT
    else if (type === 'CHAT_MESSAGE') {
        if (!ws.roomCode || !rooms[ws.roomCode]) return;

        // Check if user is currently banned
        if (ws.banUntil > Date.now()) {
            const remaining = Math.ceil((ws.banUntil - Date.now()) / 1000);
            ws.send(JSON.stringify({
                type: 'SANCTION_ACTIVE',
                payload: { remainingSeconds: remaining }
            }));
            return;
        }

        const msgText = String(payload.text || '').trim();
        if (!msgText) return;

        const packet = {
            type: 'CHAT_MESSAGE',
            payload: {
                id: generateId(),
                senderId: ws.userId,
                senderName: ws.userName,
                isBoss: ws.isBoss,
                isBot: false,
                text: msgText,
                timestamp: new Date().toLocaleTimeString()
            }
        };

        // Broadcast to room
        broadcastToRoom(ws.roomCode, packet);

        // Auto Log Chat Message
        logger.logChatMessage(ws.roomCode, packet.payload);

        // MicroBot Auto-Reply / Command Processing
        const botReply = bot.processMessage(msgText, ws, rooms[ws.roomCode]);
        if (botReply) {
            setTimeout(() => {
                sendBotMessage(ws.roomCode, botReply);
            }, 450);
        }
    }
    // D. APLICAR SANCIÓN (Panel del Jefe)
    else if (type === 'ISSUE_BAN') {
        if (!ws.roomCode || !rooms[ws.roomCode]) return;
        if (!ws.isBoss) {
            ws.send(JSON.stringify({
                type: 'ERROR',
                payload: { message: 'Solo el Jefe/Creador puede aplicar sanciones.' }
            }));
            return;
        }

        const targetUserId = payload.targetUserId;
        const durationSeconds = parseInt(payload.durationSeconds) || 0;
        const reason = payload.reason || 'Comportamiento inadecuado';
        const room = rooms[ws.roomCode];

        let targetClient = null;
        for (let client of room.users) {
            if (client.userId === targetUserId) {
                targetClient = client;
                break;
            }
        }

        if (!targetClient) {
            ws.send(JSON.stringify({
                type: 'ERROR',
                payload: { message: 'Usuario no encontrado en la sala.' }
            }));
            return;
        }

        if (durationSeconds > 0) {
            targetClient.banUntil = Date.now() + (durationSeconds * 1000);
            
            // Notify target client
            targetClient.send(JSON.stringify({
                type: 'SANCTION_APPLIED',
                payload: {
                    durationSeconds,
                    issuedBy: ws.userName,
                    reason: reason
                }
            }));

            broadcastSystemMessage(ws.roomCode, `🚨 SANCIÓN: El Jefe ${ws.userName} ha suspendido a ${targetClient.userName} durante ${durationSeconds} segundos.`);
        } else {
            // Lift ban / Unban
            targetClient.banUntil = 0;
            targetClient.send(JSON.stringify({
                type: 'SANCTION_LIFTED',
                payload: {
                    issuedBy: ws.userName
                }
            }));

            broadcastSystemMessage(ws.roomCode, `✅ El Jefe ${ws.userName} ha retirado la sanción de ${targetClient.userName}.`);
        }

        // Auto Log Sanction to JSON
        logger.logSanction({
            roomCode: ws.roomCode,
            bossId: ws.userId,
            bossName: ws.userName,
            targetId: targetClient.userId,
            targetName: targetClient.userName,
            durationSeconds: durationSeconds,
            reason: reason
        });

        broadcastUserList(ws.roomCode);
    }
}

function leaveCurrentRoom(ws) {
    if (ws.roomCode && rooms[ws.roomCode]) {
        const code = ws.roomCode;
        rooms[code].users.delete(ws);
        broadcastSystemMessage(code, `${ws.userName} ha salido del chat.`);

        // Clean up empty rooms, except default room
        if (rooms[code].users.size === 0 && !rooms[code].isDefault) {
            delete rooms[code];
            logger.appendServerLog('ROOM_CLOSE', `Sala [${code}] eliminada (sin usuarios).`);
        } else {
            broadcastUserList(code);
        }
        ws.roomCode = null;
    }
}

function broadcastToRoom(roomCode, packet) {
    if (!rooms[roomCode]) return;
    const data = JSON.stringify(packet);
    for (let client of rooms[roomCode].users) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    }
}

function broadcastSystemMessage(roomCode, text) {
    broadcastToRoom(roomCode, {
        type: 'SYSTEM_MESSAGE',
        payload: { text, timestamp: new Date().toLocaleTimeString() }
    });
}

function broadcastUserList(roomCode) {
    if (!rooms[roomCode]) return;
    const userList = Array.from(rooms[roomCode].users).map(client => ({
        id: client.userId,
        name: client.userName,
        isBoss: client.isBoss,
        isBot: false,
        isBanned: client.banUntil > Date.now(),
        banRemaining: client.banUntil > Date.now() ? Math.ceil((client.banUntil - Date.now()) / 1000) : 0
    }));

    // MicroBot presence in user list
    userList.unshift({
        id: bot.BOT_ID,
        name: bot.BOT_NAME,
        isBoss: false,
        isBot: true,
        isBanned: false,
        banRemaining: 0
    });

    broadcastToRoom(roomCode, {
        type: 'USER_LIST_UPDATED',
        payload: { users: userList }
    });
}

function sendBotMessage(roomCode, text) {
    if (!rooms[roomCode] || !text) return;
    const packet = {
        type: 'CHAT_MESSAGE',
        payload: {
            id: 'bot_' + Date.now(),
            senderId: bot.BOT_ID,
            senderName: bot.BOT_NAME,
            isBoss: false,
            isBot: true,
            text: text,
            timestamp: new Date().toLocaleTimeString()
        }
    };
    broadcastToRoom(roomCode, packet);
    logger.logChatMessage(roomCode, packet.payload);
}

// -------------------------------------------------------------
// AUTOMATED MAINTENANCE TASKS
// -------------------------------------------------------------

// 1. Check for expired sanctions every second (auto-unban)
setInterval(() => {
    const now = Date.now();
    for (const code in rooms) {
        const room = rooms[code];
        if (!room) continue;

        let changed = false;
        for (const client of room.users) {
            if (client.banUntil > 0 && client.banUntil <= now) {
                client.banUntil = 0;
                client.send(JSON.stringify({
                    type: 'SANCTION_LIFTED',
                    payload: { issuedBy: 'Sistema Automático' }
                }));
                broadcastSystemMessage(code, `⏰ La sanción temporal de ${client.userName} ha expirado. Ya puede volver a escribir.`);
                changed = true;
            }
        }
        if (changed) {
            broadcastUserList(code);
        }
    }
}, 1000);

// 2. Periodic MicroBot tips every 3 minutes for active rooms
setInterval(() => {
    for (const code in rooms) {
        const room = rooms[code];
        if (room && room.users && room.users.size > 0) {
            const tip = bot.getRandomTip();
            sendBotMessage(code, tip);
        }
    }
}, 3 * 60 * 1000);

// 3. Auto-cleanup empty custom rooms every 10 minutes
setInterval(() => {
    for (const code in rooms) {
        if (code === DEFAULT_ROOM_CODE) continue;
        const room = rooms[code];
        if (room && room.users.size === 0) {
            delete rooms[code];
            logger.appendServerLog('CLEANUP', `Sala vacía [${code}] purgada de memoria.`);
        }
    }
}, 10 * 60 * 1000);

// Start server
server.listen(PORT, '0.0.0.0', () => {
    initDefaultRoom();
    const localIp = getLocalIp();
    logger.appendServerLog('SERVER_START', `Servidor iniciado en el puerto ${PORT}`);
    console.log(`=======================================================`);
    console.log(`🤖 MicroOS PC Chat Server con Automatizaciones Activas`);
    console.log(`💻 En tu propio PC:   http://localhost:${PORT}`);
    console.log(`📡 Para tus amigos:   http://${localIp}:${PORT}`);
    console.log(`👑 Sala Predeterminada: ${DEFAULT_ROOM_CODE}`);
    console.log(`🤖 Bot Asistente: ${bot.BOT_NAME}`);
    console.log(`📁 Logs automáticos en: ./logs/`);
    console.log(`=======================================================`);
});
