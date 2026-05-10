import { useEffect, useState } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type UITexts = {
  welcome_message: string;
  payment_instruction: string;
  footer_text: string;
  ticket_button_copy: string;
};

const defaultTexts: UITexts = {
  welcome_message: "Welcome to NACOS Lottery",
  payment_instruction: "Make payment to the account below and upload your receipt.",
  footer_text: "NACOS © 2024. All rights reserved.",
  ticket_button_copy: "Copy Ticket Number"
};

export function useSettings() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        setSettings(doc.data());
      } else {
        setSettings({
          bankName: "Sample Bank",
          accountNumber: "0123456789",
          accountName: "NACOS Lottery Account",
          ticketPrice: 1000,
          uiTexts: defaultTexts
        });
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  return { settings, loading, uiTexts: settings?.uiTexts || defaultTexts };
}
