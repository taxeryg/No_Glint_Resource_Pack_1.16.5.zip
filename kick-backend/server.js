const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const http = require("http");
const { Server: SocketIOServer } = require("socket.io");
const dotenv = require("dotenv");
const { createClient } = require("@retconned/kick-js");

dotenv.config();

const app = express();
const PORT = 3001;
const CLIENT_URL = "https://karahanbest.netlify.app";

app.use(cors({ origin: CLIENT_URL, methods: ["GET", "POST"] }));
app.use(bodyParser.json());

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: CLIENT_URL, methods: ["GET", "POST"] },
});

// OYUN DEĞİŞKENLERİ
let activePlayers = [];
let currentSelectedPlayerId = null;

function getRandomColor() {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) color += letters[Math.floor(Math.random() * 16)];
  return color;
}

function registerPlayer(username) {
  if (activePlayers.some((p) => p.username === username)) return;

  const newPlayer = {
    id: Date.now() + Math.random(),
    username,
    score: 0,
    color: getRandomColor(),
    joinOrder: activePlayers.length + 1,
    lives: 1,
    hasUsedThisTurn: false,
  };

  activePlayers.push(newPlayer);
  console.log(`[${newPlayer.joinOrder}] ${username} katıldı (Can: ${newPlayer.lives})`);
  io.emit("playerJoined", newPlayer);
}

// KICK CHAT BAĞLANTISI
function startKickListener(channelSlug) {
  const client = createClient(channelSlug, { logger: false, readOnly: true });

  client.on("ready", () => {
    console.log(`Kick bot hazır → ${channelSlug}`);
  });

  client.on("ChatMessage", (message) => {
    const username = message.sender?.username || "Bilinmeyen";
    const content = message.content?.trim();
    if (!content) return;

    console.log(`[CHAT] ${username}: ${content}`);

    // !katıl komutu
    if (content.toLowerCase() === "!katıl") {
      registerPlayer(username);
      return;
    }

    const player = activePlayers.find((p) => p.username === username);
    if (!player || player.id !== currentSelectedPlayerId) return;

    // Eğer zaten bu turda yazdıysa ve silah için ekstra hak verilmediyse → yok say
    if (player.hasUsedThisTurn && !player.waitingForTarget) return;

    // GEÇERSİZ SAYI → turu yak
    const num = parseInt(content, 10);
    if (isNaN(num)) {
      player.hasUsedThisTurn = true;
      player.waitingForTarget = false;
      io.emit("playerMessage", { playerId: player.id, content: null });
      return;
    }

    // 1) NORMAL MAYIN SEÇİMİ (1-70 arası sayı)
    if (num >= 1 && num <= 70 && !player.waitingForTarget) {
      player.hasUsedThisTurn = true;
      io.emit("playerMessage", { playerId: player.id, content: num.toString() });
      return;
    }

    // 2) SİLAH ÇIKTI → HEDEF NUMARASI BEKLİYORUZ
    if (player.waitingForTarget) {
      player.hasUsedThisTurn = true;
      player.waitingForTarget = false;
      io.emit("playerMessage", { playerId: player.id, content: `TARGET:${num}` }); // özel format
      return;
    }
  });

  client.on("error", (err) => console.error("Kick Hatası:", err));
}

// SİLAH ÇIKTIĞINDA EKSTRA HAK VERMEK İÇİN ÖZEL ENDPOINT
app.post("/api/trigger-gun", (req, res) => {
  const { playerId } = req.body;

  const player = activePlayers.find(p => p.id === playerId);
  if (player) {
    player.hasUsedThisTurn = false;     // EKSTRA 1 HAK VER!
    player.waitingForTarget = true;     // hedef bekleniyor
    console.log(`${player.username} silah çekti → hedef numarası bekleniyor`);
  }

  res.json({ success: true });
});

// OYUNCU SEÇME → herkesin hakkı sıfırlansın
app.post("/api/select-player", (req, res) => {
  const { playerId } = req.body;

  activePlayers.forEach((p) => {
    p.hasUsedThisTurn = false;
    p.waitingForTarget = false;
  });

  currentSelectedPlayerId = playerId;
  console.log(`Yeni oyuncu seçildi → ${playerId}`);
  res.json({ success: true });
});

app.post("/api/reset-game", (req, res) => {
  activePlayers = [];
  currentSelectedPlayerId = null;
  io.emit("gameReset");
  console.log("[GAME] Oyun sıfırlandı]");
  res.json({ success: true });
});

app.get("/api/players", (req, res) => res.json(activePlayers));

// SERVER BAŞLAT
server.listen(PORT, () => {
  console.log(`Backend çalışıyor → http://localhost:${PORT}`);
  startKickListener("karahank7"); // KANAL ADINI DEĞİŞTİR
  console.log("Kick dinleyicisi aktif → !katıl ve sayılar bekleniyor");
});