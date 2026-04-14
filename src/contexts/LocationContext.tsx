import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AILocationData {
  areaDescription: string;
  popularFood: string;
  mealSuggestion: string;
}

interface LocationState {
  areaName: string;
  addressLine: string;
  coordinates: [number, number];
  accuracy?: number;
  suburb?: string;
  city?: string;
  aiData?: AILocationData;
  permissionDenied?: boolean;
  isLocating?: boolean;
}

interface LocationContextType {
  location: LocationState;
  setLocation: (loc: Partial<LocationState>) => void;
  refreshLocation: () => void;
}

const defaultLocation: LocationState = {
  areaName: 'Jubilee Hills',
  addressLine: 'Hyderabad, Telangana',
  coordinates: [17.4326, 78.4071],
  isLocating: false,
};

const LocationContext = createContext<LocationContextType>({} as LocationContextType);

export const useLocationInfo = () => useContext(LocationContext);

export const LocationProvider = ({ children }: { children: React.ReactNode }) => {
  const [location, setLocationState] = useState<LocationState>(() => {
    const saved = localStorage.getItem('tastytrail_location');
    if (saved) {
      try { return { ...JSON.parse(saved), isLocating: false }; }
      catch { return defaultLocation; }
    }
    return defaultLocation;
  });

  const setLocation = (partial: Partial<LocationState>) => {
    setLocationState(prev => {
      const next = { ...prev, ...partial };
      localStorage.setItem('tastytrail_location', JSON.stringify(next));
      return next;
    });
  };

  const reverseGeocode = useCallback(async (lat: number, lng: number, accuracy: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      const data = await res.json();
      const addr = data.address || {};
      const suburb = addr.neighbourhood || addr.suburb || addr.village || '';
      const city = addr.city || addr.town || addr.county || 'Hyderabad';
      const areaName = suburb || city;
      
      setLocation({ 
        areaName, 
        addressLine: `${suburb ? suburb + ', ' : ''}${city}, ${addr.state || 'Telangana'}`, 
        suburb, 
        city, 
        coordinates: [lat, lng], 
        accuracy,
        aiData: {
          areaDescription: (suburb ? suburb + ', ' : '') + city,
          popularFood: 'Local cuisine',
          mealSuggestion: 'Enjoy a meal near you'
        },
        isLocating: false
      });
    } catch {
      setLocation({ coordinates: [lat, lng], accuracy, isLocating: false });
    }
  }, []);

  const refreshLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation({ permissionDenied: true, isLocating: false });
      return;
    }
    setLocation({ isLocating: true });
    navigator.geolocation.getCurrentPosition(
      pos => reverseGeocode(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
      () => setLocation({ permissionDenied: true, isLocating: false }),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [reverseGeocode]);

  // Start watching on mount
  useEffect(() => {
    if (!navigator.geolocation) return;
    setLocation({ isLocating: true });
    const watchId = navigator.geolocation.watchPosition(
      pos => reverseGeocode(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
      () => setLocation({ permissionDenied: true, isLocating: false }),
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [reverseGeocode]);

  return (
    <LocationContext.Provider value={{ location, setLocation, refreshLocation }}>
      {children}
    </LocationContext.Provider>
  );
};
