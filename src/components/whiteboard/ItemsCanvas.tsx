import { useRef, useEffect, useCallback } from 'react';
import { Match, PhaseData } from '../../match';
import { Config } from '../../config';

interface ItemsCanvasProps {
  match: Match;
  mode: 'auto' | 'teleop' | 'endgame' | 'notes';
  cameraX: number;
  cameraY: number;
  width: number;
  height: number;
  scaling: number;
  leftOffset: number;
  topOffset: number;
  robotWidth: number;
  robotHeight: number;
  selectedRobot: string | null;
  renderTrigger: number;
  onRobotPositionChange: (robot: string, x: number, y: number) => void;
  onRobotRotationChange: (robot: string, rotation: number) => void;
  onRobotSelect: (robot: string | null) => void;
  onHistoryCheckpoint: () => void;
}

export default function ItemsCanvas({
  match,
  mode,
  cameraX,
  cameraY,
  width,
  height,
  scaling,
  leftOffset,
  topOffset,
  robotWidth,
  robotHeight,
  selectedRobot,
  renderTrigger,
  onRobotPositionChange,
  onRobotRotationChange,
  onRobotSelect,
  onHistoryCheckpoint,
}: ItemsCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

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

  const drawRobot = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      w: number,
      h: number,
      r: number,
      color: string,
      isSelected: boolean,
      teamNumber: string,
      team: 'red' | 'blue',
    ) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(r);

      // Robot body with rounded corners
      ctx.fillStyle = color;
      ctx.beginPath();
      if (isSelected) {
        ctx.shadowBlur = 30;
        ctx.shadowColor = 'white';
      }
      ctx.roundRect(-w / 2, -h / 2, w, h, 20);
      ctx.fill();
      if (isSelected) {
        ctx.shadowBlur = 0;
      }

      // Inner darker rectangle for depth
      ctx.fillStyle = '#242429';
      ctx.beginPath();
      ctx.roundRect(-w / 2 + 17, -h / 2 + 17, w - 34, h - 34, 10);
      ctx.fill();

      // Team number text
      ctx.font = 'bold 48px sans-serif';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(teamNumber, 0, 0);

      // Rotation control handle when selected
      if (isSelected) {
        ctx.beginPath();
        ctx.fillStyle = 'white';
        // Handle position based on team (left for blue, right for red)
        const rotControlX = team === 'blue' ? -w / 2 : w / 2;
        ctx.arc(rotControlX, 0, 20, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    },
    [],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, width, height);

    if (mode === 'notes') return; // No robots in notes mode

    const phaseData = getPhaseData();
    if (!phaseData) return;

    ctx.save();
    ctx.translate(width / 2 - cameraX, height / 2 - cameraY);

    // Draw all robots
    const robots = [
      { key: 'redOne', data: phaseData.redOneRobot, color: 'red', teamNumber: match.redOne, team: 'red' as const },
      { key: 'redTwo', data: phaseData.redTwoRobot, color: 'red', teamNumber: match.redTwo, team: 'red' as const },
      { key: 'redThree', data: phaseData.redThreeRobot, color: 'red', teamNumber: match.redThree, team: 'red' as const },
      { key: 'blueOne', data: phaseData.blueOneRobot, color: 'blue', teamNumber: match.blueOne, team: 'blue' as const },
      { key: 'blueTwo', data: phaseData.blueTwoRobot, color: 'blue', teamNumber: match.blueTwo, team: 'blue' as const },
      { key: 'blueThree', data: phaseData.blueThreeRobot, color: 'blue', teamNumber: match.blueThree, team: 'blue' as const },
    ];

    // Draw unselected robots first
    robots.forEach(({ key, data, color, teamNumber, team }) => {
      if (data && selectedRobot !== key) {
        drawRobot(
          ctx,
          data.x,
          data.y,
          data.w || robotWidth,
          data.h || robotHeight,
          data.r || 0,
          color,
          false,
          teamNumber,
          team,
        );
      }
    });

    // Draw selected robot last (on top)
    const selectedRobotData = robots.find(({ key }) => key === selectedRobot);
    if (selectedRobotData && selectedRobotData.data) {
      const { data, color, teamNumber, team } = selectedRobotData;
      drawRobot(
        ctx,
        data.x,
        data.y,
        data.w || robotWidth,
        data.h || robotHeight,
        data.r || 0,
        color,
        true,
        teamNumber,
        team,
      );
    }

    ctx.restore();
  }, [match, mode, cameraX, cameraY, width, height, robotWidth, robotHeight, selectedRobot, renderTrigger, drawRobot]);

  useEffect(() => {
    draw();
  }, [draw]);

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
      const phaseData = getPhaseData();
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
        if (!data) continue;

        const w = data.w || robotWidth;
        const h = data.h || robotHeight;

        // Simple bounding box check (not accounting for rotation)
        if (
          worldX >= data.x - w / 2 &&
          worldX <= data.x + w / 2 &&
          worldY >= data.y - h / 2 &&
          worldY <= data.y + h / 2
        ) {
          return key;
        }
      }

      return null;
    },
    [mode, robotWidth, robotHeight, match],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const { x: worldX, y: worldY } = screenToWorld(screenX, screenY);

      const robotKey = findRobotAtPosition(worldX, worldY);
      if (robotKey) {
        onHistoryCheckpoint();
        onRobotSelect(robotKey);
        isDraggingRef.current = true;

        const phaseData = getPhaseData();
        const robotData = phaseData[`${robotKey}Robot` as keyof PhaseData];
        if (robotData && typeof robotData === 'object' && 'x' in robotData && 'y' in robotData) {
          dragOffsetRef.current = {
            x: worldX - robotData.x,
            y: worldY - robotData.y,
          };
        }
      } else {
        onRobotSelect(null);
      }
    },
    [screenToWorld, findRobotAtPosition, onRobotSelect, mode, match, onHistoryCheckpoint],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDraggingRef.current || !selectedRobot) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const { x: worldX, y: worldY } = screenToWorld(screenX, screenY);

      const newX = worldX - dragOffsetRef.current.x;
      const newY = worldY - dragOffsetRef.current.y;

      onRobotPositionChange(selectedRobot, newX, newY);
      draw();
    },
    [selectedRobot, screenToWorld, onRobotPositionChange, draw],
  );

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  return (
    <canvas
      id="whiteboard-canvas-items"
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute m-0 select-none touch-none"
      style={{
        scale: `${scaling}`,
        transformOrigin: 'top left',
        left: `${leftOffset}px`,
        top: `${topOffset}px`,
        cursor: 'default',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    />
  );
}
