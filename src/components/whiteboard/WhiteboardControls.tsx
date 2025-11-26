import { useState } from 'react';

interface WhiteboardControlsProps {
  currentTool: 'marker' | 'eraser';
  currentColor: string;
  robotWidth: number;
  robotHeight: number;
  onToolChange: (tool: 'marker' | 'eraser') => void;
  onColorChange: (color: string) => void;
  onRobotSizeChange: (width: number, height: number) => void;
}

export default function WhiteboardControls({
  currentTool,
  currentColor,
  robotWidth,
  robotHeight,
  onToolChange,
  onColorChange,
  onRobotSizeChange,
}: WhiteboardControlsProps) {
  const [colorPickerExpanded, setColorPickerExpanded] = useState(false);
  const [colorPickerClosing, setColorPickerClosing] = useState(false);
  const [showRobotConfig, setShowRobotConfig] = useState(false);
  const [width, setWidth] = useState(Math.round(robotWidth / 25.4).toString());
  const [height, setHeight] = useState(Math.round(robotHeight / 25.4).toString());

  const colors = [
    { name: 'white', value: '#ffffff' },
    { name: 'red', value: '#ef4444' },
    { name: 'blue', value: '#3b82f6' },
    { name: 'green', value: '#22c55e' },
    { name: 'yellow', value: '#eab308' },
  ];

  const handleWidthChange = (value: string) => {
    setWidth(value);
    const w = parseFloat(value);
    const h = parseFloat(height);
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      onRobotSizeChange(w * 25.4, h * 25.4);
    }
  };

  const handleHeightChange = (value: string) => {
    setHeight(value);
    const w = parseFloat(width);
    const h = parseFloat(value);
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      onRobotSizeChange(w * 25.4, h * 25.4);
    }
  };

  const cycleTool = () => {
    const tools: ('marker' | 'eraser')[] = ['marker', 'eraser'];
    const currentIndex = tools.indexOf(currentTool);
    const nextIndex = (currentIndex + 1) % tools.length;
    onToolChange(tools[nextIndex]);
  };

  const handleColorClick = (color: string) => {
    if (!colorPickerExpanded) {
      // Expand the color picker
      setColorPickerExpanded(true);
    } else {
      // Change the color
      onColorChange(color);
    }
  };

  const handleColorClose = () => {
    setColorPickerClosing(true);
    setTimeout(() => {
      setColorPickerExpanded(false);
      setColorPickerClosing(false);
    }, 300);
  };

  return (
    <>
      {/* Tool Selector (bottom right) */}
      <div
        id="whiteboard-draw-config"
        className="absolute flex flex-col justify-center items-center size-12 sm:size-14 md:size-16 lg:size-20 xl:size-24 bottom-2 sm:bottom-3 md:bottom-4 right-2 sm:right-3 md:right-4 bg-zinc-800 rounded-full glass-card cursor-pointer"
        onClick={cycleTool}
      >
        <i
          id="whiteboard-draw-config-marker"
          className="fa fa-pencil text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl text-white"
          style={{ display: currentTool === 'marker' ? 'block' : 'none' }}
        ></i>
        <i
          id="whiteboard-draw-config-eraser"
          className="fa fa-eraser text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl text-white"
          style={{ display: currentTool === 'eraser' ? 'block' : 'none' }}
        ></i>
      </div>

      {/* Color Picker (bottom left) */}
      <div
        id="whiteboard-color-config"
        className={`absolute flex flex-col justify-center items-center bottom-2 sm:bottom-3 md:bottom-4 left-2 sm:left-3 md:left-4 bg-zinc-800 rounded-full glass-card p-1.5 sm:p-2 transition-opacity duration-300 ${colorPickerClosing ? 'color-picker-hidden' : ''}`}
      >
        <div
          id="whiteboard-color-white"
          className={`size-6 sm:size-8 md:size-10 lg:size-12 xl:size-16 m-1 sm:m-1.5 md:m-2 bg-white rounded-full cursor-pointer ${
            !colorPickerExpanded && currentColor === '#ffffff' ? 'block' : colorPickerExpanded ? 'block' : 'hidden'
          } ${currentColor === '#ffffff' && colorPickerExpanded ? 'border-4 border-amber-500' : ''}`}
          onClick={() => handleColorClick('#ffffff')}
        ></div>
        <div
          id="whiteboard-color-red"
          className={`size-6 sm:size-8 md:size-10 lg:size-12 xl:size-16 m-1 sm:m-1.5 md:m-2 bg-red-500 rounded-full cursor-pointer ${
            !colorPickerExpanded && currentColor === '#ef4444' ? 'block' : colorPickerExpanded ? 'block' : 'hidden'
          } ${currentColor === '#ef4444' && colorPickerExpanded ? 'border-4 border-amber-500' : ''}`}
          onClick={() => handleColorClick('#ef4444')}
        ></div>
        <div
          id="whiteboard-color-blue"
          className={`size-6 sm:size-8 md:size-10 lg:size-12 xl:size-16 m-1 sm:m-1.5 md:m-2 bg-blue-500 rounded-full cursor-pointer ${
            !colorPickerExpanded && currentColor === '#3b82f6' ? 'block' : colorPickerExpanded ? 'block' : 'hidden'
          } ${currentColor === '#3b82f6' && colorPickerExpanded ? 'border-4 border-amber-500' : ''}`}
          onClick={() => handleColorClick('#3b82f6')}
        ></div>
        <div
          id="whiteboard-color-green"
          className={`size-6 sm:size-8 md:size-10 lg:size-12 xl:size-16 m-1 sm:m-1.5 md:m-2 bg-green-500 rounded-full cursor-pointer ${
            !colorPickerExpanded && currentColor === '#22c55e' ? 'block' : colorPickerExpanded ? 'block' : 'hidden'
          } ${currentColor === '#22c55e' && colorPickerExpanded ? 'border-4 border-amber-500' : ''}`}
          onClick={() => handleColorClick('#22c55e')}
        ></div>
        <div
          id="whiteboard-color-yellow"
          className={`size-6 sm:size-8 md:size-10 lg:size-12 xl:size-16 m-1 sm:m-1.5 md:m-2 bg-yellow-500 rounded-full cursor-pointer ${
            !colorPickerExpanded && currentColor === '#eab308' ? 'block' : colorPickerExpanded ? 'block' : 'hidden'
          } ${currentColor === '#eab308' && colorPickerExpanded ? 'border-4 border-amber-600' : ''}`}
          onClick={() => handleColorClick('#eab308')}
        ></div>
        <div
          id="whiteboard-color-close"
          className={`size-6 sm:size-8 md:size-10 lg:size-12 xl:size-16 m-1 sm:m-1.5 md:m-2 flex justify-center items-center text-center rounded-full cursor-pointer ${colorPickerExpanded ? 'block' : 'hidden'}`}
          onClick={handleColorClose}
        >
          <i className="fa fa-close text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl text-red-500"></i>
        </div>
      </div>

      {/* Robot Configuration (top right, hidden by default) */}
      {showRobotConfig && (
        <div id="whiteboard-robot-config" className="absolute flex flex-col justify-center items-center w-64 h-36 top-12 right-0 bg-zinc-800 rounded-b-3xl glass-card">
          <div className="text-2xl text-zinc-400 font-bold mb-4 select-none">
            Robot Config (in.)
          </div>
          <div className="flex w-full justify-center items-center">
            <input
              id="whiteboard-robot-config-width"
              value={width}
              onChange={(e) => handleWidthChange(e.target.value)}
              placeholder="width"
              type="number"
              className="w-1/3 mr-4 text-3xl text-zinc-500 text-right outline-0 bg-transparent select-none touch-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <div className="text-3xl text-zinc-700 text-center outline-0">x</div>
            <input
              id="whiteboard-robot-config-height"
              value={height}
              onChange={(e) => handleHeightChange(e.target.value)}
              placeholder="length"
              type="number"
              className="w-1/3 ml-4 text-3xl text-zinc-500 text-left outline-0 bg-transparent select-none touch-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
            />
          </div>
        </div>
      )}
    </>
  );
}
