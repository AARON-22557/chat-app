let ws = null;
let currentRoomCode = null;
let myUserId = null;
let myUserName = "Usuario";
let isBoss = false;
let banInterval = null;
let banRemainingSeconds = 0;

// UI Elements
const roomModal = document.getElementById('room-modal');
const chatWindow = document.getElementById('chat-window');
const downloadWindow = document.getElementById('download-window');
const infoWindow = document.getElementById('info-window');
const sanctionOverlay = document.getElementById('sanction-overlay');

const userNicknameInput = document.getElementById('user-nickname');
const roomCodeInput = document.getElementById('room-code-input');
const btnJoinRoom = document.getElementById('btn-join-room');
const btnCreateRoom = document.getElementById('btn-create-room');
const modalError = document.getElementById('modal-error');

const roomBadge = document.getElementById('room-badge');
const roleBadge = document.getElementById('role-badge');
const userCount = document.getElementById('user-count');
const userListEl = document.getElementById('user-list');

const bossPanel = document.getElementById('boss-panel');
const banTargetSelect = document.getElementById('ban-target-select');

const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const sanctionTimer = document.getElementById('sanction-timer');

// Connect to WebSocket Server
function initWebSocket() {
    let wsUrl;
    if (window.location.protocol === 'file:') {
        wsUrl = 'ws://localhost:3000';
    } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${window.location.host}`;
    }
    
    try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
            console.log('Connected to MicroOS PC Server');
            if (modalError) modalError.textContent = '';
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleServerPacket(data);
            } catch (e) {
                console.error('Error parsing packet:', e);
            }
        };

        ws.onerror = () => {
            if (modalError && !currentRoomCode) {
                modalError.textContent = '🔄 Conectando con el servidor en segundo plano...';
            }
        };

        ws.onclose = () => {
            console.log('Reintentando conexión automática en 2 segundos...');
            setTimeout(() => {
                if (!ws || ws.readyState === WebSocket.CLOSED) {
                    initWebSocket();
                }
            }, 2000);
        };
    } catch (err) {
        if (modalError) {
            modalError.textContent = '🔄 Esperando al servidor...';
        }
    }
}

function handleServerPacket(packet) {
    const { type, payload } = packet;

    if (type === 'ROOM_JOINED') {
        currentRoomCode = payload.code;
        myUserId = payload.userId;
        myUserName = payload.userName;
        isBoss = payload.isBoss;

        roomBadge.textContent = `Código: ${currentRoomCode}`;
        roleBadge.textContent = isBoss ? '👑 Jefe / Creador' : 'Usuario';
        roleBadge.style.background = isBoss ? '#ffc107' : '#17a2b8';
        roleBadge.style.color = isBoss ? '#111' : '#fff';

        roomModal.classList.add('hidden');
        chatWindow.classList.remove('hidden');

        if (isBoss) {
            bossPanel.classList.remove('hidden');
        } else {
            bossPanel.classList.add('hidden');
        }
    }
    else if (type === 'ERROR') {
        modalError.textContent = payload.message || 'Error de conexión.';
    }
    else if (type === 'CHAT_MESSAGE') {
        appendChatMessage(payload.senderName, payload.text, payload.senderId === myUserId, payload.isBoss, payload.timestamp, payload.isBot);
    }
    else if (type === 'SYSTEM_MESSAGE') {
        appendSystemMessage(payload.text);
    }
    else if (type === 'USER_LIST_UPDATED') {
        renderUserList(payload.users);
    }
    else if (type === 'SANCTION_APPLIED') {
        startSanctionLockdown(payload.durationSeconds, payload.issuedBy);
    }
    else if (type === 'SANCTION_LIFTED') {
        stopSanctionLockdown();
    }
}

// Render User List & Boss Target Select
function renderUserList(users) {
    userCount.textContent = users.length;
    userListEl.innerHTML = '';
    banTargetSelect.innerHTML = '<option value="">-- Seleccionar usuario --</option>';

    users.forEach(u => {
        const li = document.createElement('li');
        if (u.isBanned) li.classList.add('banned');
        if (u.isBot) li.classList.add('bot-user');
        
        let roleTag = u.isBoss ? '👑 ' : '';
        let botTag = u.isBot ? ' 🤖' : '';
        let banTag = u.isBanned ? ` 🚫 (${u.banRemaining}s)` : '';
        li.textContent = `${roleTag}${u.name}${botTag}${banTag}`;
        userListEl.appendChild(li);

        // Only humans can be sanctioned
        if (isBoss && u.id !== myUserId && !u.isBot) {
            const opt = document.createElement('option');
            opt.value = u.id;
            opt.textContent = `${u.name} ${u.isBanned ? '[Baneado]' : ''}`;
            banTargetSelect.appendChild(opt);
        }
    });
}

function formatBotText(str) {
    if (!str) return '';
    const escaped = str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const bolded = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return bolded.replace(/\n/g, '<br>');
}

// Append Messages
function appendChatMessage(sender, text, isMine, senderIsBoss, time, isBot) {
    const div = document.createElement('div');
    if (isBot) {
        div.className = 'chat-msg bot';
    } else {
        div.className = `chat-msg ${isMine ? 'mine' : 'other'}`;
    }
    
    const senderDiv = document.createElement('div');
    senderDiv.className = 'sender';
    if (isBot) {
        senderDiv.innerHTML = `${sender} <span class="bot-badge">BOT</span> • ${time}`;
    } else {
        senderDiv.textContent = `${senderIsBoss ? '👑 ' : ''}${sender} • ${time}`;
    }
    
    const textDiv = document.createElement('div');
    textDiv.className = 'text-content';
    if (isBot) {
        textDiv.innerHTML = formatBotText(text);
    } else {
        textDiv.textContent = text;
    }

    div.appendChild(senderDiv);
    div.appendChild(textDiv);

    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendSystemMessage(text) {
    const div = document.createElement('div');
    div.className = 'system-msg';
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Sanction Lockdown System
function startSanctionLockdown(durationSeconds, issuedBy) {
    banRemainingSeconds = durationSeconds;
    sanctionOverlay.classList.remove('hidden');
    sanctionTimer.textContent = `${banRemainingSeconds}s`;

    if (banInterval) clearInterval(banInterval);

    banInterval = setInterval(() => {
        banRemainingSeconds -= 1;
        if (banRemainingSeconds <= 0) {
            stopSanctionLockdown();
        } else {
            sanctionTimer.textContent = `${banRemainingSeconds}s`;
        }
    }, 1000);
}

function stopSanctionLockdown() {
    if (banInterval) clearInterval(banInterval);
    banRemainingSeconds = 0;
    sanctionOverlay.classList.add('hidden');
}

// Event Listeners
btnJoinRoom.addEventListener('click', () => {
    const name = userNicknameInput.value.trim() || 'Usuario';
    const code = roomCodeInput.value.trim();
    if (!code) {
        modalError.textContent = 'Ingresa un código de invitación de 6 dígitos.';
        return;
    }

    try { localStorage.setItem('microos_user_nickname', name); } catch(e){}

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'JOIN_ROOM',
            payload: { code, userName: name }
        }));
    } else {
        modalError.textContent = '⚠️ No hay conexión con el servidor. Debes ejecutar "node server.js" en la consola.';
    }
});

btnCreateRoom.addEventListener('click', () => {
    const name = userNicknameInput.value.trim() || 'Jefe';
    try { localStorage.setItem('microos_user_nickname', name); } catch(e){}

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'CREATE_ROOM',
            payload: { userName: name }
        }));
    } else {
        modalError.textContent = '⚠️ No hay conexión con el servidor. Debes ejecutar "node server.js" en la consola.';
    }
});

// Enter key support for quick submission
userNicknameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        btnJoinRoom.click();
    }
});

roomCodeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        btnJoinRoom.click();
    }
});

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'CHAT_MESSAGE',
            payload: { text }
        }));
        chatInput.value = '';
    }
});

// Quick Chat Buttons
document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        chatInput.value = btn.textContent;
        chatForm.dispatchEvent(new Event('submit'));
    });
});

// Boss Sanction Buttons
document.querySelectorAll('.sanction-actions button').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetUserId = banTargetSelect.value;
        if (!targetUserId) {
            alert('Por favor selecciona un usuario objetivo.');
            return;
        }

        const durationSeconds = parseInt(btn.dataset.seconds) || 0;
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'ISSUE_BAN',
                payload: {
                    targetUserId,
                    durationSeconds
                }
            }));
        }
    });
});

// OS Window Controls & Desktop Icons
document.getElementById('open-chat-app').addEventListener('click', () => {
    if (!currentRoomCode) {
        roomModal.classList.remove('hidden');
    } else {
        chatWindow.classList.remove('hidden');
    }
});

document.getElementById('open-download-app').addEventListener('click', () => {
    downloadWindow.classList.remove('hidden');
});

document.getElementById('open-info-app').addEventListener('click', () => {
    infoWindow.classList.remove('hidden');
});

document.getElementById('win-close').addEventListener('click', () => {
    chatWindow.classList.add('hidden');
});

document.getElementById('download-close').addEventListener('click', () => {
    downloadWindow.classList.add('hidden');
});

document.getElementById('info-close').addEventListener('click', () => {
    infoWindow.classList.add('hidden');
});

// Clock
setInterval(() => {
    const clock = document.getElementById('clock');
    if (clock) {
        clock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
}, 1000);

// Quick fill default room code
const quickDefaultCode = document.getElementById('quick-default-code');
if (quickDefaultCode) {
    quickDefaultCode.addEventListener('click', () => {
        roomCodeInput.value = '000000';
    });
}

// Copy Direct Invite Link Toast & Action
let detectedNetworkIp = null;
try {
    fetch('/api/status').then(r => r.json()).then(data => {
        if (data && data.networkIp && data.networkIp !== 'localhost') {
            detectedNetworkIp = data.networkIp;
        }
    }).catch(() => {});
} catch(e){}

function showCopyToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'copy-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3000);
}

const btnCopyLink = document.getElementById('btn-copy-link');
if (btnCopyLink) {
    btnCopyLink.addEventListener('click', () => {
        if (!currentRoomCode) return;

        let targetHost = window.location.host;
        if ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && detectedNetworkIp) {
            targetHost = `${detectedNetworkIp}:${window.location.port || '3000'}`;
        }

        const inviteUrl = `${window.location.protocol}//${targetHost}${window.location.pathname}?room=${currentRoomCode}`;
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(inviteUrl).then(() => {
                showCopyToast(`🔗 ¡Enlace copiado! Pásalo a tus amigos: ${inviteUrl}`);
            }).catch(() => {
                prompt('Copia este enlace directo para invitar a tus amigos:', inviteUrl);
            });
        } else {
            prompt('Copia este enlace directo para invitar a tus amigos:', inviteUrl);
        }
    });
}

// Check for Room Invite Parameter in URL (?room=XXXXXX)
function checkUrlInvite() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const inviteRoom = urlParams.get('room');
        const modalTitle = document.getElementById('modal-title');
        const modalDesc = document.getElementById('modal-desc');
        const groupRoomCode = document.getElementById('group-room-code');

        // Restore saved nickname if available
        const savedName = localStorage.getItem('microos_user_nickname');
        if (savedName && userNicknameInput) {
            userNicknameInput.value = savedName;
        }

        if (inviteRoom && roomCodeInput) {
            const cleanCode = inviteRoom.trim();
            roomCodeInput.value = cleanCode;
            if (modalTitle) modalTitle.textContent = `👋 Unirse a la Sala: ${cleanCode}`;
            if (modalDesc) modalDesc.innerHTML = `Has recibido una invitación para la sala <strong>${cleanCode}</strong>.<br>Escribe tu nombre para entrar al chat:`;
            if (groupRoomCode) groupRoomCode.style.display = 'none';
            if (btnJoinRoom) {
                btnJoinRoom.textContent = '🚀 Entrar al Chat';
                btnJoinRoom.style.flex = '1';
            }
            if (btnCreateRoom) {
                btnCreateRoom.style.display = 'none';
            }
        }

        if (userNicknameInput) {
            userNicknameInput.focus();
            userNicknameInput.select();
        }
    } catch (e) {
        console.error('checkUrlInvite error:', e);
    }
}

// Initialize WebSocket & check URL on Load
window.addEventListener('DOMContentLoaded', () => {
    checkUrlInvite();
    initWebSocket();
});
