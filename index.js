console.log("🚀 Initializing CINENOVA WA MOVIE BOT (Created by IMALSHA NETHSARA)...");

const fs = require('fs');
const path = require('path');
const { spawn, exec, execSync } = require('child_process');
const cryptoModule = require('crypto');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors()); // Enable CORS for all domains
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ================= ROOT ROUTE FOR UPTIMEROBOT =================
app.get('/', (req, res) => {
    res.send('Bot is Alive and Running!');
});

// ================= NGROK CONFIGURATION =================
const NGROK_AUTHTOKEN = "3LMaagLM4y8yOhx1qDhQqfHE8Bf_3RdGFVR9J4aBS76sAFJWb";
const NGROK_DOMAIN = "shrouded-curvature-scrubber.ngrok-free.dev";

// Auto-install aria2 package if missing
try {
    execSync('which aria2c || (apt-get update && apt-get install -y aria2)', { stdio: 'ignore' });
    console.log("⚡ Aria2 Fast Downloader is Ready!");
} catch (e) {
    console.log("⚠️ Aria2 check skipped.");
}

if (!global.crypto) {
    global.crypto = cryptoModule.webcrypto || cryptoModule;
}

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const axios = require('axios');

// Configurations
const PHONE_NUMBER = process.env.PHONE_NUMBER || "94740196225";
const TARGET_GROUP_JID = process.env.TARGET_GROUP_JID || "120363433233156274@g.us";

// Array of User-Agents to rotate and bypass simple IP/UA restrictions
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0'
];

let sock = null;
let pairingRequested = false;
let reconnecting = false;

// Queue System Variables
const downloadQueue = [];
let isProcessingQueue = false;

process.on('uncaughtException', e => console.error('❌ EXCEPTION:', e.message || e));
process.on('unhandledRejection', e => console.error('❌ REJECTION:', e.message || e));

// Advanced Clean Storage Method
const cleanStorage = () => {
    try {
        fs.readdirSync('./').forEach(f => {
            if (/\.(mp4|mkv|avi|tmp|part|download)$/i.test(f) || f.startsWith('temp_')) {
                try {
                    fs.rmSync(path.join('./', f), { recursive: true, force: true });
                } catch (e) {}
            }
        });
        const files = fs.readdirSync(__dirname);
        files.forEach(file => {
            if (file.startsWith('temp_')) {
                try {
                    fs.rmSync(path.join(__dirname, file), { recursive: true, force: true });
                } catch (e) {}
            }
        });
    } catch (e) {}
};

const clearSessionFolder = () => {
    try {
        if (fs.existsSync('./session')) {
            fs.rmSync('./session', { recursive: true, force: true });
            console.log("🧹 Previous session cleared!");
        }
    } catch (e) {}
};

// ⚡ Anti-Limit Fast Download Function with Random User-Agent Rotation
const downloadFileFast = async (u, d) => {
    console.log("\n🚀 [ANTI-LIMIT DOWNLOAD STARTED] Target URL:", u);

    return new Promise((res, rej) => {
        const dir = path.dirname(d);
        const file = path.basename(d);

        // Pick a random user agent to prevent tracking/throttling
        const randomUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

        const args = [
            '-x', '16',
            '-s', '16',
            '-j', '16',
            '--max-connection-per-server=16',
            '--split=16',
            '--min-split-size=1M',
            `--user-agent=${randomUA}`,
            '--header=Referer: https://pixeldrain.com/',
            '--check-certificate=false',
            '--summary-interval=1',
            '-d', dir,
            '-o', file,
            u
        ];

        const child = spawn('aria2c', args);

        child.stdout.on('data', (data) => {
            process.stdout.write("⚡ [PROGRESS] " + data.toString());
        });

        child.stderr.on('data', (data) => {
            process.stderr.write("⚠️ [ARIA2 LOG] " + data.toString());
        });

        child.on('close', (code) => {
            if (code === 0 && fs.existsSync(d) && fs.statSync(d).size > 1000000) {
                const szMB = (fs.statSync(d).size / (1024 * 1024)).toFixed(2);
                console.log(`\n✅ [DOWNLOAD COMPLETE] File Size: ${szMB} MB\n`);
                res(true);
            } else {
                console.error(`\n❌ [ARIA2 ERROR] Code: ${code}`);
                rej(new Error("Download Failed"));
            }
        });
    });
};

// ================= WEBHOOK ENDPOINT FOR CINENOVA FRONTEND =================
app.post('/api/bot/send-movie', async (req, res) => {
    try {
        const { whatsappJid, userPhone, movieTitle, fileSize, downloadLink } = req.body;

        if (!downloadLink) {
            return res.status(400).json({ status: false, error: "Download link missing" });
        }

        console.log(`📥 [WEBHOOK] Received request for: ${movieTitle} from user: ${userPhone} targeting JID: ${whatsappJid}`);

        downloadQueue.push({
            targetJid: whatsappJid || TARGET_GROUP_JID,
            userPhone: userPhone || "94740196225",
            movieTitle: movieTitle || "Selected Movie",
            fileSize: fileSize || "N/A",
            downloadLink: downloadLink
        });

        res.json({ status: true, message: "Movie added to bot queue successfully with web details!" });
        processQueue();
    } catch (err) {
        res.status(500).json({ status: false, error: err.message });
    }
});

// ================= QUEUE PROCESSOR WITH 10s DELAY =================
async function processQueue() {
    if (isProcessingQueue || downloadQueue.length === 0 || !sock) return;
    isProcessingQueue = true;

    const task = downloadQueue.shift();
    const cleanPhone = task.userPhone.replace(/[^0-9]/g, '');
    const userJid = `${cleanPhone}@s.whatsapp.net`;

    try {
        console.log(`🚀 Processing queue item: ${task.movieTitle} for user: ${cleanPhone}`);
        
        await sock.sendMessage(task.targetJid, { 
            text: `⏳ @${cleanPhone}, ඔබ ඉල්ලූ *"${task.movieTitle}"* මූවි එක පෝලිමට (Queue) එකතු විය!\n\nසර්වර් එකෙන් ඩවුන්ලෝඩ් වීම ඉක්මනින් ආරම්භ වේ...`,
            mentions: [userJid]
        });

        cleanStorage();
        const tFolder = path.join(__dirname, "temp_" + Date.now());
        if (!fs.existsSync(tFolder)) fs.mkdirSync(tFolder, { recursive: true });
        const cleanFileName = task.movieTitle.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_') + ".mp4";
        const tPath = path.join(tFolder, cleanFileName);

        await downloadFileFast(task.downloadLink, tPath);

        const actualSizeMB = fs.statSync(tPath).size / (1024 * 1024);
        console.log(`📦 [ACTUAL DOWNLOADED FILE SIZE]: ${actualSizeMB.toFixed(2)} MB`);

        if (actualSizeMB > 2000) {
            console.log("❌ File exceeds WhatsApp 2GB limit.");
            await sock.sendMessage(task.targetJid, { 
                text: `❌ @${cleanPhone}, මෙම Movie එකෙහි ෆයිල් සයිස් එක ( ${actualSizeMB.toFixed(2)} MB ) 2GB ඉක්මවන නිසා WhatsApp එකට යැවිය නොහැක.`,
                mentions: [userJid]
            });
            throw new Error("File too large");
        }

        console.log("⬆️ Uploading document to WhatsApp...");
        
        const docMsg = `🎬 *MOVIE READY!* 🍿\n\n` +
                       `👤 *Requested by:* @${cleanPhone}\n` +
                       `📌 *Movie:* *${task.movieTitle}*\n\n` +
                       `🌐 *Source* • CINENOVA PORTAL\n` +
                       `📦 *Size* • ${actualSizeMB.toFixed(2)} MB\n\n` +
                       `✅ Enjoy the movie!\n\n` +
                       `━━━━━━━━━━━━━━━━━━\n\n` +
                       `🤖 *CINENOVA WA MOVIE BOT*\n` +
                       `👤 *Created by IMALSHA NETHSARA*`;

        await sock.sendMessage(task.targetJid, { 
            document: { url: tPath }, 
            fileName: cleanFileName, 
            mimetype: 'video/mp4', 
            caption: docMsg,
            mentions: [userJid]
        });

        console.log("✅ [SUCCESS] Document Upload Complete!");

    } catch (err) {
        console.error("❌ Queue Task Error:", err.message || err);
    } finally {
        cleanStorage();
    }

    console.log("⏱️ Waiting 10 seconds before processing the next movie in queue...");
    setTimeout(() => {
        isProcessingQueue = false;
        processQueue();
    }, 10000);
}

// ================= WHATSAPP BOT START =================
async function startBot(isFreshStart = false) {
    cleanStorage();
    if (isFreshStart) clearSessionFolder();

    try {
        const sessionFolder = './session';
        const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);

        sock = makeWASocket({
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            auth: state,
            browser: ['Ubuntu', 'Chrome', '20.0.0.4'],
            markOnlineOnConnect: false,
            mediaUploadTimeoutMs: 1200000,
            connectTimeoutMs: 1200000,
            keepAliveIntervalMs: 30000
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async u => {
            const { connection: c, lastDisconnect: l } = u;
            if (c) console.log('🔄 [BOT STATUS]:', c);

            if ((c === 'connecting' || !c) && !sock.authState.creds.registered && !pairingRequested) {
                pairingRequested = true;
                console.log('⏳ Requesting Fresh Pairing Code...');
                setTimeout(async () => {
                    try {
                        const n = PHONE_NUMBER.replace(/[^0-9]/g, '');
                        if (n) {
                            let code = await sock.requestPairingCode(n);
                            if (code) console.log('\n🔐 CODE: ' + (code.match(/.{1,4}/g)?.join('-') || code) + '\n');
                        }
                    } catch (e) {
                        console.error('❌ Pairing Code Error:', e.message || e);
                        pairingRequested = false;
                    }
                }, 3000);
            }

            if (c === 'open') {
                reconnecting = false;
                console.log('\n✅ CINENOVA WA MOVIE BOT IS ONLINE (Created by IMALSHA NETHSARA)!\n');
            }

            if (c === 'close') {
                const st = l?.error?.output?.statusCode;
                if (st === DisconnectReason.loggedOut) {
                    clearSessionFolder();
                }
                if (!reconnecting) {
                    reconnecting = true;
                    setTimeout(() => {
                        pairingRequested = false;
                        reconnecting = false;
                        startBot(false);
                    }, 5000);
                }
            }
        });

        sock.ev.on('messages.upsert', async d => {
            try {
                const msg = d.messages[0];
                if (!msg || !msg.message || msg.key.fromMe) return;

                const from = msg.key.remoteJid;
                const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
                if (!text) return;

                const cmd = text.trim();

                if (cmd.toLowerCase() === '.jid') {
                    return sock.sendMessage(from, { text: "📌 *මෙම Chat / Group එකෙහි JID අංකය:*\n\n`" + from + "`\n\n🤖 *CINENOVA WA MOVIE BOT*\n👤 *Created by IMALSHA NETHSARA*" });
                }
            } catch (e) {
                console.error("❌ Message Processing Error:", e);
            }
        });
    } catch (e) {
        console.error("❌ Bot Fatal Error:", e);
    }
}

// Start Express Server & Ngrok Static Tunnel
app.listen(PORT, async () => {
    console.log(`🚀 Bot Webhook Server is running on port ${PORT}`);
    console.log(`🌐 [NGROK]: Configuring Authtoken & Starting Static Tunnel...`);

    const setupCmd = `npx ngrok config add-authtoken ${NGROK_AUTHTOKEN} && npx ngrok http ${PORT} --url=${NGROK_DOMAIN}`;
    
    const ngrokProcess = exec(setupCmd);

    ngrokProcess.stdout.on('data', (data) => {
        process.stdout.write(data);
    });

    ngrokProcess.stderr.on('data', (data) => {
        process.stdout.write(data);
    });

    console.log(`\n========================================`);
    console.log(`🌐 [PERMANENT NGROK WEBHOOK URL READY]:`);
    console.log(`url: https://${NGROK_DOMAIN}/api/bot/send-movie`);
    console.log(`========================================\n`);
});

setInterval(() => {}, 3600000);
startBot(true);
