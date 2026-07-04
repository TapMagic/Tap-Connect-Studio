"use client";

import React, { useState } from 'react';

// Enterprise Data Structures
interface LocationItem {
  id: string;
  name: string;
  address: string;
  phone: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  locationId: string;
  assignedTagId: string;
}

interface NFCDevice {
  id: string;
  serialNumber: string;
  type: 'Key Fob' | 'Card' | 'Counter Stand';
  currentRouting: 'location_profile' | 'team_member' | 'custom_url';
  targetId: string;
}

export default function EnterpriseDashboard() {
  const [locations, setLocations] = useState<LocationItem[]>([
    { id: 'loc-1', name: 'Main Headquarters', address: 'Ocala, FL', phone: '352-555-0199' },
    { id: 'loc-2', name: 'Downtown Branch', address: 'Gainesville, FL', phone: '352-555-0122' }
  ]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('loc-1');
  const [team, setTeam] = useState<TeamMember[]>([
    { id: 'mem-1', name: 'Alex Mercer', role: 'Security Supervisor', locationId: 'loc-1', assignedTagId: 'nfc-2' },
    { id: 'mem-2', name: 'Sarah Jenkins', role: 'Client Relations', locationId: 'loc-1', assignedTagId: 'none' },
    { id: 'mem-3', name: 'Marcus Vance', role: 'Field Operations', locationId: 'loc-2', assignedTagId: 'none' }
  ]);
  const [devices, setDevices] = useState<NFCDevice[]>([
    { id: 'nfc-1', serialNumber: 'NTAG424-00A91X', type: 'Counter Stand', currentRouting: 'location_profile', targetId: 'loc-1' },
    { id: 'nfc-2', serialNumber: 'NTAG424-00B24Z', type: 'Key Fob', currentRouting: 'team_member', targetId: 'mem-1' }
  ]);
  const [activeTab, setActiveTab] = useState<'locations' | 'team' | 'nfc'>('locations');

  const currentLocDetails = locations.find(l => l.id === selectedLocationId);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-[#f8fafc] p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-extrabold text-white">TapConnect Studio Enterprise Panel</h1>
        
        <div className="flex gap-4 border-b border-[#1e293b] pb-2">
          {(['locations', 'team', 'nfc'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`capitalize ${activeTab === tab ? 'text-[#22c55e]' : 'text-[#94a3b8]'}`}>
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'locations' && (
          <div className="bg-[#131a26] p-6 rounded-xl border border-[#1e293b]">
            <h2 className="text-xl font-bold mb-4">{currentLocDetails?.name} Details</h2>
            <p className="text-[#94a3b8]">Address: {currentLocDetails?.address}</p>
            <p className="text-[#94a3b8]">Phone: {currentLocDetails?.phone}</p>
          </div>
        )}
      </div>
    </div>
  );
}