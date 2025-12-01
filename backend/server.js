// server.js (Avatar Güncelleme Özelliği Eklendi)

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { createRequire } from 'module'; 
const require = createRequire(import.meta.url);

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import bcrypt from "bcryptjs"; 
import jwt from "jsonwebtoken"; 
import dotenv from "dotenv"; 
import { fileURLToPath } from 'url'; 
import path from 'path'; 

dotenv.config(); 

const app = express();
const PORT = 3002;
// Lütfen JWT_SECRET'ı .env dosyanızdan çektiğinizden emin olun
const JWT_SECRET = process.env.JWT_SECRET || 'Lutfen-Beni-Guclu-BirSifreyleDegistirin!'; 
const SERVICE_ACCOUNT_KEY_PATH = 'firebase-adminsdk.json'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db; 
let usersCollection;

function initializeFirebase() {
    try {
        const serviceAccountPath = path.join(__dirname, SERVICE_ACCOUNT_KEY_PATH);
        const serviceAccount = require(serviceAccountPath); 
        
        initializeApp({
            credential: cert(serviceAccount)
        });
        
        db = getFirestore();
        usersCollection = db.collection('users');
        console.log("Firebase Admin SDK başlatıldı ve Firestore'a bağlandı.");
    } catch (error) {
        console.error(`\n--- KRİTİK BAŞLATMA HATASI ---\n`, error.message);
    }
}

initializeFirebase(); 
app.use(cors());
app.use(bodyParser.json());

// ----------------------------------------------------
// 🔑 GÜVENLİK MIDDLEWARE'İ
// ----------------------------------------------------
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer TOKEN

    if (token == null) return res.sendStatus(401); 

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); 
        req.user = user;
        next();
    });
};

// ----------------------------------------------------
// 🎯 REGİSTER ENDPOİNT
// ----------------------------------------------------
app.post("/register", async (req, res) => {
    if (!usersCollection) return res.status(503).json({ success: false, message: "Veritabanı bağlantısı yok." });
    
    const { username, password } = req.body;
    
    try {
        const existingUser = await usersCollection.where('username', '==', username).get();
        if (!existingUser.empty) {
            return res.status(409).json({ success: false, message: "Kullanıcı zaten var!" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = {
            username: username,
            password: hashedPassword, 
            role: 'oyuncu', 
            score: 0,
            coins: 100,
            bio: "Merhaba, ben yeni bir oyuncuyum!",
            profilePicture: "default_avatar.png" // Varsayılan avatar yolu
        };

        await usersCollection.add(newUser); 
        
        res.json({ success: true, message: "Kayıt başarılı!" });
        
    } catch (err) {
        console.error("Kayıt hatası:", err.message);
        res.status(500).json({ success: false, message: "Sunucu hatası!" }); 
    }
});


// ----------------------------------------------------
// 🔑 LOGIN ENDPOİNT
// ----------------------------------------------------
app.post("/login", async (req, res) => {
    if (!usersCollection) return res.status(503).json({ success: false, message: "Veritabanı bağlantısı yok." });

    const { username, password } = req.body;

    try {
        const snapshot = await usersCollection.where('username', '==', username).limit(1).get();

        if (snapshot.empty) {
            return res.status(401).json({ success: false, message: "Kullanıcı adı veya şifre yanlış!" });
        }
        
        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        const match = await bcrypt.compare(password, userData.password);
        if (!match) return res.status(401).json({ success: false, message: "Kullanıcı adı veya şifre yanlış!" });

        const payload = { 
            userId: userId, 
            username: userData.username,
            role: userData.role 
        }; 
        
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({
            success: true, 
            message: "Giriş başarılı!", 
            token: token,
            
            // KRİTİK: Frontend'in ihtiyaç duyduğu tüm profil verilerini döndür
            username: userData.username, 
            role: userData.role, 
            score: userData.score, 
            profilePicture: userData.profilePicture 
        });

    } catch (err) {
        console.error("Giriş hatası:", err.message);
        res.status(500).json({ success: false, message: "Sunucu hatası!" });
    }
});

// 🖼️ AVATAR GÜNCELLEME ENDPOİNT'İ
app.post("/update-avatar", authenticateToken, async (req, res) => {
    if (!usersCollection) return res.status(503).json({ success: false, message: "Veritabanı bağlantısı yok." });

    const { newAvatarPath } = req.body;
    const { userId } = req.user; // Token'dan alınan kullanıcı ID'si

    if (!newAvatarPath) {
        return res.status(400).json({ success: false, message: "Yeni avatar yolu gerekli." });
    }

    try {
        // Kullanıcı ID'si ile veritabanındaki belgeyi güncelle
        await usersCollection.doc(userId).update({
            profilePicture: newAvatarPath
        });

        res.json({ success: true, message: "Avatar başarıyla güncellendi.", newPath: newAvatarPath });
    } catch (err) {
        console.error("Avatar güncelleme hatası:", err.message);
        res.status(500).json({ success: false, message: "Sunucu hatası!" });
    }
});


app.listen(PORT, () => {
  console.log(`Backend çalışıyor, port: ${PORT}`);
});