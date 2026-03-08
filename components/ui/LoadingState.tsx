export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
      {message}
    </div>
  )
}
