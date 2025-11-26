import { useRef, useEffect } from 'react';
import { Match } from '../../match';
import { Config } from '../../config';
import fieldUrl from '../../images/field25.png';

interface BackgroundCanvasProps {
  match: Match;
  mode: 'auto' | 'teleop' | 'endgame' | 'notes';
  cameraX: number;
  cameraY: number;
  width: number;
  height: number;
  scaling: number;
  leftOffset: number;
  topOffset: number;
}

export default function BackgroundCanvas({
  match,
  mode,
  cameraX,
  cameraY,
  width,
  height,
  scaling,
  leftOffset,
  topOffset,
}: BackgroundCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fieldImageRef = useRef<HTMLImageElement | null>(null);

  // Load field image
  useEffect(() => {
    const img = new Image();
    img.src = fieldUrl;
    img.onload = () => {
      fieldImageRef.current = img;
      drawBackground();
    };
    fieldImageRef.current = img;
  }, []);

  // Redraw when dependencies change
  useEffect(() => {
    drawBackground();
  }, [match, mode, cameraX, cameraY]);

  const drawBackground = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Notes mode has grid background
    if (mode === 'notes') {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;

      const gridSpacing = 100;

      for (let x = 0; x < width; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      for (let y = 0; y < height; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.restore();
      return;
    }

    // Draw field background
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, width, height);
    ctx.translate(width / 2 - cameraX, height / 2 - cameraY);

    if (fieldImageRef.current) {
      ctx.drawImage(fieldImageRef.current, 0, 0);
    }

    if (match) {
      ctx.save();
      ctx.font = 'bold 64px sans-serif';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const fieldWidth = Config.fieldPNGPixelWidth;
      const fieldHeight = Config.fieldPNGPixelHeight;
      const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));
      const margin = 64;

      const drawStation = (
        stationX: number,
        stationY: number,
        text: string,
        rotation: number,
      ) => {
        const clampedX = clamp(stationX, margin, fieldWidth - margin);
        const clampedY = clamp(stationY, margin, fieldHeight - margin);
        ctx.save();
        ctx.translate(clampedX, clampedY);
        ctx.rotate(rotation);
        ctx.fillText(text, 0, 0);
        ctx.restore();
      };

      drawStation(Config.redOneStationX, Config.redOneStationY, match.redOne, Math.PI / 2);
      drawStation(Config.redTwoStationX, Config.redTwoStationY, match.redTwo, Math.PI / 2);
      drawStation(Config.redThreeStationX, Config.redThreeStationY, match.redThree, Math.PI / 2);
      drawStation(Config.blueOneStationX, Config.blueOneStationY, match.blueOne, Math.PI / 2);
      drawStation(Config.blueTwoStationX, Config.blueTwoStationY, match.blueTwo, Math.PI / 2);
      drawStation(Config.blueThreeStationX, Config.blueThreeStationY, match.blueThree, Math.PI / 2);

      ctx.restore();
    }

    ctx.restore();
  };

  return (
    <canvas
      id="whiteboard-canvas-background"
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute m-0 select-none touch-none pointer-events-none"
      style={{
        scale: `${scaling}`,
        transformOrigin: 'top left',
        left: `${leftOffset}px`,
        top: `${topOffset}px`,
      }}
    />
  );
}
