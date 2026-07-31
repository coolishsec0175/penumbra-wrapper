import { AlertTriangle } from 'lucide-react';

export function ConnectionWarning() {
  return (
    <div className="flex items-start gap-3 rounded-md border border-warning bg-warning-soft p-4">
      <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning" />
      <div>
        <h3 className="font-semibold text-warning">Not Connected</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Please connect to a device in the Dashboard before using these tools.
        </p>
      </div>
    </div>
  );
}
