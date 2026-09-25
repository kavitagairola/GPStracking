"use client";

import React, { useState } from "react";
import { Save, Shield, Settings, Sliders, Bell, Globe, Database, Key, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Organization settings
  const [orgName, setOrgName] = useState("ResqTrack Animal Welfare Association");
  const [supportPhone, setSupportPhone] = useState("9876543200");
  const [supportEmail, setSupportEmail] = useState("ops@resqtrack.org");

  // System parameters
  const [pollingRate, setPollingRate] = useState(4);
  const [offlineTimeout, setOfflineTimeout] = useState(15);
  const [autoDispatch, setAutoDispatch] = useState("NEAREST");

  // Notifications toggles
  const [smsHighAlert, setSmsHighAlert] = useState(true);
  const [emailDailyDigest, setEmailDailyDigest] = useState(false);
  const [enforcePhoto, setEnforcePhoto] = useState(true);

  const [saving, setSaving] = useState(false);

  // Load saved settings from API on component mount
  React.useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          const d = json.data;
          if (d.orgName) setOrgName(d.orgName);
          if (d.supportPhone) setSupportPhone(d.supportPhone);
          if (d.supportEmail) setSupportEmail(d.supportEmail);
          if (d.pollingRate) setPollingRate(Number(d.pollingRate));
          if (d.offlineTimeout) setOfflineTimeout(Number(d.offlineTimeout));
          if (d.autoDispatch) setAutoDispatch(d.autoDispatch);
          if (d.smsHighAlert !== undefined) setSmsHighAlert(Boolean(d.smsHighAlert));
          if (d.emailDailyDigest !== undefined) setEmailDailyDigest(Boolean(d.emailDailyDigest));
          if (d.enforcePhoto !== undefined) setEnforcePhoto(Boolean(d.enforcePhoto));
        }
      })
      .catch(err => console.error("Failed to load settings:", err));
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      orgName,
      supportPhone,
      supportEmail,
      pollingRate,
      offlineTimeout,
      autoDispatch,
      smsHighAlert,
      emailDailyDigest,
      enforcePhoto
    };

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        if (typeof window !== "undefined") {
          localStorage.setItem("admin_orgName", orgName);
          localStorage.setItem("admin_supportPhone", supportPhone);
          localStorage.setItem("admin_supportEmail", supportEmail);
          localStorage.setItem("admin_pollingRate", pollingRate.toString());
          localStorage.setItem("admin_offlineTimeout", offlineTimeout.toString());
          localStorage.setItem("admin_autoDispatch", autoDispatch);
          localStorage.setItem("admin_smsHighAlert", smsHighAlert.toString());
          localStorage.setItem("admin_emailDailyDigest", emailDailyDigest.toString());
          localStorage.setItem("admin_enforcePhoto", enforcePhoto.toString());
        }
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full text-slate-800">
      
      {/* Title Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex flex-col">
          <h1 className="text-[20px] font-black text-slate-900 tracking-tight">System Settings</h1>
          <p className="text-[12px] text-gray-400 mt-1 font-bold">Configure CRM parameters, telemetry rates, incident dispatch rules, and compliance variables.</p>
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-4 rounded-2xl text-[12.5px] font-bold flex items-center gap-2 shadow-3xs animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>System configurations successfully compiled and saved to local servers. All tracking modules reloaded.</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="flex flex-col lg:flex-row gap-6">
        
        {/* Left configurations modules */}
        <div className="flex-1 flex flex-col gap-6">
          
          {/* Module 1: NGO profile */}
          <div className="bg-white border border-slate-200/60 p-6 rounded-3xl shadow-3xs flex flex-col gap-5">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <Globe className="w-4.5 h-4.5 text-blue-600" />
              <h3 className="text-[14px] font-black text-slate-800">Organization Profile</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[12.5px]">
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="font-bold text-gray-400 uppercase text-[9.5px] tracking-wider">NGO Association Name</label>
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-bold text-slate-700 transition"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-gray-400 uppercase text-[9.5px] tracking-wider">Support Phone</label>
                <input
                  type="text"
                  required
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  className="h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-bold text-slate-700 transition"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-gray-400 uppercase text-[9.5px] tracking-wider">Support Operations Email</label>
                <input
                  type="email"
                  required
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-bold text-slate-700 transition"
                />
              </div>
            </div>
          </div>

          {/* Module 2: GPS Telemetry Variables */}
          <div className="bg-white border border-slate-200/60 p-6 rounded-3xl shadow-3xs flex flex-col gap-5">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <Database className="w-4.5 h-4.5 text-blue-600" />
              <h3 className="text-[14px] font-black text-slate-800">Telemetry & Mapping Systems</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[12.5px]">
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-gray-400 uppercase text-[9.5px] tracking-wider flex items-center justify-between">
                  <span>GPS API Polling Interval</span>
                  <span className="text-blue-600 font-black">{pollingRate} seconds</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="2"
                    max="15"
                    step="1"
                    value={pollingRate}
                    onChange={(e) => setPollingRate(Number(e.target.value))}
                    className="flex-1 accent-blue-600 h-2 bg-slate-100 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-gray-400 uppercase text-[9.5px] tracking-wider">Driver Offline Timeout Threshold</label>
                <select
                  value={offlineTimeout}
                  onChange={(e) => setOfflineTimeout(Number(e.target.value))}
                  className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 cursor-pointer outline-none"
                >
                  <option value={5}>5 minutes (Aggressive)</option>
                  <option value={15}>15 minutes (Standard)</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>60 minutes</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="font-bold text-gray-400 uppercase text-[9.5px] tracking-wider">Mapbox/Google Maps Secret API Key</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-350 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    readOnly
                    value="AIzaSyA88942-XnL0954kKla892Kls98A"
                    className="w-full h-10 pl-10 pr-4 bg-slate-150 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-400 focus:outline-none select-none"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right configurations modules */}
        <div className="w-full lg:w-[380px] flex flex-col gap-6 flex-shrink-0">
          
          {/* Module 3: Operational Rules */}
          <div className="bg-white border border-slate-200/60 p-6 rounded-3xl shadow-3xs flex flex-col gap-5">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <Sliders className="w-4.5 h-4.5 text-blue-600" />
              <h3 className="text-[14px] font-black text-slate-800">Dispatch Controls</h3>
            </div>

            <div className="flex flex-col gap-4 text-[12.5px]">
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-gray-400 uppercase text-[9.5px] tracking-wider">Automated Dispatch Strategy</label>
                <select
                  value={autoDispatch}
                  onChange={(e) => setAutoDispatch(e.target.value)}
                  className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 cursor-pointer outline-none"
                >
                  <option value="NEAREST">Nearest Vehicle Index</option>
                  <option value="IDLE">Idle Roster Priority</option>
                  <option value="MANUAL">Manual Routing Only</option>
                </select>
              </div>

              {/* Toggles */}
              <div className="flex flex-col gap-3.5 mt-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={smsHighAlert}
                    onChange={(e) => setSmsHighAlert(e.target.checked)}
                    className="w-4.5 h-4.5 rounded border-slate-355 text-blue-600 focus:ring-blue-500 mt-0.5"
                  />
                  <div className="flex flex-col">
                    <span className="font-extrabold text-slate-700 leading-tight">Critical Call Alerts</span>
                    <span className="text-[10px] text-gray-400 mt-0.5 leading-snug">Auto-broadcast SMS dispatch logs to supervisors for HIGH priority cases.</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={enforcePhoto}
                    onChange={(e) => setEnforcePhoto(e.target.checked)}
                    className="w-4.5 h-4.5 rounded border-slate-355 text-blue-600 focus:ring-blue-500 mt-0.5"
                  />
                  <div className="flex flex-col">
                    <span className="font-extrabold text-slate-700 leading-tight">Enforce Evidence Photo</span>
                    <span className="text-[10px] text-gray-400 mt-0.5 leading-snug">Require drivers to upload animal evidence photo before confirming pickup stage.</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={emailDailyDigest}
                    onChange={(e) => setEmailDailyDigest(e.target.checked)}
                    className="w-4.5 h-4.5 rounded border-slate-355 text-blue-600 focus:ring-blue-500 mt-0.5"
                  />
                  <div className="flex flex-col">
                    <span className="font-extrabold text-slate-700 leading-tight">Operations Daily Report</span>
                    <span className="text-[10px] text-gray-400 mt-0.5 leading-snug">Compile all completed cases into a daily PDF log digest.</span>
                  </div>
                </label>
              </div>

            </div>
          </div>

          {/* Save Action Block */}
          <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-3xl flex flex-col gap-3">
            <h4 className="text-[11.5px] font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-500" /> Administrative Security
            </h4>
            <p className="text-[10.5px] text-slate-500 leading-normal">
              Changing system parameters alters the polling latency and coordinates refresh cycles for telecallers and ambulance devices.
            </p>
            <button
              type="submit"
              className="w-full h-11 bg-blue-600 hover:bg-blue-750 text-white rounded-xl text-[12.5px] font-black flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.98] cursor-pointer mt-1"
            >
              <Save className="w-4 h-4" />
              <span>Save System Variables</span>
            </button>
          </div>

        </div>

      </form>

    </div>
  );
}
