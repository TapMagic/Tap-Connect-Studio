// app/lib/nfc-utils.ts

export const getRoutingUrl = (
    type: string, 
    targetId: string, 
    securityLevel: 'public' | 'authenticated'
  ) => {
    // If it's the premium 424 DNA chip, we direct to a secure validation endpoint first
    if (securityLevel === 'authenticated') {
      return `/auth/verify?id=${targetId}`;
    }
  
    // Standard NTAG logic
    switch (type) {
      case 'location_profile':
        return `/location/${targetId}`;
      case 'team_member':
        return `/staff/${targetId}`;
      default:
        return '/';
    }
  };