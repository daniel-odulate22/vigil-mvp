import { useState, ReactNode } from 'react';
import BottomNav from './BottomNav';
import OfflineBanner from './OfflineBanner';
import BarcodeScanner from './BarcodeScanner';
import VerifyModal from './VerifyModal';
import DrugAssistant from './DrugAssistant';
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
  const [assistantOpen, setAssistantOpen] = useState(false);

  const handleScanSuccess = (code: string) => {
    setScannedBarcode(code);
    setScannerOpen(false);
    setVerifyModalOpen(true);
  };

  const isManualEntry = (data: any): boolean => 'medication_name' in data;

  const handleConfirmDose = async (data: any) => {
    if (!user) return;
    const isManual = isManualEntry(data);
    const medicationName = isManual ? data.medication_name : (data.brand_name || data.generic_name || 'Unknown');
    const doseData = { user_id: user.id, medication_name: medicationName, verified: !isManual, taken_at: new Date().toISOString() };

    try {
      if (isManual && isOnline) {
        await supabase.from('prescriptions').insert({
          user_id: user.id, medication_name: data.medication_name,
          manufacturer: data.manufacturer || null, ndc_code: data.ndc_code || null,
          dosage: data.dosage || null, frequency: data.frequency || null, instructions: data.instructions || null,
        });
      }
      if (isOnline) {
        await supabase.from('dose_logs').insert(doseData);
        toast({ title: 'Dose logged!', description: isManual ? 'Your medication has been recorded and added to prescriptions.' : 'Your medication has been recorded.' });
      } else {
        const pendingDose: PendingDose = { id: crypto.randomUUID(), ...doseData, created_at: new Date().toISOString() };
        await savePendingDose(pendingDose);
        toast({ title: 'Saved offline', description: "Your dose will sync when you're back online." });
      }
      setVerifyModalOpen(false);
    } catch {
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
    } catch {
      toast({ title: 'Error', description: 'Failed to add prescription', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <OfflineBanner />
      {children}
      <BottomNav onScanClick={() => setScannerOpen(true)} />
      <BarcodeScanner isOpen={scannerOpen} onClose={() => setScannerOpen(false)} onScanSuccess={handleScanSuccess} />
      <VerifyModal isOpen={verifyModalOpen} barcode={scannedBarcode} onClose={() => setVerifyModalOpen(false)} onConfirm={handleConfirmDose} onAddToPrescriptions={handleAddToPrescriptions} />
      <DrugAssistant isOpen={assistantOpen} onClose={() => setAssistantOpen(false)} />
      {!assistantOpen && !scannerOpen && (
        <button
          onClick={() => setAssistantOpen(true)}
          className="fixed bottom-24 right-4 z-40 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 transition-transform"
          aria-label="Ask Vigil AI"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>
        </button>
      )}
    </div>
  );
};

export default AppLayout;
