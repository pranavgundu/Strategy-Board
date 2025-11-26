import { useRef, useEffect, useCallback, useState } from 'react';
import { Match, PhaseData, DrawingStroke } from '../../match';

interface DrawingCanvasProps {
  match: Match;
  mode: 'auto' | 'teleop' | 'endgame' | 'notes';
  cameraX: number;
  cameraY: number;
  width: number;
  height: number;
  scaling: number;
  leftOffset: number;
  topOffset: number;
  currentTool: 'marker' | 'eraser';
  currentColor: string;
  robotWidth: number;
  robotHeight: number;
  selectedRobot: string | null;
  renderTrigger: number;
  onDrawingChange: (mode: 'auto' | 'teleop' | 'endgame' | 'notes') => void;
  onRobotSelect: (robot: string | null) => void;
  onRobotPositionChange: (robot: string, x: number, y: number) => void;
  onRobotRotationChange: (robot: string, rotation: number) => void;
  onHistoryCheckpoint: () => void;
}

export default function DrawingCanvas({
  match,
  mode,
  cameraX,
  cameraY,
  width,
  height,
  scaling,
  leftOffset,
  topOffset,
  currentTool,
  currentColor,
  robotWidth,
  robotHeight,
  selectedRobot,
  renderTrigger,
  onDrawingChange,
  onRobotSelect,
  onRobotPositionChange,
  onRobotRotationChange,
  onHistoryCheckpoint,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);
  const isDraggingRobotRef = useRef(false);
  const isRotatingRobotRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const [isInteractingWithRobot, setIsInteractingWithRobot] = useState(false);

  const getPhaseData = (): PhaseData => {
    switch (mode) {
      case 'auto':
        return match.auto;
      case 'teleop':
        return match.teleop;
      case 'endgame':
        return match.endgame;
      case 'notes':
        return match.notes;
    }
  };

  const screenToWorld = useCallback(
    (screenX: number, screenY: number) => {
      // screenX and screenY are relative to canvas, already accounting for left/top offset
      // Divide by scaling to get unscaled canvas coordinates
      const canvasX = screenX / scaling;
      const canvasY = screenY / scaling;

      // Transform from canvas coordinates to world coordinates
      // Account for camera translation
      const worldX = canvasX - (width / 2 - cameraX);
      const worldY = canvasY - (height / 2 - cameraY);

      return { x: worldX, y: worldY };
    },
    [cameraX, cameraY, width, height, scaling],
  );

  const findRobotAtPosition = useCallback(
    (worldX: number, worldY: number): string | null => {
      if (mode === 'notes' || !match) return null;

      const phaseData = match[mode];
      if (!phaseData) return null;

      const robots = [
        { key: 'redOne', data: phaseData.redOneRobot },
        { key: 'redTwo', data: phaseData.redTwoRobot },
        { key: 'redThree', data: phaseData.redThreeRobot },
        { key: 'blueOne', data: phaseData.blueOneRobot },
        { key: 'blueTwo', data: phaseData.blueTwoRobot },
        { key: 'blueThree', data: phaseData.blueThreeRobot },
      ];

      // Check in reverse order so top robots are selected first
      for (let i = robots.length - 1; i >= 0; i--) {
        const { key, data } = robots[i];
        if (!data || typeof data !== 'object') continue;

        const robotData = data as any;
        const w = robotData.w || robotWidth;
        const h = robotData.h || robotHeight;

        // Simple bounding box check
        if (
          worldX >= robotData.x - w / 2 &&
          worldX <= robotData.x + w / 2 &&
          worldY >= robotData.y - h / 2 &&
          worldY <= robotData.y + h / 2
        ) {
          return key;
        }
      }

      return null;
    },
    [mode, robotWidth, robotHeight, match],
  );

  const isClickingRotationHandle = useCallback(
    (worldX: number, worldY: number, robotKey: string): boolean => {
      if (!match) return false;

      const phaseData = match[mode];
      const robotData = phaseData[`${robotKey}Robot` as keyof typeof phaseData];
      if (!robotData || typeof robotData !== 'object') return false;

      const robot = robotData as any;
      const w = robot.w || robotWidth;
      const rotation = robot.r || 0;

      // Check both rotation handles (left and right sides of robot) for easier interaction
      const h = robot.h || robotHeight;
      
      // Check right-side handle
      const rightHandleLocalX = w / 2;
      const rightHandleX = robot.x + Math.cos(rotation) * rightHandleLocalX;
      const rightHandleY = robot.y + Math.sin(rotation) * rightHandleLocalX;
      
      // Check left-side handle  
      const leftHandleLocalX = -w / 2;
      const leftHandleX = robot.x + Math.cos(rotation) * leftHandleLocalX;
      const leftHandleY = robot.y + Math.sin(rotation) * leftHandleLocalX;

      // Use generous hit radius
      const detectionRadius = Math.max(50, Math.min(80, w * 0.25 + 35));
      
      const dxRight = worldX - rightHandleX;
      const dyRight = worldY - rightHandleY;
      const dxLeft = worldX - leftHandleX;
      const dyLeft = worldY - leftHandleY;
      
      const distRight = Math.sqrt(dxRight * dxRight + dyRight * dyRight);
      const distLeft = Math.sqrt(dxLeft * dxLeft + dyLeft * dyLeft);
      
      // Also check if click is near the edge of the robot (generous margin)
      const edgeMargin = 40;
      const nearEdge = (
        Math.abs(worldX - robot.x) > w / 2 - edgeMargin ||
        Math.abs(worldY - robot.y) > h / 2 - edgeMargin
      ) && (
        worldX >= robot.x - w / 2 - edgeMargin &&
        worldX <= robot.x + w / 2 + edgeMargin &&
        worldY >= robot.y - h / 2 - edgeMargin &&
        worldY <= robot.y + h / 2 + edgeMargin
      );
      
      return distRight <= detectionRadius || distLeft <= detectionRadius || nearEdge;
    },
    [mode, robotWidth, robotHeight, match],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, width, height);

    const phaseData = getPhaseData();
    if (!phaseData || !phaseData.drawing) return;

    ctx.save();
    ctx.translate(width / 2 - cameraX, height / 2 - cameraY);

    // Draw all strokes (tuples: [colorIndex, [x, y], [x, y], ...])
    const colors = ['#ffffff', '#ef4444', '#3b82f6', '#22c55e', '#eab308'];
    phaseData.drawing.forEach((stroke) => {
      if (!stroke || stroke.length < 2) return;

      const colorIndex = stroke[0];
      const points = stroke.slice(1) as Array<[number, number]>;

      if (points.length < 2) return;

      ctx.strokeStyle = colors[colorIndex] || '#ffffff';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);

      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i][0], points[i][1]);
      }

      ctx.stroke();
    });

    // Draw text annotations (tuples: [x, y, colorIndex, text])
    if (phaseData.textAnnotations) {
      const colors = ['#ffffff', '#ef4444', '#3b82f6', '#22c55e', '#eab308'];
      phaseData.textAnnotations.forEach((annotation) => {
        if (!annotation || annotation.length < 4) return;

        const [x, y, colorIndex, text] = annotation;
        const color = colors[colorIndex] || '#ffffff';

        ctx.font = 'bold 80px Arial';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y - 40);
      });
    }

    ctx.restore();
  }, [match, mode, cameraX, cameraY, width, height, renderTrigger]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const { x: worldX, y: worldY } = screenToWorld(screenX, screenY);

      // Check if clicking on a robot first
      const robotKey = findRobotAtPosition(worldX, worldY);
      if (robotKey && match) {
        onHistoryCheckpoint();
        // Check if clicking on rotation handle
        if (isClickingRotationHandle(worldX, worldY, robotKey)) {
          onRobotSelect(robotKey);
          isRotatingRobotRef.current = true;
          setIsInteractingWithRobot(true);
          return;
        }

        // Select the robot and start dragging immediately
        onRobotSelect(robotKey);
        isDraggingRobotRef.current = true;
        setIsInteractingWithRobot(true);

        const phaseData = match[mode];
        const robotData = phaseData[`${robotKey}Robot` as keyof typeof phaseData];
        if (robotData && typeof robotData === 'object' && 'x' in robotData && 'y' in robotData) {
          const robot = robotData as any;
          dragOffsetRef.current = {
            x: worldX - robot.x,
            y: worldY - robot.y,
          };
        }
        return;
      }

      // Not clicking on a robot, so start drawing
      onRobotSelect(null);
      onHistoryCheckpoint();
      isDrawingRef.current = true;
      currentStrokeRef.current = [{ x: worldX, y: worldY }];
    },
    [screenToWorld, findRobotAtPosition, isClickingRotationHandle, selectedRobot, onRobotSelect, mode, match, onHistoryCheckpoint],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const { x: worldX, y: worldY } = screenToWorld(screenX, screenY);

      // Handle robot rotation
      if (isRotatingRobotRef.current && selectedRobot && match) {
        const phaseData = match[mode];
        const robotData = phaseData[`${selectedRobot}Robot` as keyof typeof phaseData];
        if (robotData && typeof robotData === 'object' && 'x' in robotData && 'y' in robotData) {
          const robot = robotData as any;
          // Calculate angle from robot center to mouse position
          // Use same angle calculation for both teams - no offset needed
          const angle = Math.atan2(worldY - robot.y, worldX - robot.x);

          onRobotRotationChange(selectedRobot, angle);
        }
        return;
      }

      // Handle robot dragging
      if (isDraggingRobotRef.current && selectedRobot) {
        const newX = worldX - dragOffsetRef.current.x;
        const newY = worldY - dragOffsetRef.current.y;
        onRobotPositionChange(selectedRobot, newX, newY);
        return;
      }

      // Handle drawing
      if (!isDrawingRef.current) return;

      currentStrokeRef.current.push({ x: worldX, y: worldY });

      // Draw preview
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return;

      draw(); // Redraw existing strokes

      // Draw current stroke
      if (currentStrokeRef.current.length > 1) {
        ctx.save();
        ctx.translate(width / 2 - cameraX, height / 2 - cameraY);

        ctx.strokeStyle = currentTool === 'eraser' ? '#18181b' : currentColor;
        ctx.lineWidth = currentTool === 'eraser' ? 20 : 10;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(currentStrokeRef.current[0].x, currentStrokeRef.current[0].y);

        for (let i = 1; i < currentStrokeRef.current.length; i++) {
          ctx.lineTo(currentStrokeRef.current[i].x, currentStrokeRef.current[i].y);
        }

        ctx.stroke();
        ctx.restore();
      }
    },
    [currentTool, currentColor, screenToWorld, draw, cameraX, cameraY, width, height, selectedRobot, onRobotPositionChange, onRobotRotationChange, mode, match],
  );

  const handlePointerUp = useCallback(() => {
    // Stop robot rotation
    if (isRotatingRobotRef.current) {
      isRotatingRobotRef.current = false;
      setIsInteractingWithRobot(false);
      return;
    }

    // Stop robot dragging
    if (isDraggingRobotRef.current) {
      isDraggingRobotRef.current = false;
      setIsInteractingWithRobot(false);
      return;
    }

    if (!isDrawingRef.current) return;

    isDrawingRef.current = false;

    if (currentStrokeRef.current.length < 2) {
      currentStrokeRef.current = [];
      return;
    }

    const phaseData = getPhaseData();

    if (currentTool === 'marker') {
      // Add stroke to drawing as tuple: [colorIndex, [x, y], [x, y], ...]
      const colors = ['#ffffff', '#ef4444', '#3b82f6', '#22c55e', '#eab308'];
      const colorIndex = colors.indexOf(currentColor);
      const colorIdx = colorIndex >= 0 ? colorIndex : 0;

      const points = currentStrokeRef.current.map((p) => [p.x, p.y] as [number, number]);
      const newStroke: DrawingStroke = [colorIdx, ...points];

      if (!phaseData.drawing) {
        phaseData.drawing = [];
      }

      phaseData.drawing.push(newStroke);
      onDrawingChange(mode);
    } else if (currentTool === 'eraser') {
      // Remove strokes that intersect with eraser path
      if (phaseData.drawing) {
        phaseData.drawing = phaseData.drawing.filter((stroke) => {
          if (!stroke || stroke.length < 2) return true;

          const points = stroke.slice(1) as Array<[number, number]>;

          // Simple intersection check
          for (const eraserPoint of currentStrokeRef.current) {
            for (const [strokeX, strokeY] of points) {
              const dx = eraserPoint.x - strokeX;
              const dy = eraserPoint.y - strokeY;
              const distance = Math.sqrt(dx * dx + dy * dy);

              if (distance < 20) {
                return false; // Remove this stroke
              }
            }
          }

          return true; // Keep this stroke
        });

        onDrawingChange(mode);
      }
    }

    currentStrokeRef.current = [];
    draw();
  }, [currentTool, currentColor, mode, onDrawingChange, draw, match, selectedRobot, onRobotPositionChange]);

  return (
    <canvas
      id="whiteboard-canvas-drawing"
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute m-0 select-none touch-none"
      style={{
        scale: `${scaling}`,
        transformOrigin: 'top left',
        left: `${leftOffset}px`,
        top: `${topOffset}px`,
        cursor: isInteractingWithRobot ? 'default' : (currentTool === 'marker' ? 'crosshair' : 'not-allowed'),
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    />
  );
}
