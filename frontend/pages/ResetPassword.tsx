import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle } from "lucide-react";
import { API } from "../lib/api"; // Ensure this points to your API definitions

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  // Redirect if no token is present
  useEffect(() => {
    if (!token) {
      alert("Token tidak valid!");
      navigate("/login");
    }
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("Konfirmasi password tidak cocok!");
      return;
    }

    if (password.length < 6) {
        setStatus("error");
        setMessage("Password minimal 6 karakter.");
        return;
    }

    setLoading(true);
    setStatus("idle");

    try {
      // Hit endpoint Backend: POST /api/auth/reset-password
      // Make sure to add this endpoint to your lib/api.ts file!
      const res = await fetch(`${API.BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            token: token,
            new_password: password
        }),
      });

      const json = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage("Password berhasil diubah! Mengalihkan ke login...");
        setTimeout(() => navigate("/login"), 3000);
      } else {
        setStatus("error");
        setMessage(json.error || "Gagal mereset password. Token mungkin kadaluarsa.");
      }
    } catch (err) {
      setStatus("error");
      setMessage("Terjadi kesalahan koneksi.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) return null;

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl">
        <div className="text-center mb-8">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
            <Lock size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Buat Password Baru</h1>
          <p className="text-slate-500 text-sm mt-2">Silakan masukkan password baru untuk akun Anda.</p>
        </div>

        {status === "success" ? (
          <div className="bg-green-50 text-green-800 p-4 rounded-xl flex flex-col items-center text-center animate-in fade-in zoom-in">
            <CheckCircle size={48} className="mb-2 text-green-600" />
            <p className="font-bold text-lg">Berhasil!</p>
            <p>{message}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {status === "error" && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle size={16} /> {message}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Password Baru</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-blue-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Konfirmasi Password</label>
              <input
                type="password"
                required
                className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ulangi password baru"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? "Menyimpan..." : "Simpan Password Baru"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}