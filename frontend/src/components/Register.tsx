import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios, { AxiosError } from "axios";

interface RegisterResponse {
    success: boolean;
    message?: string;
}

interface ErrorResponse {
    message?: string;
}

const Register: React.FC = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage("");

        // Client-Side Doğrulama
        if (username.length < 3) {
            setMessage("Kullanıcı adı en az 3 karakter olmalıdır.");
            return;
        }
        if (password.length < 6) {
            setMessage("Şifre en az 6 karakter olmalıdır.");
            return;
        }

        setIsLoading(true);

        try {
            const res = await axios.post<RegisterResponse>("http://localhost:3002/register", { username, password });
            
            if (res.data.success) {
                setMessage("Kayıt başarılı! Yönlendiriliyorsunuz...");
                setTimeout(() => navigate("/"), 1500); 
            } else {
                setMessage(res.data.message || "Kullanıcı zaten var veya kayıt başarısız!");
            }
        } catch (err) {
            // Hata tipini ErrorResponse'u içerecek şekilde belirttik (TypeScript hatası çözüldü)
            const axiosError = err as AxiosError<ErrorResponse>; 

            if (axiosError.response) {
                const errorMessage = axiosError.response.data?.message || "Kayıt sırasında hata oluştu.";
                setMessage(errorMessage);
            } else if (axiosError.request) {
                setMessage("Sunucuya bağlanılamadı!");
            } else {
                setMessage("Bilinmeyen bir hata oluştu.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form className="form-container" onSubmit={handleSubmit}>
            <h2>Kayıt Ol</h2>
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
                {isLoading ? "Kayıt Yapılıyor..." : "Kayıt Ol"}
            </button>
            {message && <p className="form-message">{message}</p>}
            <p>Zaten hesabın var mı? <Link to="/">Giriş Yap</Link></p>
        </form>
    );
};

export default Register;