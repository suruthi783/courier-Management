import { useState, useEffect } from 'react';
import { socketService } from '@/services/socketService';
import { LocationUpdate, StatusUpdate, ShipmentStatus } from '@/types';

export function useLiveTracking(trackingId?: string) {
  const [location, setLocation] = useState<LocationUpdate | null>(null);
  const [status, setStatus]     = useState<ShipmentStatus | null>(null);
  const [eta, setEta]           = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(socketService.isConnected());

  useEffect(() => {
    if (!trackingId) return;

    const token = localStorage.getItem('auth-token');
    if (!token) return;

    const ensureConnected = async () => {
      if (!socketService.isConnected()) {
        await socketService.connect(token);
      }
      setIsConnected(true);
    };

    ensureConnected().catch(console.error);

    const unsubLocation = socketService.subscribe(
      `shipment.${trackingId}.location`,
      (event) => {
        const loc = event.payload as LocationUpdate;
        setLocation(loc);
        setEta(`${Math.floor(Math.random() * 20) + 5} mins`);
      }
    );

    const unsubStatus = socketService.subscribe(
      `shipment.${trackingId}.status`,
      (event) => {
        const stat = event.payload as StatusUpdate;
        setStatus(stat.newStatus);
      }
    );

    return () => {
      unsubLocation();
      unsubStatus();
    };
  }, [trackingId]);

  return { location, status, eta, isConnected };
}
