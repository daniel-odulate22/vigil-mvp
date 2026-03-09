import { useState, ReactNode } from 'react';
import BottomNav from './BottomNav';
import OfflineBanner from './OfflineBanner';
import BarcodeScanner from './BarcodeScanner';
import VerifyModal from './VerifyModal';
import { useAuth } from '@/hooks/useAuth';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { savePendingDose, PendingDose } from '@/lib/offlineStore';

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isOnline } = useOfflineSync();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');

  const handleScanSuccess = (code: string) => {
    setScannedBarcode(code);
    setScannerOpen(false);
    setVerifyModalOpen(true);
  };

  const isManualEntry = (data: any): boolean => 'medication_name' in data;

  const handleConfirmDose = async (data: any) => {
    if (!user) return;

    const isManual = isManualEntry(data);
    const medicationName = isManual
      ? data.medication_name
      : (data.brand_name || data.generic_name || 'Unknown');

    const doseData = {
      user_id: user.id,
      medication_name: medicationName,
      verified: !isManual,
      taken_at: new Date().toISOString(),
    };

    try {
      if (isManual && isOnline) {
        await supabase.from('prescriptions').insert({
          user_id: user.id,
          medication_name: data.medication_name,
          manufacturer: data.manufacturer || null,
          ndc_code: data.ndc_code || null,
          dosage: data.dosage || null,
          frequency: data.frequency || null,
          instructions: data.instructions || null,
        });
      }

      if (isOnline) {
        await supabase.from('dose_logs').insert(doseData);
        toast({
          title: 'Dose logged!',
          description: isManual
            ? 'Your medication has been recorded and added to prescriptions.'
            : 'Your medication has been recorded.',
        });
      } else {
        const pendingDose: PendingDose = {
          id: crypto.randomUUID(),
          ...doseData,
          created_at: new Date().toISOString(),
        };
        await savePendingDose(pendingDose);
        toast({
          title: 'Saved offline',
          description: "Your dose will sync when you're back online.",
        });
      }

      setVerifyModalOpen(false);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to log dose', variant: 'destructive' });
    }
  };

  const handleAddToPrescriptions = async (data: any) => {
    if (!user) return;

    const isManual = isManualEntry(data);

    try {
      await supabase.from('prescriptions').insert({
        user_id: user.id,
        medication_name: isManual ? data.medication_name : (data.brand_name || data.generic_name || 'Unknown'),
        manufacturer: isManual ? (data.manufacturer || null) : (data.manufacturer_name || null),
        ndc_code: isManual ? (data.ndc_code || null) : (data.product_ndc || null),
        dosage: isManual ? (data.dosage || null) : (data.dosage_form || null),
        frequency: isManual ? (data.frequency || null) : null,
        instructions: isManual ? (data.instructions || null) : null,
      });
      toast({ title: 'Added!', description: 'Medication added to your prescriptions.' });
      setVerifyModalOpen(false);
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to add prescription', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <OfflineBanner />
      {children}
      <BottomNav onScanClick={() => setScannerOpen(true)} />
      <BarcodeScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
      <VerifyModal
        isOpen={verifyModalOpen}
        barcode={scannedBarcode}
        onClose={() => setVerifyModalOpen(false)}
        onConfirm={handleConfirmDose}
        onAddToPrescriptions={handleAddToPrescriptions}
      />
    </div>
  );
};

export default AppLayout;
