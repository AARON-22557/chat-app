/**
 * MicroBot - Bot Automático para Salas de MicroOS Chat
 */

const BOT_NAME = '🤖 MicroBot';
const BOT_ID = 'bot_assistant';

const JOKES = [
    "¿Qué le dice un bit a otro? — Nos vemos en el bus. 😂",
    "¿Por qué los programadores prefieren el modo oscuro? — Porque la luz atrae a los bugs. 🐛",
    "Hay 10 tipos de personas en el mundo: las que entienden binario y las que no. 🤖",
    "¿Qué es un terapeuta? — 1024 gigapeutas. 🤓",
    "Un SQL entra a un bar, se acerca a dos mesas y les dice: '¿Puedo unirme a ustedes?' (JOIN). 🍺"
];

const PERIODIC_TIPS = [
    "💡 Tip: Puedes usar los botones de acceso rápido abajo para enviar mensajes y emojis al instante.",
    "🛡️ Recordatorio: El Creador de la sala tiene rol de Jefe y puede sancionar temporalmente a usuarios que incumplan las normas.",
    "🤖 Escribe !ayuda en el chat en cualquier momento para ver todos los comandos automáticos disponibles.",
    "📟 ¿Sabías que MicroOS también cuenta con versión para BBC micro:bit que transmite mensajes por radio?",
    "🎯 Tip: Para invitar a tus amigos, solo dales el código de 6 dígitos que aparece en la parte superior."
];

function getBotWelcomeMessage(userName, isBoss, roomCode) {
    if (isBoss) {
        return `¡Hola ${userName}! 👑 Eres el Jefe y Creador de esta sala (${roomCode}). Haz clic en **'🔗 Compartir Enlace'** arriba para copiar el link y pasárselo a tus amigos. Escribe !ayuda para ver comandos.`;
    } else {
        return `¡Bienvenido ${userName}! 👋 Me alegra tenerte en la sala ${roomCode}. Respeta las reglas y diviértete. Escribe !ayuda para ver qué puedo hacer.`;
    }
}

function getRandomTip() {
    const idx = Math.floor(Math.random() * PERIODIC_TIPS.length);
    return PERIODIC_TIPS[idx];
}

function processMessage(text, user, roomData) {
    const raw = String(text || '').trim();
    const lower = raw.toLowerCase();

    // 1. Check for commands starting with !
    if (raw.startsWith('!')) {
        const parts = raw.split(' ');
        const cmd = parts[0].toLowerCase();

        switch (cmd) {
            case '!ayuda':
            case '!help':
            case '!comandos':
                return [
                    `🤖 **Comandos disponibles de MicroBot:**`,
                    `• !ayuda - Muestra esta lista de ayuda`,
                    `• !reglas - Reglas de convivencia en la sala`,
                    `• !jefe - Muestra quién es el Jefe de la sala`,
                    `• !usuarios - Lista cuántos estamos conectados`,
                    `• !hora - Muestra la hora del servidor`,
                    `• !dado - Lanza un dado aleatorio (1 al 6)`,
                    `• !moneda - Lanza una moneda (Cara o Cruz)`,
                    `• !chiste - Te cuento un chiste geek`,
                    `💡 También puedes preguntarme cosas en lenguaje natural como '¿cómo invito amigos?' o '¿cómo funcionan las sanciones?'`
                ].join('\n');

            case '!reglas':
                return `📜 **Reglas de la Sala:**\n1. Tratar a todos con respeto y sin insultos.\n2. Prohibido hacer spam masivo de mensajes.\n3. Acatar las indicaciones del Jefe de la sala.\n⚠️ El incumplimiento puede acarrear una sanción temporal (10s, 30s o 1m).`;

            case '!jefe':
                const bossClient = Array.from(roomData.users).find(c => c.userId === roomData.creatorId || c.isBoss);
                const bossName = bossClient ? bossClient.userName : 'Desconocido';
                return `👑 El Jefe y Creador de esta sala es: **${bossName}**.`;

            case '!usuarios':
                const count = roomData.users.size;
                const names = Array.from(roomData.users).map(c => (c.isBoss ? '👑 ' : '') + c.userName).join(', ');
                return `👥 Hay **${count}** usuario(s) en la sala:\n${names}`;

            case '!hora':
                const now = new Date();
                return `⏰ La hora actual del servidor es: **${now.toLocaleTimeString()}** (${now.toLocaleDateString()}).`;

            case '!dado':
                const dice = Math.floor(Math.random() * 6) + 1;
                return `🎲 @${user.userName} ha lanzado el dado y ha salido: **${dice}**!`;

            case '!moneda':
                const coin = Math.random() < 0.5 ? '🪙 CARA' : '🪙 CRUZ';
                return `🪙 @${user.userName} lanzó una moneda al aire... ¡Ha salido **${coin}**!`;

            case '!chiste':
                const joke = JOKES[Math.floor(Math.random() * JOKES.length)];
                return joke;

            default:
                return `❓ Comando '${cmd}' no reconocido. Escribe **!ayuda** para ver los comandos válidos.`;
        }
    }

    // 2. Natural language / Frequent questions detection
    if (lower.includes('como invitar') || lower.includes('cómo invitar') || lower.includes('invitar amigos') || lower.includes('como unirse') || lower.includes('cómo unirse')) {
        return `💡 **¿Cómo invitar amigos?** Pásales el código de 6 dígitos que ves arriba (**${roomData.code}**). En la pantalla de inicio solo deben pulsar "Unirse con Código" e introducirlo.`;
    }

    if (lower.includes('que es jefe') || lower.includes('qué es jefe') || lower.includes('para que sirve el jefe') || lower.includes('quien es el jefe')) {
        return `👑 El Jefe es el creador de la sala. Dispone de un panel lateral exclusivo con el que puede suspender temporalmente a usuarios (10s, 30s o 60s) bloqueándoles el envío de mensajes si molestan.`;
    }

    if (lower.includes('sancion') || lower.includes('sanción') || lower.includes('baneo') || lower.includes('bloqueo')) {
        return `🛡️ Las sanciones las aplica el Jefe desde su panel. Durante una sanción, aparece una pantalla de bloqueo roja con un temporizador regresivo hasta que expire el tiempo o te perdone.`;
    }

    if (lower.includes('microbit') || lower.includes('micro:bit')) {
        return `📟 MicroOS incluye el archivo main.ts listo para MakeCode micro:bit. Los micro:bits se conectan a esta sala usando radio frecuencias con el mismo código.`;
    }

    if (lower === 'hola' || lower === 'hola!' || lower === 'buenas' || lower === 'buenos dias' || lower === 'buenas tardes') {
        return `¡Hola @${user.userName}! 👋 ¿En qué te puedo ayudar hoy? Escribe !ayuda para ver opciones.`;
    }

    // No auto-response needed
    return null;
}

module.exports = {
    BOT_NAME,
    BOT_ID,
    getBotWelcomeMessage,
    getRandomTip,
    processMessage
};
