import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios, { AxiosError } from "axios";

// 🔥 GÜNCELLENDİ: Sunucudan beklenen yanıt yapısı (Tüm profil verileri eklendi)
interface LoginResponse {
  success: boolean;
  message?: string;
  username?: string;
  token?: string; 
  
  // 🔑 Backend'den gelmesi gereken KRİTİK VERİLER
  role?: string; 
  score?: number;
  profilePicture?: string; // Backend'deki adıyla eşleşmeli
}

interface ErrorResponse {
    message?: string;
}

const Login: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false); 
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (username.length < 3 || password.length < 6) {
      setMessage("Kullanıcı adı ve şifre geçerli uzunlukta olmalıdır.");
      return;
    }
    
    setIsLoading(true);

    try {
      // Sunucuya POST isteği
      const res = await axios.post<LoginResponse>("http://localhost:3002/login", { username, password });
      
      if (res.data.success) {
        
        // 1. Token Kontrolü ve Kaydı (Kritik)
        const token = res.data.token;
        if (!token) {
            setMessage("Giriş başarılı, ancak sunucudan yetkilendirme tokenı alınamadı.");
            setIsLoading(false);
            return;
        }
        localStorage.setItem("token", token); 
        
        // 2. Kullanıcı Adı Kaydı
        localStorage.setItem("username", res.data.username || username);
        
        // 🚀 3. ROL VE PROFİL VERİLERİNİ KAYDETME (Çözüm burada!)
        
        // ROL (userRole, GameSelection'da bunu okuyor)
        if (res.data.role) {
          localStorage.setItem("userRole", res.data.role); 
        }

        // SKOR/PUAN
        if (res.data.score !== undefined) {
          // LocalStorage'a kaydederken string olarak kaydetmek gerekir
          localStorage.setItem("score", String(res.data.score)); 
        }
        
        // AVATAR (Backend'de 'profilePicture' olarak tanımlıydı, Frontend'de 'avatar' olarak kaydedelim)
        if (res.data.profilePicture) {
          // Varsayılan avatar yolunu kaydetmek, GameSelection'ın boş kalmasını engeller
          localStorage.setItem("avatar", res.data.profilePicture); 
        }

        // Başarılıysa yönlendir
        navigate("/game-selection");
      } else {
        setMessage(res.data.message || "Kullanıcı adı veya şifre yanlış!");
      }
    } catch (err) {
      const axiosError = err as AxiosError<ErrorResponse>; 

      if (axiosError.response) {
        const errorMessage = axiosError.response.data?.message || "Giriş başarısız oldu.";
        setMessage(errorMessage);
      } else if (axiosError.request) {
        setMessage("Sunucuya bağlanılamadı (http://localhost:3002). Backend çalışıyor mu?");
      } else {
        setMessage("Bilinmeyen bir hata oluştu.");
      }
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <form className="form-container" onSubmit={handleSubmit}>
      <h2>Giriş Yap</h2>
      <input
        placeholder="Kullanıcı Adı"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        disabled={isLoading}
      />
      <input
        placeholder="Şifre"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={isLoading}
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? "Giriş Yapılıyor..." : "Giriş Yap"}
      </button>
      
      {message && <p className="form-message">{message}</p>}

      <p>
        Hesabın yok mu? <Link to="/register">Kayıt Ol</Link>
      </p>
    </form>
  );
};

export default Login;