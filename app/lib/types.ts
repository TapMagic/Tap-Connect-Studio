export interface Location {
    id: string;
    name: string;
    address: string;
    phone: string;
  }
  
  export interface NFCDevice {
    id: string;
    serialNumber: string;
    type: 'Key Fob' | 'Card' | 'Counter Stand';
    currentRouting: string;
    targetId: string;
    securityLevel: 'public' | 'authenticated';
  }