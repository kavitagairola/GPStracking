"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, Mail, ArrowRight, User, Truck, HeartHandshake, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("caller@resqtrack.org");
  const [password, setPassword] = useState("caller123");
  const [vehicleInput, setVehicleInput] = useState("Ambulance 01");
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState("TELECALLER");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const body = { role: selectedRole, password };

      if (selectedRole === "DRIVER") {
        body.vehicleInput = vehicleInput;
      } else {
        body.email = email;
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!json.success) {
        setError(json.error || "Login failed. Please try again.");
        setLoading(false);
        return;
      }

      // Redirect based on returned role
      if (json.role === "ADMIN") {
        router.push("/admin");
      } else if (json.role === "TELECALLER") {
        router.push("/telecaller");
      } else if (json.role === "DRIVER") {
        // Store driver info for UI display
        if (typeof window !== "undefined") {
          localStorage.setItem("currentDriverName", json.name || "Driver");
          localStorage.setItem("currentVehicleName", json.vehicleName || vehicleInput);
        }
        router.push("/driver");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  const fillDemoCredentials = (role) => {
    setSelectedRole(role);
    setError("");
    if (role === "ADMIN") {
      setEmail("admin@resqtrack.org");
      setPassword("admin123");
    } else if (role === "TELECALLER") {
      setEmail("caller@resqtrack.org");
      setPassword("caller123");
    } else if (role === "DRIVER") {
      setVehicleInput("Ambulance 01");
      setPassword("driver123");
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white overflow-hidden">

      {/* LEFT COLUMN: Modern Rescue Hero Banner */}
      <div className="hidden lg:flex relative lg:w-[50%] xl:w-[55%] min-h-[340px] lg:min-h-screen bg-slate-950 flex-col justify-between p-8 sm:p-12 text-white overflow-hidden flex-shrink-0">
        {/* Rescue Image Background */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105 opacity-75"
          style={{ backgroundImage: `url('/rescue-bg.jpg')` }}
        />

        {/* Soft Transparent Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-slate-900/20 pointer-events-none" />

        {/* Top Header Logo */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3 bg-white/15 backdrop-blur-md border border-white/20 px-4 py-2 rounded-2xl">
            <img src="/gokuldham-logo.png" alt="Gokul Dham" className="h-8 object-contain bg-white/95 p-1 rounded-lg" />
            <span className="text-[13px] font-black tracking-wide text-white">Gokul Dham Hospital</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1.5 rounded-full backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Live Ambulance Network Active
          </div>
        </div>

        {/* Center Hero Content */}
        <div className="relative z-10 my-auto py-10 max-w-[560px]">
          <span className="text-[12px] font-black uppercase tracking-widest text-orange-300 bg-orange-500/20 border border-orange-400/40 px-3.5 py-1.5 rounded-full inline-block mb-4 backdrop-blur-sm">
            Animal Rescue & Operations CRM
          </span>
          <h1 className="text-3xl sm:text-4xl xl:text-5xl font-black tracking-tight text-white leading-tight drop-shadow-sm">
            Dedicated Care for Every Voiceless Soul.
          </h1>
          <p className="text-[14px] sm:text-[15px] text-slate-200 font-medium mt-4 leading-relaxed drop-shadow-sm">
            Real-time ambulance dispatching, GPS telemetry, active case registry, and emergency telecaller workflow management system.
          </p>

          {/* Sanskrit Tagline */}
          <div className="mt-8 p-4 bg-black/30 border border-white/15 rounded-2xl backdrop-blur-md flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-orange-500/30 text-orange-300 flex items-center justify-center flex-shrink-0">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-[15px] font-black tracking-wide text-orange-300">
                ॥ निःस्वार्थ सेवा परमो धर्मः ॥
              </span>
              <span className="text-[11px] text-slate-300 font-bold uppercase tracking-wider">
                Selfless Service is our Supreme Duty
              </span>
            </div>
          </div>

          {/* Key Metric Pills */}
          <div className="grid grid-cols-3 gap-3 mt-8">
            <div className="bg-black/25 border border-white/15 p-3 rounded-2xl flex flex-col backdrop-blur-sm">
              <span className="text-xl font-black text-white">24/7</span>
              <span className="text-[10.5px] text-slate-300 font-bold uppercase tracking-wide">Emergency Response</span>
            </div>
            <div className="bg-black/25 border border-white/15 p-3 rounded-2xl flex flex-col backdrop-blur-sm">
              <span className="text-xl font-black text-orange-400">100%</span>
              <span className="text-[10.5px] text-slate-300 font-bold uppercase tracking-wide">GPS Fleet Tracking</span>
            </div>
            <div className="bg-black/25 border border-white/15 p-3 rounded-2xl flex flex-col backdrop-blur-sm">
              <span className="text-xl font-black text-emerald-400">Zero</span>
              <span className="text-[10.5px] text-slate-300 font-bold uppercase tracking-wide">Delay Dispatch</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-[11px] font-bold text-slate-400">
          © {new Date().getFullYear()} GOKUL DHAM ANIMAL HOSPITAL. RESQTRACK PLATFORM.
        </div>
      </div>

      {/* RIGHT COLUMN: Login Form */}
      <div className="lg:w-[50%] xl:w-[45%] flex-1 flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-white">
        <div className="w-full max-w-[420px] flex flex-col">

          {/* Logo Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="relative w-full max-w-[220px] h-[80px] mb-2 flex items-center justify-center">
              <img
                src="/gokuldham-logo.png"
                alt="Gokul Dham Logo"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <h2 className="text-[20px] font-black text-slate-900 tracking-tight mt-2">Sign In to Dashboard</h2>
            <p className="text-[12.5px] text-slate-400 font-semibold mt-1">Select your operational role to continue</p>
          </div>

          {/* Role Tabs */}
          <div className="grid grid-cols-3 gap-1.5 mb-6 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => fillDemoCredentials("TELECALLER")}
              className={`py-2.5 px-2 rounded-xl text-[12px] font-bold tracking-wide flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${selectedRole === "TELECALLER"
                  ? "bg-white text-emerald-700 shadow-sm border border-slate-200/80"
                  : "text-slate-500 hover:text-slate-900"
                }`}
            >
              <User className="w-3.5 h-3.5 text-emerald-600" />
              <span>Telecaller</span>
            </button>

            <button
              type="button"
              onClick={() => fillDemoCredentials("DRIVER")}
              className={`py-2.5 px-2 rounded-xl text-[12px] font-bold tracking-wide flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${selectedRole === "DRIVER"
                  ? "bg-white text-orange-700 shadow-sm border border-slate-200/80"
                  : "text-slate-500 hover:text-slate-900"
                }`}
            >
              <Truck className="w-3.5 h-3.5 text-orange-600" />
              <span>Driver</span>
            </button>

            <button
              type="button"
              onClick={() => fillDemoCredentials("ADMIN")}
              className={`py-2.5 px-2 rounded-xl text-[12px] font-bold tracking-wide flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer ${selectedRole === "ADMIN"
                  ? "bg-white text-blue-700 shadow-sm border border-slate-200/80"
                  : "text-slate-500 hover:text-slate-900"
                }`}
            >
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              <span>Admin</span>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 px-4 py-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2.5 text-rose-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-[12.5px] font-semibold">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {selectedRole !== "DRIVER" ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Email Address</label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="enter email"
                    className="w-full h-12 pl-10 pr-4 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-orange-500 focus:bg-white focus:outline-none rounded-xl text-[13.5px] font-semibold text-slate-800 transition-all placeholder-slate-400"
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Vehicle / Ambulance</label>
                <div className="relative flex items-center">
                  <Truck className="w-4 h-4 text-orange-500 absolute left-3.5" />
                  <input
                    type="text"
                    required
                    value={vehicleInput}
                    onChange={(e) => setVehicleInput(e.target.value)}
                    placeholder="e.g. Ambulance 01"
                    className="w-full h-12 pl-10 pr-4 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-orange-500 focus:bg-white focus:outline-none rounded-xl text-[13.5px] text-slate-800 transition-all placeholder-slate-400 font-bold"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Security Password</label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 pl-10 pr-4 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-orange-500 focus:bg-white focus:outline-none rounded-xl text-[13.5px] text-slate-800 transition-all placeholder-slate-400 font-semibold"
                />
              </div>
            </div>

            {/* Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-[14px] font-extrabold rounded-xl flex items-center justify-center gap-2 mt-2 transition-all duration-200 active:scale-[0.98] cursor-pointer shadow-lg shadow-orange-500/25 disabled:opacity-50"
            >
              {loading ? "Logging in..." : `Sign In as ${selectedRole === "ADMIN" ? "Admin" : selectedRole === "TELECALLER" ? "Telecaller" : "Driver"}`}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-5 border-t border-slate-100 text-center flex flex-col items-center">
            <span className="text-[11px] font-bold text-slate-400">
              Gokul Dham Animal Hospital Operations Console
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
