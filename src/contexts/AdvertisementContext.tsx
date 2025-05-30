import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Advertisement {
  id: string;
  image_url: string;
  link: string;
  title?: string;
  description?: string;
  created_at: string;
  display_order: number;
}

interface AdvertisementContextType {
  advertisements: Advertisement[];
  setAdvertisements: React.Dispatch<React.SetStateAction<Advertisement[]>>;
}

const AdvertisementContext = createContext<AdvertisementContextType | undefined>(undefined);

export function AdvertisementProvider({ children }: { children: ReactNode }) {
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);

  return (
    <AdvertisementContext.Provider value={{ advertisements, setAdvertisements }}>
      {children}
    </AdvertisementContext.Provider>
  );
}

export function useAdvertisements() {
  const context = useContext(AdvertisementContext);
  if (context === undefined) {
    throw new Error('useAdvertisements must be used within an AdvertisementProvider');
  }
  return context;
}