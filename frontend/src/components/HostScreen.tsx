import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import io, { Socket } from "socket.io-client";
import './HostScreen.css';

const SOCKET_SERVER_URL = "https://karahanbest.netlify.app";

interface Player {
    id: number;
    username: string;
    score: number;
    color: string;
    joinOrder: number;
    lives: number;
}

const HostScreen: React.FC = () => {
    const navigate = useNavigate();
    const [players, setPlayers] = useState<Player[]>([]);
    const [shuffledPlayers, setShuffledPlayers] = useState<Player[]>([]);
    const [isShuffled, setIsShuffled] = useState(false);
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [revealedMines, setRevealedMines] = useState<Map<number, "apple" | "gun" | "skull">>(new Map());
    const [notification, setNotification] = useState<string | null>(null);

    const mines = Array.from({ length: 70 }, (_, i) => i + 1);

    // SES FONKSİYONU – SADECE BU EK
    const playSound = useCallback((sound: "apple" | "gun" | "death") => {
        const audio = new Audio(`/sounds/${sound}.mp3`);
        audio.volume = 0.75;
        audio.play().catch(() => {}); // tarayıcı engellerse sessiz kalır
    }, []);

    const getRandomIcon = (): "apple" | "gun" | "skull" => {
        const r = Math.random() * 100;
        if (r < 25) return "apple";
        if (r < 70) return "gun";
        return "skull";
    };

    useEffect(() => {
        const socket: Socket = io(SOCKET_SERVER_URL);

        socket.on('connect', () => console.log("Host bağlandı"));

        socket.on('playerJoined', (newPlayer: Player) => {
            setPlayers(prev => {
                if (prev.some(p => p.id === newPlayer.id)) return prev;
                return [...prev, newPlayer].sort((a, b) => a.joinOrder - b.joinOrder);
            });
        });

        socket.on('playerMessage', async (data: { playerId: number, content: string | null }) => {
            if (!selectedPlayer || data.playerId !== selectedPlayer.id) return;

            const content = data.content?.trim();
            if (!content) {
                setNotification("Geçersiz giriş!");
                setTimeout(() => setNotification(null), 3000);
                return;
            }

            // SİLAHLA ATEŞ EDİLİRSE → BANG!
            if (content.startsWith("TARGET:")) {
                playSound("gun"); // SİLAH SESİ BURADA

                const targetOrder = parseInt(content.split(":")[1], 10);
                const target = players.find(p => p.joinOrder === targetOrder && p.lives > 0);

                if (!target || isNaN(targetOrder)) {
                    setNotification("Geçersiz hedef! Kimse vurulmadı.");
                } else {
                    setPlayers(prev => prev.map(p =>
                        p.id === target.id ? { ...p, lives: p.lives - 1 } : p
                    ));
                    setNotification(`${selectedPlayer.username} → ${targetOrder}. oyuncuya ATEŞ ETTİ!`);
                }
                setTimeout(() => setNotification(null), 5000);
                return;
            }

            // NORMAL MAYIN SEÇİMİ
            const num = parseInt(content, 10);
            if (isNaN(num) || num < 1 || num > 70) {
                setNotification("1-70 arası sayı yaz!");
                setTimeout(() => setNotification(null), 3000);
                return;
            }

            if (revealedMines.has(num)) {
                setNotification("Bu kutu zaten açıldı!");
                setTimeout(() => setNotification(null), 3000);
                return;
            }

            const icon = getRandomIcon();
            setRevealedMines(prev => new Map(prev).set(num, icon));

            setPlayers(prev => prev.map(p => {
                if (p.id === selectedPlayer.id) {
                    let newLives = p.lives;
                    if (icon === "skull") {
                        newLives -= 1;
                        playSound("death"); // KAFATASI SESİ
                    }
                    if (icon === "apple") {
                        newLives += 1;
                        playSound("apple"); // ELMA YEME SESİ
                    }

                    if (icon === "gun") {
                        fetch("http://localhost:3001/api/trigger-gun", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ playerId: p.id })
                        });

                        setNotification(`${p.username} SİLAH ÇEKTİ! Hedef oyuncu numarasını yaz! (1-${players.filter(x => x.lives > 0).length})`);
                        setTimeout(() => setNotification(null), 8000);
                        return { ...p, lives: newLives };
                    }

                    const mesaj = icon === "apple" ? "Elma çıktı! +1 can" :
                                 icon === "skull" ? "KAFATASI! -1 can" : "";
                    setNotification(`${p.username} → ${num} açıldı! ${mesaj}`);
                    setTimeout(() => setNotification(null), 4000);
                    return { ...p, lives: newLives };
                }
                return p;
            }));
        });

        socket.on('gameReset', () => {
            setPlayers([]);
            setShuffledPlayers([]);
            setIsShuffled(false);
            setSelectedPlayer(null);
            setRevealedMines(new Map());
            setNotification(null);
        });

        return () => { socket.disconnect(); };
    }, [selectedPlayer, players, playSound]); // playSound eklendi

    const handleGoHome = useCallback(() => navigate('/game-selection'), [navigate]);

    const handleNewGame = useCallback(async () => {
        await fetch(`${SOCKET_SERVER_URL}/api/reset-game`, { method: 'POST' });
        setRevealedMines(new Map());
        setSelectedPlayer(null);
        setNotification(null);
    }, []);

    const handleShuffle = useCallback(() => {
        const alive = players.filter(p => p.lives > 0);
        const shuffled = [...alive].sort(() => Math.random() - 0.5);
        setShuffledPlayers(shuffled);
        setIsShuffled(true);
        setSelectedPlayer(null);
    }, [players]);

    const handleSelect = useCallback(async (player: Player) => {
        setSelectedPlayer(player);
        setShuffledPlayers([]);
        setIsShuffled(false);

        await fetch(`${SOCKET_SERVER_URL}/api/select-player`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId: player.id })
        });
    }, []);

    const getIcon = (type: "apple" | "gun" | "skull") => {
        return type === "apple" ? "Elma" : type === "gun" ? "Silah" : "Kafatası";
    };

    return (
        <div className="host-screen">
            <header className="host-header">
                <h1 className="title">Karrakolla</h1>
                <div className="header-controls">
                    <button onClick={handleNewGame} className="control-button new-game-button">Oyunu Yenile</button>
                    <button onClick={handleGoHome} className="control-button home-button">Ana Sayfa</button>
                </div>
            </header>

            <main className="host-main-content">
                <div className="player-status top-card">
                    <h3>Katılan Oyuncular ({players.length})</h3>
                    <div className="player-list-grid small">
                        {players.map(p => (
                            <div key={p.id} className="player-item-compact" style={{ 
                                backgroundColor: p.color,
                                opacity: p.lives > 0 ? 1 : 0.4,
                                filter: p.lives > 0 ? "none" : "grayscale(100%)"
                            }}>
                                <span className="player-join-order">{p.joinOrder}.</span>
                                <span className={`player-name ${p.lives <= 0 ? 'eliminated' : ''}`}>
                                    {p.username}
                                </span>
                                <span className="player-lives-heart">{p.lives}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bottom-area">
                    <div className="player-status-card shuffled-card">
                        <h3>Karıştırılmış Oyuncular</h3>
                        <div className="player-list-grid">
                            {shuffledPlayers.map(p => (
                                <div key={p.id} className={`player-item-shuffled ${isShuffled ? 'shuffled' : ''}`}>
                                    {isShuffled && (
                                        <button className="select-button" onClick={() => handleSelect(p)}>Seç</button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button className="shuffle-button" onClick={handleShuffle}>Karıştır</button>
                    </div>

                    <div className="game-card mines-card">
                        <h3>Mayın Tarlası (1-70)</h3>
                        <div className="mine-grid">
                            {mines.map(num => {
                                const revealed = revealedMines.get(num);
                                return (
                                    <div key={num} className={`mine-cell ${revealed ? 'revealed' : ''}`}>
                                        {revealed ? getIcon(revealed) : num}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {selectedPlayer && (
                    <div className="selected-player-display">
                        Sıra: <strong>{selectedPlayer.username}</strong>'da
                    </div>
                )}

                {notification && <div className="notification-popup">{notification}</div>}
            </main>
        </div>
    );
};

export default HostScreen;