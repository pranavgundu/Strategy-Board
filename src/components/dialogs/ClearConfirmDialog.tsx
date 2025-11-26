import { useStore } from '../../store/useStore';
import { CLEAR } from '../../db';

export default function ClearConfirmDialog() {
  const { setShowClearConfirmDialog } = useStore();

  const handleClear = () => {
    CLEAR();
    window.location.reload();
  };

  return (
    <div className="absolute top-0 left-0 w-dvw h-dvh backdrop-blur-xs touch-none z-50">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-between w-11/12 sm:w-3/4 md:w-2/3 lg:w-1/2 max-w-xl bg-slate-600 rounded-2xl md:rounded-3xl glass-modal overflow-hidden">
        <div className="w-full pt-6 pb-4 text-xl sm:text-2xl md:text-3xl text-center text-slate-200 font-bold">
          Clear All Data?
        </div>
        <div className="w-full px-6 sm:px-8 md:px-10 pb-6 text-base sm:text-lg text-center text-slate-300">
          This will permanently delete all matches and data. This action cannot be undone.
        </div>
        <div className="flex w-full">
          <button
            onClick={() => setShowClearConfirmDialog(false)}
            className="w-1/2 text-center text-lg sm:text-xl md:text-2xl font-bold text-white bg-blue-500 p-4 sm:p-5 md:p-6 rounded-bl-2xl md:rounded-bl-3xl glossy-shine hover:bg-blue-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleClear}
            className="w-1/2 text-center text-lg sm:text-xl md:text-2xl font-bold text-white bg-red-500 p-4 sm:p-5 md:p-6 rounded-br-2xl md:rounded-br-3xl glossy-shine hover:bg-red-600 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
}
