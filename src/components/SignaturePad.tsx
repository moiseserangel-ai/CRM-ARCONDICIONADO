import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

export interface SignaturePadRef {
  clear: () => void;
  isEmpty: () => boolean;
  toDataURL: (type?: string) => string | null;
}

interface SignaturePadProps {
  penColor?: string;
  canvasProps?: React.CanvasHTMLAttributes<HTMLCanvasElement>;
}

const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(({ penColor = 'black', canvasProps }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const isEmptyRef = useRef(true);

  useImperativeHandle(ref, () => ({
    clear: () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          isEmptyRef.current = true;
        }
      }
    },
    isEmpty: () => isEmptyRef.current,
    toDataURL: (type = 'image/png') => {
      if (isEmptyRef.current) return null;
      return canvasRef.current?.toDataURL(type) || null;
    }
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        // Save current content
        const dataUrl = isEmptyRef.current ? null : canvas.toDataURL();
        
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        
        // Restore content
        if (dataUrl) {
          const img = new Image();
          img.src = dataUrl;
          img.onload = () => {
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.drawImage(img, 0, 0);
          };
        }
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    isEmptyRef.current = false;
    draw(e);
  };

  const stopDrawing = () => {
    isDrawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.beginPath();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Prevent scrolling on touch
    if (e.cancelable) {
      e.preventDefault();
    }

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = penColor;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseOut={stopDrawing}
      onTouchStart={startDrawing}
      onTouchMove={draw}
      onTouchEnd={stopDrawing}
      {...canvasProps}
      style={{ touchAction: 'none', ...canvasProps?.style }}
    />
  );
});

SignaturePad.displayName = 'SignaturePad';

export default SignaturePad;
