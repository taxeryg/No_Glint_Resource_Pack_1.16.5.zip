
import React, { useState, useEffect, useCallback, useRef } from "react";

import { useNavigate } from "react-router-dom";

import axios from "axios";

import profileIcon from "../assets/default_avatar.png";

import marketIcon from "../assets/market.png";

import game1 from "../assets/game1.png";

import game2 from "../assets/game2.png";

import game3 from "../assets/game3.png";

import './GameSelection.css';

import UserManagementView from "./UserManagementView";



type UserRole = "owner" | "yayıncı" | "oyuncu";



const GameSelection: React.FC = () => {

    const [profileOpen, setProfileOpen] = useState(false);

    const [viewProfile, setViewProfile] = useState(false);

    const [viewManagement, setViewManagement] = useState(false);

   

    const [userRole, setUserRole] = useState<UserRole>("oyuncu");

    const [currentUsername, setCurrentUsername] = useState("Misafir");

    const [avatar, setAvatar] = useState(profileIcon);

    const [score, setScore] = useState(0);



    const [errorMessage, setErrorMessage] = useState<string | null>(null);

   

    const fileInputRef = useRef<HTMLInputElement>(null);

    const navigate = useNavigate();



    useEffect(() => {

        const storedUsername = localStorage.getItem("username");

        const storedAvatar = localStorage.getItem("avatar");

        const storedScore = localStorage.getItem("score");

        const storedRole = localStorage.getItem("userRole");



        if (storedUsername) setCurrentUsername(storedUsername);

       

        if (storedRole && ["owner", "yayıncı", "oyuncu"].includes(storedRole)) {

            setUserRole(storedRole as UserRole);

        } else {

            setUserRole("oyuncu");

        }



        if (storedAvatar) {

            setAvatar(storedAvatar);

        } else {

             setAvatar(profileIcon);

        }



        if (storedScore) {

            const parsedScore = parseInt(storedScore, 10);

            if (!isNaN(parsedScore)) setScore(parsedScore);

        }

    }, []);



    const handleRoleUpdate = useCallback((newRole: UserRole) => {

        localStorage.setItem("userRole", newRole);

        setUserRole(newRole);

    }, []);



    const handleLogout = useCallback(() => {

        localStorage.removeItem("token");

        localStorage.removeItem("username");

        localStorage.removeItem("userRole");

        localStorage.removeItem("avatar");

        localStorage.removeItem("score");    

       

        setCurrentUsername("Misafir");

        setUserRole("oyuncu");

        setAvatar(profileIcon);

        setScore(0);

       

        navigate("/", { replace: true });

    }, [navigate]);



    const handleAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {

        if (e.target.files && e.target.files[0]) {

          const file = e.target.files[0];

          const reader = new FileReader();

         

          reader.onload = async () => {

            if (typeof reader.result === 'string') {

              const newAvatar = reader.result;

             

              setAvatar(newAvatar);

              localStorage.setItem("avatar", newAvatar);



              const token = localStorage.getItem("token");

              if (token) {

                  try {

                      // Hata: alert() yerine custom modal kullanın. Şimdilik konsola yazalım.

                      await axios.post("https://karahanbest.netlify.app/update-avatar",

                          { newAvatarPath: newAvatar },

                          { headers: { 'Authorization': `Bearer ${token}` } }

                      );

                  } catch (error) {

                      console.error("Avatar Backend kaydı başarısız:", error);

                      // Custom modal/message box çağrısı buraya gelmeli.

                  }

              } else {

                  console.log("Lütfen önce giriş yapın.");

                  // Custom modal/message box çağrısı buraya gelmeli.

              }

            }

          };

          reader.readAsDataURL(file);

        }

    }, []);



    const triggerAvatarInput = useCallback(() => {

        fileInputRef.current?.click();

        setProfileOpen(false);

    }, []);

     

    // 🚀 OYUN TIKLAMA FONKSİYONU

    const handleGameClick = useCallback((gameId: string) => {

        setErrorMessage(null);

        console.log(`Tıklanan oyun ID: ${gameId}. Kullanıcı rolü: ${userRole}`);



        if (userRole === "owner" || userRole === "yayıncı") {

            // BAŞARILI YÖNLENDİRME

            navigate(`/play/${gameId}`);

        } else {

            setErrorMessage("Üzgünüz! Bu oyunu yalnızca Yayıncılar ve Ownerlar oynayabilir.");

           

            setTimeout(() => {

                setErrorMessage(null);

            }, 3000);

        }

    }, [userRole, navigate]);





    return (

        <div className="game-selection">

            {/* Üst bar */}

            <div className="top-bar">

                <img src={marketIcon} alt="Market" className="icon market" />

                <h1>Karahan Games</h1>

                <div className="profile-container">

                    <img

                        src={avatar}

                        alt="Profil"

                        className="icon profile"

                        onClick={() => setProfileOpen(!profileOpen)}

                    />

                    {profileOpen && (

                        <div className="profile-menu">

                            <p onClick={() => { setViewProfile(true); setProfileOpen(false); }}>Profili Görüntüle</p>

                           

                            {userRole === "owner" && (

                                <p

                                    onClick={() => { setViewManagement(true); setProfileOpen(false); }}

                                    style={{ color: '#ffcc00', fontWeight: 'bold' }}

                                >

                                    Oyuncular (Yönetim)

                                </p>

                            )}

                           

                            <p onClick={triggerAvatarInput}>

                                Avatarı Değiştir

                            </p>

                            <p onClick={handleLogout}>Çıkış Yap</p>

                        </div>

                    )}

                </div>

                <input

                    type="file"

                    ref={fileInputRef}

                    id="avatarInput"

                    accept="image/*"

                    style={{ display: "none" }}

                    onChange={handleAvatarChange}

                />

            </div>



            {/* 🛑 HATA MESAJI GÖSTERİMİ */}

            {errorMessage && (

                <div className="error-banner">

                    {errorMessage}

                </div>

            )}



            {/* 🆕 Kullanıcı Yönetimi Ekranı */}

            {viewManagement && (

                <UserManagementView

                    onClose={() => setViewManagement(false)}

                    onRoleUpdated={handleRoleUpdate}

                />

            )}

           

            {/* Profil Görüntüleme */}

            {viewProfile && (

                <div className="profile-view">

                    <h2>

                        {currentUsername}&nbsp;(

                        <span

                            style={{

                                color: '#800080',

                                fontWeight: 'bold'

                            }}

                        >

                            {userRole.toUpperCase()}

                        </span>

                        )

                    </h2>

                    <img src={avatar} alt="Avatar" className="profile-avatar" />

                    <p>Puan: {score}</p>

                    <button onClick={() => setViewProfile(false)}>Kapat</button>

                </div>

            )}



            {/* Oyun logoları */}

            <div className="games">

                <img

                    src={game1}

                    alt="Oyun 1"

                    className="game-logo"

                    // 🎯 Düzeltme: Yönlendirme kimliği 'play1' olarak ayarlandı

                    onClick={() => handleGameClick("play1")}

                />

                <img

                    src={game2}

                    alt="Oyun 2"

                    className="game-logo"

                    onClick={() => handleGameClick("game2")}

                />

                <img

                    src={game3}

                    alt="Oyun 3"

                    className="game-logo"

                    onClick={() => handleGameClick("game3")}

                />

            </div>

        </div>

    );

};



export default GameSelection;