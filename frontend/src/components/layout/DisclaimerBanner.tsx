import React from 'react';
import { AlertCircle, ShieldCheck } from 'lucide-react';

export const DisclaimerBanner: React.FC = () => {
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-center gap-2 text-center">
      <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <span>
        <strong>Medical Disclaimer:</strong> MediAssist AI provides informational assistance based on uploaded medical documents and NIDDK/NIH guidelines. It does not replace professional medical advice, diagnosis, or treatment. Always consult a qualified physician.
      </span>
    </div>
  );
};
