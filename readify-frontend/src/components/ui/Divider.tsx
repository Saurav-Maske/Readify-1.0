interface DividerProps {
  label?: string;
}

export function Divider({ label }: DividerProps) {
  if (!label) {
    return <div className="h-px w-full bg-gray-200" />;
  }

  return (
    <div className="flex items-center gap-4">
      <div className="h-px flex-1 bg-gray-200" />
      <span className="text-xs font-medium uppercase tracking-wider text-textSecondary">{label}</span>
      <div className="h-px flex-1 bg-gray-200" />
    </div>
  );
}
