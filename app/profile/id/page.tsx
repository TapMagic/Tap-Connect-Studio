"use client";

import React from 'react';
import { motion } from 'framer-motion'; // We'll assume framer-motion is available in your package.json

// --- Premium UI Components ---

// A sophisticated glassmorphism card container
const PremiumCard = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, ease: "easeOut" }}
    className="w-full max-w-md bg-[#131a26]/70 backdrop-blur-xl border border-[#1e293b] rounded-3xl p-8 shadow-2xl shadow-black/20 relative overflow-hidden"
  >
    {/* Subtle animated border glow effect */}
    <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#1e293b] to-transparent opacity-50" />
    <div className="absolute -inset-px rounded-3xl bg-gradient-to-r from-transparent via-[#22c55e]/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
    
    {children}
  </motion.div>
);

// A premium button with a neon-green micro-interaction
const PremiumButton = ({ children, primary = false }: { children: React.ReactNode, primary?: boolean }) => {
  const baseClass = "w-full font-bold py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 text-sm transform active:scale-[0.98]";
  const primaryClass = primary 
    ? "bg-[#22c55e] text-[#052e16] shadow-lg shadow-[#22c55e]/10 hover:bg-[#16a34a] hover:shadow-[#22c55e]/20" 
    : "bg-[#0b0f19] border border-[#1e293b] text-white hover:border-[#22c55e]/30 hover:bg-[#1e293b]/50";

  return (
    <motion.button
      whileHover={{ y: -2 }}
      className={`${baseClass} ${primaryClass}`}
    >
      {children}
    </motion.button>
  );
};

// --- Main Profile Page Component ---

export default function PremiumProfilePage({ params }: { params: { id: string } }) {
  // MOCK DATA - Eventually, this will be fetched from your API/Database based on [id]
  // This demonstrates support for rich content scenarios.
  const profileData = {
    name: "Ascend Security Group",
    title: "Premium Corporate HQ",
    logo: "🏢", // Placeholder for a high-res image/logo
    bio: "Enterprise-grade physical and digital security solutions. Serving the Fortune 500.",
    address: "1200 Quantum Blvd, Suite 50, Ocala, FL", // Specific to a LOCATION profile
    hours: "Mon-Fri: 9:00 AM - 5:00 PM",
    mapUrl: "https://www.google.com/maps/embed?pb=..." // Placeholder for map embed
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-[#f8fafc] flex flex-col items-center py-16 px-6 font-sans relative">
      
      {/* Premium Background Element: A subtle, blurred radial gradient ring */}
      <div className="absolute top-[-10%] left-1/2 transform -translate-x-1/2 w-[800px] h-[800px] bg-gradient-radial from-[#1e293b] via-[#0b0f19] to-[#0b0f19] opacity-20 rounded-full -z-10 blur-3xl" />

      <PremiumCard>
        {/* Header/Logo Area */}
        <div className="flex flex-col items-center text-center mb-8 relative">
          {/* Premium Logo Container with glow */}
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#1e293b] to-[#0b0f19] border-4 border-[#1e293b] mb-6 shadow-[0_0_30px_rgba(34,197,94,0.15)] flex items-center justify-center text-5xl relative group">
            {/* Animated ring spinner on hover for super-premium feel */}
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#22c55e]/20 group-hover:animate-spin-slow" />
            {profileData.logo}
          </div>
          
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-[#94a3b8]">
            {profileData.name}
          </h1>
          <p className="text-[#22c55e] text-xs uppercase tracking-widest font-medium mt-1">{profileData.title}</p>
          
          {/* Location Meta Data (Optional, displayed if it's a location profile) */}
          <div className="mt-4 p-3 bg-[#0b0f19]/50 rounded-xl border border-[#1e293b] text-xs text-[#94a3b8] max-w-xs">
            <p className="font-medium text-white">📍 {profileData.address}</p>
            <p className="mt-1 text-[#94a3b8]">🕒 {profileData.hours}</p>
          </div>
        </div>

        <p className="text-[#d1d5db] text-center mb-10 leading-relaxed px-2">
          {profileData.bio}
        </p>

        {/* Action Buttons Container */}
        <div className="space-y-4 mb-10">
          <PremiumButton primary={true}>
            📞 Call Security HQ
          </PremiumButton>
          <PremiumButton>
            🌐 Visit Main Website
          </PremiumButton>
          <PremiumButton>
            📧 Contact Operations
          </PremiumButton>
          <PremiumButton>
            📍 Get Directions
          </PremiumButton>
        </div>

        {/* Premium Extra Content Block (e.g., Embedded Map) */}
        <div className="mt-10 pt-8 border-t border-[#1e293b]">
          <p className="text-center text-xs font-mono text-[#94a3b8] uppercase mb-3 tracking-wider">Interactive Location Map</p>
          <div className="w-full h-48 bg-[#0b0f19] rounded-2xl border-4 border-[#1e293b] overflow-hidden shadow-inner">
             {/* Map Embed Placeholder - In production, this would be a real <iframe> */}
             <div className="w-full h-full flex items-center justify-center text-sm text-[#1e293b] bg-[#131a26]/50">
               Embedded Map Loading...
             </div>
          </div>
        </div>

      </PremiumCard>

      {/* Footer Branding */}
      <p className="mt-12 text-[10px] text-[#1e293b] tracking-widest uppercase">
        Secured by TapConnect Enterprise
      </p>

    </div>
  );
}