console.log("🚀 Initializing MIDNIGHT VAULT ADULT BOT (Developed by Hidden Man)...");

const fs = require('fs');
const path = require('path');
const { spawn, exec, execSync } = require('child_process');
const cryptoModule = require('crypto');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Midnight Vault Bot is Alive and Running! 🔥');
});

const NGROK_AUTHTOKEN = "3LMaagLM4y8yOhx1qDhQqfHE8Bf_3RdGFVR9J4aBS76sAFJWb";
const NGROK_DOMAIN = "shrouded-curvature-scrubber.ngrok-free.dev";

try {
    execSync('which aria2c || (apt-get update && apt-get install -y aria2)', { stdio: 'ignore' });
    console.log("⚡ Aria2 Fast Downloader is Ready!");
} catch (e) {
    console.log("⚠️ Aria2 check skipped.");
}

if (!global.crypto) {
    global.crypto = cryptoModule.webcrypto || cryptoModule;
}

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');
const axios = require('axios');

const PHONE_NUMBER = process.env.PHONE_NUMBER || "94740196225";
const TARGET_GROUP_JID = process.env.TARGET_GROUP_JID || "120363412473526442@g.us";

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15'
];

let sock = null;
let reconnecting = false;

const downloadQueue = [];
let isProcessingQueue = false;

process.on('uncaughtException', e => console.error('❌ EXCEPTION:', e.message || e));
process.on('unhandledRejection', e => console.error('❌ REJECTION:', e.message || e));

const cleanStorage = () => {
    try {
        fs.readdirSync('./').forEach(f => {
            if (/\.(mp4|mkv|avi|tmp|part|download)$/i.test(f) || f.startsWith('temp_')) {
                try {
                    fs.rmSync(path.join('./', f), { recursive: true, force: true });
                } catch (e) {}
            }
        });
    } catch (e) {}
};

const downloadFileFast = async (u, d) => {
    console.log("\n🚀 [ANTI-LIMIT DOWNLOAD STARTED] Target URL:", u);

    return new Promise((res, rej) => {
        const dir = path.dirname(d);
        const file = path.basename(d);
        const randomUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

        const args = [
            '-x', '16', '-s', '16', '-j', '16',
            '--max-connection-per-server=16',
            '--split=16', '--min-split-size=1M',
            `--user-agent=${randomUA}`,
            '--header=Referer: https://www.xnxx.com/',
            '--check-certificate=false',
            '-d', dir, '-o', file, u
        ];

        const child = spawn('aria2c', args);

        child.stdout.on('data', (data) => process.stdout.write("⚡ " + data.toString()));
        child.on('close', (code) => {
            if (code === 0 && fs.existsSync(d) && fs.statSync(d).size > 1000000) {
                res(true);
            } else {
                rej(new Error("Download Failed"));
            }
        });
    });
};

app.post('/api/bot/send-video', async (req, res) => {
    try {
        const { whatsappJid, userPhone, movieTitle, videoDuration, selectedQuality, downloadLink } = req.body;

        if (!downloadLink) {
            return res.status(400).json({ status: false, error: "Download link missing" });
        }

        downloadQueue.push({
            targetJid: whatsappJid || TARGET_GROUP_JID,
            userPhone: userPhone ? userPhone.replace(/[^0-9]/g, '') : "Anonymous",
            movieTitle: movieTitle || "Adult Video",
            videoDuration: videoDuration || "N/A",
            selectedQuality: selectedQuality || "HD",
            downloadLink: downloadLink
        });

        res.json({ status: true, message: "Video added to queue successfully!" });
        processQueue();
    } catch (err) {
        res.status(500).json({ status: false, error: err.message });
    }
});

async function processQueue() {
    if (isProcessingQueue || downloadQueue.length === 0 || !sock) return;
    isProcessingQueue = true;

    const task = downloadQueue.shift();
    const hasPhone = task.userPhone !== "Anonymous" && task.userPhone.length > 5;
    const userJid = hasPhone ? `${task.userPhone}@s.whatsapp.net` : null;

    try {
        await sock.sendMessage(task.targetJid, { 
            text: `⏳ ඔබ ඉල්ලූ *"${task.movieTitle}"* (${task.selectedQuality}) වීඩියෝ එක පෝලිමට එකතු විය! ඩවුන්ලෝඩ් වෙමින් පවතී... 🔥`,
            mentions: userJid ? [userJid] : []
        });

        cleanStorage();
        const tFolder = path.join(__dirname, "temp_" + Date.now());
        if (!fs.existsSync(tFolder)) fs.mkdirSync(tFolder, { recursive: true });
        const cleanFileName = task.movieTitle.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_') + `_${task.selectedQuality}.mp4`;
        const tPath = path.join(tFolder, cleanFileName);

        await downloadFileFast(task.downloadLink, tPath);

        const actualSizeMB = fs.statSync(tPath).size / (1024 * 1024);
        if (actualSizeMB > 2000) {
            await sock.sendMessage(task.targetJid, { text: `❌ ෆයිල් සයිස් එක 2GB ඉක්මවන නිසා යැවිය නොහැක.` });
            throw new Error("File too large");
        }

        const docMsg = `🔞 *MIDNIGHT VAULT - VIDEO READY* 🚀\n\n` +
                       (hasPhone ? `👤 *Requested by:* @${task.userPhone}\n` : ``) +
                       `📌 *Title:* *${task.movieTitle}*\n` +
                       `⏱️ *Duration:* ${task.videoDuration}\n` +
                       `🎚️ *Quality:* ${task.selectedQuality}\n` +
                       `📦 *File Size:* ${actualSizeMB.toFixed(2)} MB\n\n` +
                       `━━━━━━━━━━━━━━━━━━\n` +
                       `🔥 *MIDNIGHT VAULT HUB*\n` +
                       `👤 *Developed by Hidden Man*`;

        await sock.sendMessage(task.targetJid, { 
            document: { url: tPath }, 
            fileName: cleanFileName, 
            mimetype: 'video/mp4', 
            caption: docMsg,
            mentions: userJid ? [userJid] : []
        });

    } catch (err) {
        console.error("❌ Queue Task Error:", err.message);
    } finally {
        cleanStorage();
    }

    setTimeout(() => {
        isProcessingQueue = false;
        processQueue();
    }, 10000);
}

// ================= WHATSAPP BOT START (FIXED PAIRING CODE) =================
async function startBot() {
    cleanStorage();

    try {
        const sessionFolder = './session';
        if (!fs.existsSync(sessionFolder)) {
            fs.mkdirSync(sessionFolder, { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);

        sock = makeWASocket({
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            auth: state,
            browser: Browsers.macOS('Chrome') // Mac Chrome බ්‍රව්සර් එකක් ලෙස රෙජිස්ටර් වීම
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async u => {
            const { connection: c, lastDisconnect: l } = u;
            if (c) console.log('🔄 [BOT STATUS]:', c);

            if (c === 'open') {
                reconnecting = false;
                console.log('\n✅ MIDNIGHT VAULT BOT IS ONLINE (Developed by Hidden Man)!\n');
            }

            if (c === 'close') {
                const st = l?.error?.output?.statusCode;
                console.log(`⚠️ Connection closed with status: ${st}`);
                if (!reconnecting) {
                    reconnecting = true;
                    setTimeout(() => {
                        reconnecting = false;
                        startBot();
                    }, 5000);
                }
            }
        });

        // නිවැරදිව කනෙක්ෂන් එක ලෝඩ් වුණාට පසු Pairing Code එක ඉල්ලීම
        if (!sock.authState.creds.registered) {
            setTimeout(async () => {
                const phoneNumber = PHONE_NUMBER.replace(/[^0-9]/g, '');
                console.log(`\n⏳ Requesting Pairing Code for: ${phoneNumber}...\n`);
                try {
                    let code = await sock.requestPairingCode(phoneNumber);
                    code = code?.match(/.{1,4}/g)?.join("-") || code;
                    console.log(`\n========================================`);
                    console.log(`🔗 YOUR REAL WHATSAPP PAIRING CODE: [ ${code} ]`);
                    console.log(`========================================\n`);
                } catch (err) {
                    console.error("❌ Failed to get pairing code:", err);
                }
            }, 6000); // තත්පර 6ක් කල් දී කනෙක්ෂන් එක ස්ටේබල් වෙන්න හැරීම
        }

        sock.ev.on('messages.upsert', async d => {
            try {
                const msg = d.messages[0];
                if (!msg || !msg.message || msg.key.fromMe) return;

                const from = msg.key.remoteJid;
                const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
                if (!text) return;

                if (text.trim().toLowerCase() === '.jid') {
                    return sock.sendMessage(from, { text: `📌 *Group JID:* \`${from}\`` });
                }
            } catch (e) {}
        });
    } catch (e) {
        console.error("❌ Bot Fatal Error:", e);
    }
}

app.listen(PORT, async () => {
    console.log(`🚀 Bot Webhook Server running on port ${PORT}`);
    const setupCmd = `npx ngrok config add-authtoken ${NGROK_AUTHTOKEN} && npx ngrok http ${PORT} --url=${NGROK_DOMAIN}`;
    exec(setupCmd);
    console.log(`🌐 [URL READY]: https://${NGROK_DOMAIN}/api/bot/send-video`);
});

setInterval(() => {}, 3600000);
startBot();
