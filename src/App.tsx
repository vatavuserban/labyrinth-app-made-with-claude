import { useEffect, useRef, useState } from 'react'
import './App.css'
import { generateMaze, type Maze } from './maze'
import amelie from './assets/amelie.png'
import serban from './assets/serban-small.png'

const COLS = 10
const ROWS = 10
const CELL_SIZE = 50

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

}

function drawPath(ctx: CanvasRenderingContext2D, path: Point[]) {
  if (path.length < 2) return
  ctx.strokeStyle = '#3b82f6'
  ctx.lineWidth = 10
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

type Cell = { col: number; row: number }

function posToCell(pos: Point, maze: Maze): Cell {
  return {
    col: Math.max(0, Math.min(maze.cols - 1, Math.floor(pos.x / CELL_SIZE))),
    row: Math.max(0, Math.min(maze.rows - 1, Math.floor(pos.y / CELL_SIZE))),
  }
}

function hasWallBetween(maze: Maze, from: Cell, to: Cell): boolean {
  let cur = { ...from }
  while (cur.col !== to.col || cur.row !== to.row) {
    const dc = Math.sign(to.col - cur.col)
    const dr = Math.sign(to.row - cur.row)
    if (dc !== 0) {
      const cell = maze.grid[cur.row][cur.col]
      if (dc === 1 && cell.walls.right) return true
      if (dc === -1 && cell.walls.left) return true
      cur = { col: cur.col + dc, row: cur.row }
    } else {
      const cell = maze.grid[cur.row][cur.col]
      if (dr === 1 && cell.walls.bottom) return true
      if (dr === -1 && cell.walls.top) return true
      cur = { col: cur.col, row: cur.row + dr }
    }
  }
  return false
}

function getCanvasPos(e: React.PointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement): Point {
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
}

function App() {
  const [maze, setMaze] = useState<Maze | null>(null)
  const [hasPath, setHasPath] = useState(false)
  const [wallHit, setWallHit] = useState(false)
  const [won, setWon] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const pathRef = useRef<Point[]>([])
  const hitWallRef = useRef(false)
  const currentCellRef = useRef<Cell | null>(null)

  const handleGenerate = () => {
    isDrawingRef.current = false
    hitWallRef.current = false
    pathRef.current = []
    currentCellRef.current = null
    setHasPath(false)
    setWallHit(false)
    setWon(false)
    setMaze(generateMaze(COLS, ROWS))
  }

  const handleClearPath = () => {
    isDrawingRef.current = false
    hitWallRef.current = false
    pathRef.current = []
    currentCellRef.current = null
    setHasPath(false)
    setWallHit(false)
    setWon(false)
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

    // Resume drawing from last valid point (after wall hit or normal pointerup with existing path)
    if (pathRef.current.length > 0 && !won) {
      hitWallRef.current = false
      isDrawingRef.current = true
      setWallHit(false)
      canvasRef.current.setPointerCapture(e.pointerId)
      return
    }

    // Fresh start from start cell (only when no path exists)
    const pos = getCanvasPos(e, canvasRef.current)
    const { col, row } = maze.start
    const inStart =
      pos.x >= col * CELL_SIZE && pos.x < (col + 1) * CELL_SIZE &&
      pos.y >= row * CELL_SIZE && pos.y < (row + 1) * CELL_SIZE
    if (!inStart) return
    isDrawingRef.current = true
    pathRef.current = [pos]
    currentCellRef.current = { col, row }
    setHasPath(true)
    canvasRef.current.setPointerCapture(e.pointerId)
    redraw(canvasRef.current, maze, pathRef.current)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || hitWallRef.current || !maze || !canvasRef.current) return
    const pos = getCanvasPos(e, canvasRef.current)
    const newCell = posToCell(pos, maze)
    const currCell = currentCellRef.current!
    if (newCell.col !== currCell.col || newCell.row !== currCell.row) {
      if (hasWallBetween(maze, currCell, newCell)) {
        // Freeze at last valid point — do not add the invalid point
        hitWallRef.current = true
        isDrawingRef.current = false
        setWallHit(true)
        return
      }
      currentCellRef.current = newCell
      if (newCell.col === maze.exit.col && newCell.row === maze.exit.row) {
        isDrawingRef.current = false
        pathRef.current.push(pos)
        redraw(canvasRef.current, maze, pathRef.current)
        setWon(true)
        return
      }
    }
    pathRef.current.push(pos)
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
      <div className="canvas-wrapper">
        {wallHit && <p className="wall-hit">Hit a wall! Click to continue from where you stopped.</p>}
        {won && (
          <div className="win-banner">
            <p>You solved it!</p>
            <div className="win-actions">
              <button onClick={handleGenerate}>Generate new labyrinth</button>
              <button onClick={handleClearPath}>Draw again</button>
            </div>
          </div>
        )}
        {maze && (
          <>
            <img
              className="cell-icon"
              src={amelie}
              alt="Start"
              style={{
                left: `${(maze.start.col / COLS) * 100}%`,
                top: `${(maze.start.row / ROWS) * 100}%`,
                width: `${100 / COLS}%`,
                height: `${100 / ROWS}%`,
              }}
            />
            <img
              className="cell-icon"
              src={serban}
              alt="Exit"
              style={{
                left: `${(maze.exit.col / COLS) * 100}%`,
                top: `${(maze.exit.row / ROWS) * 100}%`,
                width: `${100 / COLS}%`,
                height: `${100 / ROWS}%`,
              }}
            />
          </>
        )}
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
    </div>
  )
}

export default App
