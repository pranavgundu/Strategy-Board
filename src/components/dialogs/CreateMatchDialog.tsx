import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { useMatches } from '../../hooks/useMatches';

export default function CreateMatchDialog() {
  const { setShowCreateMatchDialog } = useStore();
  const { createMatch } = useMatches();

  const [matchName, setMatchName] = useState('');
  const [redOne, setRedOne] = useState('');
  const [redTwo, setRedTwo] = useState('');
  const [redThree, setRedThree] = useState('');
  const [blueOne, setBlueOne] = useState('');
  const [blueTwo, setBlueTwo] = useState('');
  const [blueThree, setBlueThree] = useState('');

  const handleCreate = async () => {
    await createMatch(matchName, redOne, redTwo, redThree, blueOne, blueTwo, blueThree);
    handleClose();
  };

  const handleClose = () => {
    setMatchName('');
    setRedOne('');
    setRedTwo('');
    setRedThree('');
    setBlueOne('');
    setBlueTwo('');
    setBlueThree('');
    setShowCreateMatchDialog(false);
  };

  return (
    <div className="absolute top-0 left-0 w-dvw h-dvh backdrop-blur-xs touch-none">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-between w-11/12 sm:w-3/4 md:w-2/3 lg:w-1/2 max-w-2xl bg-slate-600 rounded-2xl md:rounded-3xl glass-modal max-h-[90vh] overflow-y-auto">
        <input
          value={matchName}
          onChange={(e) => setMatchName(e.target.value)}
          placeholder="Match Name"
          maxLength={25}
          className="w-full pt-4 pb-4 sm:pt-6 sm:pb-6 text-xl sm:text-2xl md:text-3xl text-center text-slate-300 font-bold rounded-t-2xl md:rounded-t-3xl bg-slate-500 outline-0"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <div className="grid grid-cols-3 w-full">
          <input
            type="number"
            value={redOne}
            onChange={(e) => setRedOne(e.target.value)}
            placeholder="Red 1"
            className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-center text-red-400 p-2 sm:p-3 md:p-4 bg-slate-700 outline-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <input
            type="number"
            value={redTwo}
            onChange={(e) => setRedTwo(e.target.value)}
            placeholder="Red 2"
            className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-center text-red-400 p-2 sm:p-3 md:p-4 bg-slate-700 outline-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <input
            type="number"
            value={redThree}
            onChange={(e) => setRedThree(e.target.value)}
            placeholder="Red 3"
            className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-center text-red-400 p-2 sm:p-3 md:p-4 bg-slate-700 outline-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <input
            type="number"
            value={blueOne}
            onChange={(e) => setBlueOne(e.target.value)}
            placeholder="Blue 1"
            className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-center text-blue-400 p-2 sm:p-3 md:p-4 bg-slate-700 outline-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <input
            type="number"
            value={blueTwo}
            onChange={(e) => setBlueTwo(e.target.value)}
            placeholder="Blue 2"
            className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-center text-blue-400 p-2 sm:p-3 md:p-4 bg-slate-700 outline-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <input
            type="number"
            value={blueThree}
            onChange={(e) => setBlueThree(e.target.value)}
            placeholder="Blue 3"
            className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-center text-blue-400 p-2 sm:p-3 md:p-4 bg-slate-700 outline-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </div>
        <div className="flex w-full">
          <button
            onClick={handleCreate}
            className="w-1/2 text-center text-lg sm:text-xl md:text-2xl font-bold text-white bg-green-500 p-4 sm:p-5 md:p-6 rounded-bl-2xl md:rounded-bl-3xl glossy-shine"
          >
            Create
          </button>
          <button
            onClick={handleClose}
            className="w-1/2 text-center text-lg sm:text-xl md:text-2xl font-bold text-white bg-red-500 p-4 sm:p-5 md:p-6 rounded-br-2xl md:rounded-br-3xl glossy-shine"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
