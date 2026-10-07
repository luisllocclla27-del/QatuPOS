import { Suspense } from 'react';
import { GuestAppDemo } from '@/components/guest-app-demo';

export default function ClientePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">
          Cargando carta...
        </div>
      }
    >
      <GuestAppDemo />
    </Suspense>
  );
}
