import React, { useState } from 'react';
import axios from 'axios';
// Styles'ı projenizin yapısına göre eklemeyi unutmayın
// import './UserManagementView.css'; 

// GameSelection.tsx'ten gelen aynı tipi burada tanımlıyoruz
type UserRole = "owner" | "yayıncı" | "oyuncu";

// 🚀 DÜZELTME: GameSelection'dan gelen onRoleUpdated prop'u buraya EKLENDİ
interface UserManagementProps {
    onClose: () => void;
    // Hata buradan kaynaklanıyordu, artık TypeScript bu prop'u tanıyacak
    onRoleUpdated: (newRole: UserRole) => void; 
}

const UserManagementView: React.FC<UserManagementProps> = ({ onClose, onRoleUpdated }) => {
    const [targetUser, setTargetUser] = useState('');
    const [newRole, setNewRole] = useState<UserRole>('oyuncu');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleUpdateRole = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            setMessage("Yetkilendirme hatası: Token bulunamadı.");
            return;
        }
        
        if (!targetUser) {
            setMessage("Lütfen güncellenecek kullanıcı adını girin.");
            return;
        }

        setIsLoading(true);
        setMessage('');

        try {
            // Backend'deki role güncelleme endpoint'iniz (Bu endpoint server.js'de tanımlı olmalı)
            const res = await axios.post('http://localhost:3002/update-user-role', {
                targetUsername: targetUser,
                role: newRole,
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.data.success) {
                setMessage(`Kullanıcı ${targetUser} rolü başarıyla ${newRole} olarak güncellendi!`);
                
                // Eğer güncellediğiniz rol KENDİ ROLÜNÜZ ise, ANA COMPONENT'i bilgilendirin.
                const currentUsername = localStorage.getItem('username');
                if (targetUser === currentUsername) {
                    onRoleUpdated(newRole); // GameSelection'daki handleRoleUpdate fonksiyonunu tetikler
                }
            } else {
                setMessage(res.data.message || 'Rol güncelleme sırasında bir hata oluştu.');
            }
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                 setMessage(error.response.data.message || 'Sunucudan hata yanıtı alındı.');
            } else {
                setMessage('Rol güncelleme sırasında beklenmedik bir hata oluştu.');
            }
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="profile-view user-management-view">
            <h2>Kullanıcı Yönetimi</h2>
            
            <input
                placeholder="Hedef Kullanıcı Adı"
                value={targetUser}
                onChange={(e) => setTargetUser(e.target.value)}
                disabled={isLoading}
            />

            <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                disabled={isLoading}
            >
                <option value="oyuncu">Oyuncu</option>
                <option value="yayıncı">Yayıncı</option>
                <option value="owner">Owner</option>
            </select>
            
            <button onClick={handleUpdateRole} disabled={isLoading}>
                {isLoading ? "Güncelleniyor..." : "Rolü Güncelle"}
            </button>
            
            {message && <p className="management-message">{message}</p>}
            
            <button onClick={onClose} disabled={isLoading}>
                Kapat
            </button>
        </div>
    );
};

export default UserManagementView;