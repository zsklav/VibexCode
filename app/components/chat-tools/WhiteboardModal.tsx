"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  ArrowUpRight,
  Brush,
  Circle,
  Eraser,
  Highlighter,
  Minus,
  MousePointer2,
  Pencil,
  Redo2,
  Save,
  Square,
  Trash2,
  Triangle,
  Type,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { BoardElement, BoardTool } from "./types";

const TOOLS: Array<{ id: BoardTool; label: string; icon: any }> = [
  { id: "pencil", label: "Pencil", icon: Pencil },
  { id: "brush", label: "Brush", icon: Brush },
  { id: "highlighter", label: "Highlighter", icon: Highlighter },
  { id: "eraser", label: "Eraser", icon: Eraser },
  { id: "text", label: "Text", icon: Type },
  { id: "rectangle", label: "Rectangle", icon: Square },
  { id: "circle", label: "Circle", icon: Circle },
  { id: "line", label: "Line", icon: Minus },
  { id: "arrow", label: "Arrow", icon: ArrowUpRight },
  { id: "triangle", label: "Triangle", icon: Triangle },
  { id: "pan", label: "Pan", icon: MousePointer2 },
];

const COLORS = ["#111827", "#2563eb", "#9333ea", "#dc2626", "#16a34a", "#f59e0b"];

function drawElement(ctx: CanvasRenderingContext2D, element: BoardElement) {
  ctx.save();
  ctx.strokeStyle = element.color;
  ctx.fillStyle = element.tool === "highlighter" ? `${element.color}55` : element.color;
  ctx.lineWidth = element.strokeWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (element.tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
  }

  if (element.type === "path") {
    const points = element.points || [];
    if (points.length < 2) return ctx.restore();
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    points.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.stroke();
  }

  if (element.type === "shape") {
    const x = element.x || 0;
    const y = element.y || 0;
    const width = element.width || 0;
    const height = element.height || 0;
    ctx.beginPath();
    if (element.tool === "rectangle") ctx.rect(x, y, width, height);
    if (element.tool === "circle") ctx.ellipse(x + width / 2, y + height / 2, Math.abs(width / 2), Math.abs(height / 2), 0, 0, Math.PI * 2);
    if (element.tool === "line" || element.tool === "arrow") {
      ctx.moveTo(x, y);
      ctx.lineTo(x + width, y + height);
      if (element.tool === "arrow") {
        const angle = Math.atan2(height, width);
        const size = 12;
        ctx.lineTo(x + width - size * Math.cos(angle - Math.PI / 6), y + height - size * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(x + width, y + height);
        ctx.lineTo(x + width - size * Math.cos(angle + Math.PI / 6), y + height - size * Math.sin(angle + Math.PI / 6));
      }
    }
    if (element.tool === "triangle") {
      ctx.moveTo(x + width / 2, y);
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x, y + height);
      ctx.closePath();
    }
    ctx.stroke();
  }

  if (element.type === "text") {
    ctx.font = `${element.fontSize || 18}px ui-sans-serif, system-ui`;
    ctx.fillText(element.text || "", element.x || 0, element.y || 0);
  }

  ctx.restore();
}

export default function WhiteboardModal({
  roomId,
  selfId,
  selfName,
  socket,
  onClose,
}: {
  roomId: string;
  selfId: string;
  selfName: string;
  socket: any;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [elements, setElements] = useState<BoardElement[]>([]);
  const [redoStack, setRedoStack] = useState<BoardElement[][]>([]);
  const [tool, setTool] = useState<BoardTool>("pencil");
  const [color, setColor] = useState("#111827");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [draft, setDraft] = useState<BoardElement | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [collaborators, setCollaborators] = useState<Array<{ userId: string; name: string }>>([]);
  const [cursors, setCursors] = useState<Record<string, { name: string; x: number; y: number }>>({});
  const [history, setHistory] = useState<Array<{ savedAt: string; elements: BoardElement[] }>>([]);
  const [savedAt, setSavedAt] = useState("");

  const currentElements = useMemo(
    () => (draft ? [...elements, draft] : elements),
    [draft, elements]
  );

  const toBoardPoint = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      return {
        x: (event.clientX - rect.left - pan.x) / zoom,
        y: (event.clientY - rect.top - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);
    currentElements.forEach((element) => drawElement(ctx, element));
  }, [currentElements, pan, zoom]);

  useEffect(() => {
    render();
    window.addEventListener("resize", render);
    return () => window.removeEventListener("resize", render);
  }, [render]);

  useEffect(() => {
    axios.get(`/api/tools/whiteboard/${encodeURIComponent(roomId)}`).then((res) => {
      setElements(res.data.elements || []);
      setHistory(res.data.history || []);
    });
  }, [roomId]);

  useEffect(() => {
    if (!socket) return;
    socket.emit("board:join", { roomId, userId: selfId, name: selfName });
    socket.on("board:update", (payload: any) => {
      if (payload.roomId === roomId && payload.userId !== selfId) {
        setElements(payload.elements || []);
      }
    });
    socket.on("board:presence", (payload: any) => {
      if (payload.roomId === roomId) setCollaborators(payload.collaborators || []);
    });
    socket.on("board:cursor", (payload: any) => {
      if (payload.roomId !== roomId || payload.userId === selfId) return;
      setCursors((current) => ({
        ...current,
        [payload.userId]: { name: payload.name || "User", x: payload.x, y: payload.y },
      }));
    });
    return () => {
      socket.emit("board:leave", { roomId });
      socket.off("board:update");
      socket.off("board:presence");
      socket.off("board:cursor");
    };
  }, [roomId, selfId, selfName, socket]);

  const save = useCallback(async () => {
    const res = await axios.post(`/api/tools/whiteboard/${encodeURIComponent(roomId)}`, {
      elements,
      savedBy: selfName,
    });
    setHistory(res.data.history || []);
    setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    socket?.emit("board:save", { roomId, elements, userId: selfId });
  }, [elements, roomId, selfId, selfName, socket]);

  useEffect(() => {
    const id = setInterval(save, 10 * 1000);
    return () => clearInterval(id);
  }, [save]);

  const commit = (next: BoardElement[]) => {
    setElements(next);
    setRedoStack([]);
    socket?.emit("board:update", { roomId, elements: next, userId: selfId });
  };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = toBoardPoint(event);
    socket?.emit("board:cursor", { roomId, userId: selfId, name: selfName, ...point });

    if (tool === "text") {
      const text = window.prompt("Text");
      if (!text) return;
      commit([
        ...elements,
        {
          id: crypto.randomUUID(),
          type: "text",
          tool,
          x: point.x,
          y: point.y,
          text,
          color,
          strokeWidth: 1,
          fontSize: 20,
        },
      ]);
      return;
    }

    if (tool === "pan") {
      setDrawing(true);
      setDraft({
        id: "pan",
        type: "path",
        tool,
        points: [[event.clientX, event.clientY]],
        color,
        strokeWidth: 1,
      });
      return;
    }

    setDrawing(true);
    const element: BoardElement =
      ["rectangle", "circle", "line", "arrow", "triangle"].includes(tool)
        ? {
            id: crypto.randomUUID(),
            type: "shape",
            tool,
            x: point.x,
            y: point.y,
            width: 0,
            height: 0,
            color,
            strokeWidth: 3,
          }
        : {
            id: crypto.randomUUID(),
            type: "path",
            tool,
            points: [[point.x, point.y]],
            color,
            strokeWidth: tool === "brush" ? 7 : tool === "highlighter" ? 12 : 3,
          };
    setDraft(element);
  };

  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = toBoardPoint(event);
    socket?.emit("board:cursor", { roomId, userId: selfId, name: selfName, ...point });
    if (!drawing || !draft) return;

    if (tool === "pan") {
      const startPoint = draft.points?.[0];
      if (!startPoint) return;
      setPan((current) => ({
        x: current.x + event.movementX,
        y: current.y + event.movementY,
      }));
      return;
    }

    if (draft.type === "shape") {
      setDraft({ ...draft, width: point.x - (draft.x || 0), height: point.y - (draft.y || 0) });
    } else {
      setDraft({ ...draft, points: [...(draft.points || []), [point.x, point.y]] });
    }
  };

  const end = () => {
    if (!drawing) return;
    setDrawing(false);
    if (draft && draft.id !== "pan") commit([...elements, draft]);
    setDraft(null);
  };

  const undo = () => {
    if (elements.length === 0) return;
    setRedoStack((current) => [[...elements], ...current].slice(0, 50));
    commit(elements.slice(0, -1));
  };

  const redo = () => {
    const [next, ...rest] = redoStack;
    if (!next) return;
    setRedoStack(rest);
    commit(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-zinc-950/80 p-2 md:p-4">
      <div className="flex min-h-0 w-full flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-zinc-900">
        <header className="flex items-center gap-2 border-b border-gray-200 px-3 py-2 dark:border-zinc-800">
          <h2 className="font-semibold">Whiteboard</h2>
          {savedAt && <span className="text-xs text-gray-500">Saved {savedAt}</span>}
          <div className="ml-auto flex items-center gap-1">
            <button title="Save" onClick={save} className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-zinc-800">
              <Save className="h-4 w-4" />
            </button>
            <button title="Undo" onClick={undo} className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-zinc-800">
              <Undo2 className="h-4 w-4" />
            </button>
            <button title="Redo" onClick={redo} className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-zinc-800">
              <Redo2 className="h-4 w-4" />
            </button>
            <button title="Close" onClick={() => { save(); onClose(); }} className="rounded-md p-2 hover:bg-gray-100 dark:hover:bg-zinc-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="flex w-14 shrink-0 flex-col gap-1 border-r border-gray-200 p-2 dark:border-zinc-800">
            {TOOLS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  title={item.label}
                  onClick={() => setTool(item.id)}
                  className={cn(
                    "rounded-md p-2 transition",
                    tool === item.id
                      ? "bg-gray-900 text-white dark:bg-white dark:text-zinc-950"
                      : "hover:bg-gray-100 dark:hover:bg-zinc-800"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
            <div className="my-1 h-px bg-gray-200 dark:bg-zinc-800" />
            {COLORS.map((item) => (
              <button
                key={item}
                title={item}
                onClick={() => setColor(item)}
                className={cn("h-7 rounded-md border", color === item && "ring-2 ring-purple-500")}
                style={{ backgroundColor: item }}
              />
            ))}
          </aside>

          <div ref={wrapperRef} className="relative min-w-0 flex-1 touch-none overflow-hidden">
            <div className="absolute right-3 top-3 z-10 flex items-center gap-2 rounded-lg bg-white/90 px-3 py-2 text-xs shadow dark:bg-zinc-900/90">
              {collaborators.slice(0, 5).map((user) => (
                <span key={`${user.userId}-${user.name}`} className="rounded-full bg-gray-100 px-2 py-1 dark:bg-zinc-800">
                  {user.name}
                </span>
              ))}
            </div>
            <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1 rounded-lg bg-white/90 p-1 shadow dark:bg-zinc-900/90">
              <button onClick={() => setZoom((value) => Math.max(0.4, value - 0.1))} className="rounded p-2 hover:bg-gray-100 dark:hover:bg-zinc-800">
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="w-12 text-center text-xs">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom((value) => Math.min(2.5, value + 0.1))} className="rounded p-2 hover:bg-gray-100 dark:hover:bg-zinc-800">
                <ZoomIn className="h-4 w-4" />
              </button>
              <button onClick={() => commit([])} className="rounded p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {Object.entries(cursors).map(([userId, cursor]) => (
              <div
                key={userId}
                className="pointer-events-none absolute z-20 text-xs font-medium text-purple-600"
                style={{ left: cursor.x * zoom + pan.x, top: cursor.y * zoom + pan.y }}
              >
                <MousePointer2 className="h-4 w-4" />
                {cursor.name}
              </div>
            ))}
            <canvas
              ref={canvasRef}
              className="h-full w-full cursor-crosshair"
              onPointerDown={start}
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={end}
            />
          </div>

          <aside className="hidden w-56 shrink-0 border-l border-gray-200 p-3 text-xs dark:border-zinc-800 lg:block">
            <p className="mb-2 font-semibold">Saved versions</p>
            <div className="space-y-1">
              {history.slice().reverse().map((entry, index) => (
                <button
                  key={`${entry.savedAt}-${index}`}
                  onClick={() => commit(entry.elements || [])}
                  className="w-full rounded-md px-2 py-2 text-left hover:bg-gray-100 dark:hover:bg-zinc-800"
                >
                  {entry.savedAt ? new Date(entry.savedAt).toLocaleString() : "Saved version"}
                </button>
              ))}
              {history.length === 0 && <p className="text-gray-500">No saved versions yet.</p>}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
