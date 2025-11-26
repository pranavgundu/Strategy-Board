import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Match, PhaseData } from '../match';

type MatchSnapshot = {
  auto: PhaseData;
  teleop: PhaseData;
  endgame: PhaseData;
  notes: PhaseData;
};

const MAX_HISTORY_ENTRIES = 150;

const clonePhase = (phase: PhaseData): PhaseData =>
  JSON.parse(JSON.stringify(phase)) as PhaseData;

const snapshotMatch = (source: Match): MatchSnapshot => ({
  auto: clonePhase(source.auto),
  teleop: clonePhase(source.teleop),
  endgame: clonePhase(source.endgame),
  notes: clonePhase(source.notes),
});

const restoreMatchFromSnapshot = (
  target: Match,
  snapshot: MatchSnapshot,
): void => {
  target.auto = clonePhase(snapshot.auto);
  target.teleop = clonePhase(snapshot.teleop);
  target.endgame = clonePhase(snapshot.endgame);
  target.notes = clonePhase(snapshot.notes);
};
import { useMatches } from '../hooks/useMatches';
import BackgroundCanvas from '../components/whiteboard/BackgroundCanvas';
import ItemsCanvas from '../components/whiteboard/ItemsCanvas';
import DrawingCanvas from '../components/whiteboard/DrawingCanvas';
import WhiteboardControls from '../components/whiteboard/WhiteboardControls';

type Mode = 'auto' | 'teleop' | 'endgame' | 'notes';

export default function WhiteboardPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { matches } = useStore();
  const { updateMatch } = useMatches();

  const [match, setMatch] = useState<Match | null>(null);
  const [mode, setMode] = useState<Mode>('auto');
  const [currentTool, setCurrentTool] = useState<'marker' | 'eraser'>('marker');
  const [currentColor, setCurrentColor] = useState('#ffffff');
  const [selectedRobot, setSelectedRobot] = useState<string | null>(null);
  const [robotWidth, setRobotWidth] = useState(152.4); // 6 inches in mm
  const [robotHeight, setRobotHeight] = useState(152.4);
  const [currentView, setCurrentView] = useState<'full' | 'red' | 'blue'>('full');
  const [renderTrigger, setRenderTrigger] = useState(0);
  const historyRef = useRef<{ undo: MatchSnapshot[]; redo: MatchSnapshot[] }>({ undo: [], redo: [] });

  // Camera and viewport state
  const [cameraX, setCameraX] = useState(1755); // Center of field
  const [cameraY, setCameraY] = useState(805);
  const [scaling, setScaling] = useState(1);
  const [leftOffset, setLeftOffset] = useState(0);
  const [topOffset, setTopOffset] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    historyRef.current.undo = [];
    historyRef.current.redo = [];
  }, [matchId]);


  // Canvas dimensions
  const CANVAS_WIDTH = 3510;
  const CANVAS_HEIGHT = 1610;

  useEffect(() => {
    const foundMatch = matches.find((m) => m.id === matchId);
    if (foundMatch) {
      setMatch(foundMatch);
    } else {
      navigate('/');
    }
  }, [matchId, matches, navigate]);

  // Handle viewport resize with fixed size calculation (matches original updateCanvasSize)
  useEffect(() => {
    const handleResize = () => {
      const wrapper = containerRef.current;
      if (!wrapper) return;

      const fillWidth = wrapper.clientWidth;
      const fillHeight = wrapper.clientHeight;

      const ratioWidth = fillWidth / CANVAS_WIDTH;
      const ratioHeight = fillHeight / CANVAS_HEIGHT;

      // Apply zoom factor to add padding (0.95 = 5% padding on each side)
      const scale = Math.min(ratioWidth, ratioHeight) * 0.95;

      const scaledWidth = CANVAS_WIDTH * scale;
      const scaledHeight = CANVAS_HEIGHT * scale;

      const left = (fillWidth - scaledWidth) / 2;
      const top = (fillHeight - scaledHeight) / 2;

      setScaling(scale);
      setLeftOffset(left);
      setTopOffset(top);
    };

    // Use setTimeout to ensure container is mounted and has dimensions
    const timer = setTimeout(handleResize, 0);

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Auto-save when match changes
  useEffect(() => {
    if (match && matchId) {
      const timeoutId = setTimeout(() => {
        updateMatch(matchId);
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [match, matchId, updateMatch, renderTrigger]);

  const pushUndoSnapshot = useCallback((snapshot: MatchSnapshot) => {
    const history = historyRef.current;
    history.undo.push(snapshot);
    if (history.undo.length > MAX_HISTORY_ENTRIES) {
      history.undo.shift();
    }
  }, []);

  const pushRedoSnapshot = useCallback((snapshot: MatchSnapshot) => {
    const history = historyRef.current;
    history.redo.push(snapshot);
    if (history.redo.length > MAX_HISTORY_ENTRIES) {
      history.redo.shift();
    }
  }, []);

  const handleHistoryCheckpoint = useCallback(() => {
    if (!match) return;
    pushUndoSnapshot(snapshotMatch(match));
    historyRef.current.redo = [];
  }, [match, pushUndoSnapshot]);


  const handleRobotPositionChange = useCallback(
    (robot: string, x: number, y: number) => {
      if (!match) return;

      const phaseData = match[mode];
      const robotKey = `${robot}Robot` as keyof typeof phaseData;

      if (phaseData[robotKey] && typeof phaseData[robotKey] === 'object') {
        const robotData = phaseData[robotKey] as any;
        robotData.x = x;
        robotData.y = y;
        setRenderTrigger((prev) => prev + 1);
      }
    },
    [match, mode],
  );

  const handleRobotRotationChange = useCallback(
    (robot: string, rotation: number) => {
      if (!match) return;

      const phaseData = match[mode];
      const robotKey = `${robot}Robot` as keyof typeof phaseData;

      if (phaseData[robotKey] && typeof phaseData[robotKey] === 'object') {
        const robotData = phaseData[robotKey] as any;
        robotData.r = rotation;
        setRenderTrigger((prev) => prev + 1);
      }
    },
    [match, mode],
  );

  const handleDrawingChange = useCallback(
    (changedMode: Mode) => {
      if (!match) return;
      // Force re-render
      setRenderTrigger((prev) => prev + 1);
    },
    [match],
  );

  const handleUndo = useCallback(() => {
    if (!match) return;
    const history = historyRef.current;
    const snapshot = history.undo.pop();
    if (!snapshot) return;

    pushRedoSnapshot(snapshotMatch(match));
    restoreMatchFromSnapshot(match, snapshot);
    setRenderTrigger((prev) => prev + 1);
  }, [match, pushRedoSnapshot]);

  const handleRedo = useCallback(() => {
    if (!match) return;
    const history = historyRef.current;
    const snapshot = history.redo.pop();
    if (!snapshot) return;

    pushUndoSnapshot(snapshotMatch(match));
    restoreMatchFromSnapshot(match, snapshot);
    setRenderTrigger((prev) => prev + 1);
  }, [match, pushUndoSnapshot]);

  const handleRobotSizeChange = useCallback((width: number, height: number) => {
    setRobotWidth(width);
    setRobotHeight(height);
  }, []);

  const toggleView = useCallback(() => {
    const CAMERA_PRESETS = {
      full: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
      red: { x: (3 * CANVAS_WIDTH) / 4, y: CANVAS_HEIGHT / 2 },
      blue: { x: CANVAS_WIDTH / 4, y: CANVAS_HEIGHT / 2 },
    };

    let newView: 'full' | 'red' | 'blue';
    if (currentView === 'full') {
      newView = 'red';
    } else if (currentView === 'red') {
      newView = 'blue';
    } else {
      newView = 'full';
    }

    setCurrentView(newView);
    setCameraX(CAMERA_PRESETS[newView].x);
    setCameraY(CAMERA_PRESETS[newView].y);
  }, [currentView, CANVAS_WIDTH, CANVAS_HEIGHT]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if (key === 'y') {
        event.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Export PNG functionality
  useEffect(() => {
    const exportPNG = (filename: string) => {
      const bgCanvas = document.getElementById('whiteboard-canvas-background') as HTMLCanvasElement;
      const itemsCanvas = document.getElementById('whiteboard-canvas-items') as HTMLCanvasElement;
      const drawingCanvas = document.getElementById('whiteboard-canvas-drawing') as HTMLCanvasElement;

      if (!bgCanvas || !itemsCanvas || !drawingCanvas) {
        console.error('Canvases not found for PNG export');
        return;
      }

      // Create a temporary canvas to combine all layers
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = CANVAS_WIDTH;
      tempCanvas.height = CANVAS_HEIGHT;
      const ctx = tempCanvas.getContext('2d');

      if (!ctx) {
        console.error('Failed to get 2D context for export');
        return;
      }

      // Draw all layers in order
      ctx.drawImage(bgCanvas, 0, 0);
      ctx.drawImage(itemsCanvas, 0, 0);
      ctx.drawImage(drawingCanvas, 0, 0);

      // Convert to blob and download
      tempCanvas.toBlob((blob) => {
        if (!blob) {
          console.error('Failed to create blob from canvas');
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Navigate back after successful download
        setTimeout(() => navigate('/'), 100);
      }, 'image/png');
    };

    // Attach to window
    (window as any).exportPNG = exportPNG;

    // Check for pending PNG export
    const pendingExport = sessionStorage.getItem('pendingPNGExport');
    if (pendingExport) {
      sessionStorage.removeItem('pendingPNGExport');
      // Wait for canvases to render
      setTimeout(() => {
        exportPNG(pendingExport);
      }, 500);
    }

    return () => {
      delete (window as any).exportPNG;
    };
  }, [navigate]);

  if (!match) {
    return (
      <div className="flex items-center justify-center w-dvw h-dvh bg-zinc-900 text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col w-dvw h-dvh touch-none bg-zinc-900">
      {/* Toolbar */}
      <div id="whiteboard-toolbar" className="glass-toolbar">
        <div className="toolbar-left">
          <button
            id="whiteboard-toolbar-back"
            onClick={() => navigate('/')}
            className="text-sm md:text-lg font-bold text-white select-none touch-none rounded-xl px-4 py-2 bg-purple-500 glass-button glossy-shine"
          >
            BACK
          </button>
          <button
            id="whiteboard-toolbar-undo"
            onClick={handleUndo}
            className="text-sm md:text-lg font-bold text-white select-none touch-none rounded-xl px-4 py-2 bg-orange-500 glass-button glossy-shine"
          >
            UNDO
          </button>
        </div>

        <div id="whiteboard-toolbar-mode-select" className="toolbar-center">
          <div
            id="whiteboard-toolbar-mode-auto"
            onClick={() => setMode('auto')}
            className={mode === 'auto' ? 'text-zinc-100 font-extrabold' : 'text-zinc-300'}
          >
            AUTO
          </div>
          <div
            id="whiteboard-toolbar-mode-teleop"
            onClick={() => setMode('teleop')}
            className={mode === 'teleop' ? 'text-zinc-100 font-extrabold' : 'text-zinc-300'}
          >
            TELEOP
          </div>
          <div
            id="whiteboard-toolbar-mode-endgame"
            onClick={() => setMode('endgame')}
            className={mode === 'endgame' ? 'text-zinc-100 font-extrabold' : 'text-zinc-300'}
          >
            ENDGAME
          </div>
          <div
            id="whiteboard-toolbar-mode-notes"
            onClick={() => setMode('notes')}
            className={mode === 'notes' ? 'text-zinc-100 font-extrabold' : 'text-zinc-300'}
          >
            NOTES
          </div>
        </div>

        <div className="toolbar-right">
          <button
            id="whiteboard-toolbar-view-toggle"
            onClick={toggleView}
            className="text-sm md:text-lg font-bold text-white select-none touch-none rounded-xl px-4 py-2 bg-purple-500 glass-button glossy-shine"
          >
            TOGGLE VIEW
          </button>
        </div>
      </div>

      {/* Whiteboard Area */}
      <div
        id="whiteboard-wrapper"
        ref={containerRef}
        className="w-full flex-1 min-h-0 m-0 p-0 bg-zinc-900"
      >
        {/* Background Canvas */}
        <BackgroundCanvas
          match={match}
          mode={mode}
          cameraX={cameraX}
          cameraY={cameraY}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          scaling={scaling}
          leftOffset={leftOffset}
          topOffset={topOffset}
        />

        {/* Items Canvas (Robots) */}
        <ItemsCanvas
          match={match}
          mode={mode}
          cameraX={cameraX}
          cameraY={cameraY}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          scaling={scaling}
          leftOffset={leftOffset}
          topOffset={topOffset}
          robotWidth={robotWidth}
          robotHeight={robotHeight}
          selectedRobot={selectedRobot}
          renderTrigger={renderTrigger}
          onRobotPositionChange={handleRobotPositionChange}
          onRobotRotationChange={handleRobotRotationChange}
          onRobotSelect={setSelectedRobot}
          onHistoryCheckpoint={handleHistoryCheckpoint}
        />

        {/* Drawing Canvas */}
        <DrawingCanvas
          match={match}
          mode={mode}
          cameraX={cameraX}
          cameraY={cameraY}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          scaling={scaling}
          leftOffset={leftOffset}
          topOffset={topOffset}
          currentTool={currentTool}
          currentColor={currentColor}
          robotWidth={robotWidth}
          robotHeight={robotHeight}
          selectedRobot={selectedRobot}
          renderTrigger={renderTrigger}
          onDrawingChange={handleDrawingChange}
          onRobotSelect={setSelectedRobot}
          onRobotPositionChange={handleRobotPositionChange}
          onRobotRotationChange={handleRobotRotationChange}
          onHistoryCheckpoint={handleHistoryCheckpoint}
        />

            {/* Controls */}
        <WhiteboardControls
          currentTool={currentTool}
          currentColor={currentColor}
          robotWidth={robotWidth}
          robotHeight={robotHeight}
          onToolChange={setCurrentTool}
          onColorChange={setCurrentColor}
          onRobotSizeChange={handleRobotSizeChange}
        />
      </div>
    </div>
  );
}
