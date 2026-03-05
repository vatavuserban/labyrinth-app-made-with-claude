import { useEffect, useRef, useState } from 'react'
import './App.css'
import { generateMaze, type Maze } from './maze'

const COLS = 25
const ROWS = 40
const CELL_SIZE = 20

type Point = { x: number; y: number }

function drawMazeBase(ctx: CanvasRenderingContext2D, maze: Maze) {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches

  ctx.fillStyle = isDark ? '#1a1a1a' : '#f0f0f0'
  ctx.fillRect(0, 0, COLS * CELL_SIZE, ROWS * CELL_SIZE)

  ctx.fillStyle = '#22c55e'
  ctx.fillRect(maze.start.col * CELL_SIZE, maze.start.row * CELL_SIZE, CELL_SIZE, CELL_SIZE)
  ctx.fillStyle = '#ef4444'
  ctx.fillRect(maze.exit.col * CELL_SIZE, maze.exit.row * CELL_SIZE, CELL_SIZE, CELL_SIZE)

  ctx.strokeStyle = isDark ? '#ffffff' : '#111111'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let r = 0; r < maze.rows; r++) {
    for (let c = 0; c < maze.cols; c++) {
      const { walls } = maze.grid[r][c]
      const x = c * CELL_SIZE
      const y = r * CELL_SIZE
      if (walls.top) { ctx.moveTo(x, y); ctx.lineTo(x + CELL_SIZE, y) }
      if (walls.right) { ctx.moveTo(x + CELL_SIZE, y); ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE) }
      if (walls.bottom) { ctx.moveTo(x, y + CELL_SIZE); ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE) }
      if (walls.left) { ctx.moveTo(x, y); ctx.lineTo(x, y + CELL_SIZE) }
    }
  }
  ctx.stroke()

  ctx.fillStyle = '#000000'
  ctx.font = `bold ${CELL_SIZE * 0.6}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('S', maze.start.col * CELL_SIZE + CELL_SIZE / 2, maze.start.row * CELL_SIZE + CELL_SIZE / 2)
  ctx.fillText('E', maze.exit.col * CELL_SIZE + CELL_SIZE / 2, maze.exit.row * CELL_SIZE + CELL_SIZE / 2)
}

function drawPath(ctx: CanvasRenderingContext2D, path: Point[]) {
  if (path.length < 2) return
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(path[0].x, path[0].y)
  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(path[i].x, path[i].y)
  }
  ctx.stroke()
}

function redraw(canvas: HTMLCanvasElement, maze: Maze, path: Point[]) {
  const ctx = canvas.getContext('2d')!
  drawMazeBase(ctx, maze)
  drawPath(ctx, path)
}

function getCanvasPos(e: React.PointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement): Point {
  const rect = canvas.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

function App() {
  const [maze, setMaze] = useState<Maze | null>(null)
  const [hasPath, setHasPath] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const pathRef = useRef<Point[]>([])

  const handleGenerate = () => {
    isDrawingRef.current = false
    pathRef.current = []
    setHasPath(false)
    setMaze(generateMaze(COLS, ROWS))
  }

  const handleClearPath = () => {
    isDrawingRef.current = false
    pathRef.current = []
    setHasPath(false)
    if (maze && canvasRef.current) {
      redraw(canvasRef.current, maze, [])
    }
  }

  useEffect(() => {
    if (maze && canvasRef.current) {
      redraw(canvasRef.current, maze, pathRef.current)
    }
  }, [maze])

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!maze || !canvasRef.current) return
    const pos = getCanvasPos(e, canvasRef.current)
    const { col, row } = maze.start
    const inStart =
      pos.x >= col * CELL_SIZE && pos.x < (col + 1) * CELL_SIZE &&
      pos.y >= row * CELL_SIZE && pos.y < (row + 1) * CELL_SIZE
    if (!inStart) return
    isDrawingRef.current = true
    pathRef.current = [pos]
    setHasPath(true)
    canvasRef.current.setPointerCapture(e.pointerId)
    redraw(canvasRef.current, maze, pathRef.current)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !maze || !canvasRef.current) return
    pathRef.current.push(getCanvasPos(e, canvasRef.current))
    redraw(canvasRef.current, maze, pathRef.current)
  }

  const handlePointerUp = () => {
    isDrawingRef.current = false
  }

  return (
    <div className="app">
      <h1>React Labyrinth</h1>
      <div className="controls">
        <button onClick={handleGenerate}>Generate labyrinth</button>
        {maze && hasPath && (
          <button onClick={handleClearPath}>Clear path</button>
        )}
      </div>
      <canvas
        ref={canvasRef}
        className="maze-container"
        width={COLS * CELL_SIZE}
        height={ROWS * CELL_SIZE}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: 'none' }}
      />
    </div>
  )
}

export default App
