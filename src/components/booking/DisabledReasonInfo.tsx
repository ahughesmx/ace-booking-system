
interface DisabledReasonInfoProps {
  disabledReason: string | null;
  isAuthenticated: boolean;
}

export function DisabledReasonInfo({ disabledReason, isAuthenticated }: DisabledReasonInfoProps) {
  if (!disabledReason || !isAuthenticated) return null;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
      <p className="text-sm text-yellow-800">
        <span className="font-medium">Información:</span> {disabledReason}
      </p>
    </div>
  );
}
