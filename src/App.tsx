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

function drawPath(ctx: CanvasRenderingContext2D, path: Point[], validLength: number, hitWall: boolean) {
  if (path.length < 2) return

  // Draw valid portion in blue
  const validEnd = hitWall ? validLength : path.length
  if (validEnd >= 2) {
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(path[0].x, path[0].y)
    for (let i = 1; i < validEnd; i++) {
      ctx.lineTo(path[i].x, path[i].y)
    }
    ctx.stroke()
  }

  // Draw invalid (wall-hit) portion in red
  if (hitWall && path.length > validLength) {
    ctx.strokeStyle = '#ef4444'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    const startIdx = Math.max(0, validLength - 1)
    ctx.moveTo(path[startIdx].x, path[startIdx].y)
    for (let i = validLength; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y)
    }
    ctx.stroke()
  }
}

function redraw(canvas: HTMLCanvasElement, maze: Maze, path: Point[], validLength: number, hitWall: boolean) {
  const ctx = canvas.getContext('2d')!
  drawMazeBase(ctx, maze)
  drawPath(ctx, path, validLength, hitWall)
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
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

function App() {
  const [maze, setMaze] = useState<Maze | null>(null)
  const [hasPath, setHasPath] = useState(false)
  const [wallHit, setWallHit] = useState(false)
  const [won, setWon] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const pathRef = useRef<Point[]>([])
  const validPathLengthRef = useRef(0)
  const hitWallRef = useRef(false)
  const currentCellRef = useRef<Cell | null>(null)

  const handleGenerate = () => {
    isDrawingRef.current = false
    hitWallRef.current = false
    validPathLengthRef.current = 0
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
    validPathLengthRef.current = 0
    pathRef.current = []
    currentCellRef.current = null
    setHasPath(false)
    setWallHit(false)
    setWon(false)
    if (maze && canvasRef.current) {
      redraw(canvasRef.current, maze, [], 0, false)
    }
  }

  useEffect(() => {
    if (maze && canvasRef.current) {
      redraw(canvasRef.current, maze, pathRef.current, validPathLengthRef.current, hitWallRef.current)
    }
  }, [maze])

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!maze || !canvasRef.current) return
    const pos = getCanvasPos(e, canvasRef.current)

    // Resume from a point on the valid path after a wall hit
    if (hitWallRef.current) {
      const validPath = pathRef.current.slice(0, validPathLengthRef.current)
      let nearestIdx = -1
      let nearestDist = Infinity
      for (let i = 0; i < validPath.length; i++) {
        const dx = validPath[i].x - pos.x
        const dy = validPath[i].y - pos.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < CELL_SIZE && dist < nearestDist) {
          nearestDist = dist
          nearestIdx = i
        }
      }
      if (nearestIdx >= 0) {
        pathRef.current = validPath.slice(0, nearestIdx + 1)
        validPathLengthRef.current = pathRef.current.length
        hitWallRef.current = false
        currentCellRef.current = posToCell(validPath[nearestIdx], maze)
        isDrawingRef.current = true
        setWallHit(false)
        canvasRef.current.setPointerCapture(e.pointerId)
        redraw(canvasRef.current, maze, pathRef.current, validPathLengthRef.current, false)
        return
      }
    }

    // Fresh start from start cell
    const { col, row } = maze.start
    const inStart =
      pos.x >= col * CELL_SIZE && pos.x < (col + 1) * CELL_SIZE &&
      pos.y >= row * CELL_SIZE && pos.y < (row + 1) * CELL_SIZE
    if (!inStart) return
    isDrawingRef.current = true
    hitWallRef.current = false
    validPathLengthRef.current = 1
    pathRef.current = [pos]
    currentCellRef.current = { col, row }
    setHasPath(true)
    setWallHit(false)
    canvasRef.current.setPointerCapture(e.pointerId)
    redraw(canvasRef.current, maze, pathRef.current, 1, false)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || hitWallRef.current || !maze || !canvasRef.current) return
    const pos = getCanvasPos(e, canvasRef.current)
    const newCell = posToCell(pos, maze)
    const currCell = currentCellRef.current!
    if (newCell.col !== currCell.col || newCell.row !== currCell.row) {
      if (hasWallBetween(maze, currCell, newCell)) {
        hitWallRef.current = true
        isDrawingRef.current = false
        pathRef.current.push(pos)
        setWallHit(true)
        redraw(canvasRef.current, maze, pathRef.current, validPathLengthRef.current, true)
        return
      }
      currentCellRef.current = newCell
      if (newCell.col === maze.exit.col && newCell.row === maze.exit.row) {
        isDrawingRef.current = false
        pathRef.current.push(pos)
        validPathLengthRef.current = pathRef.current.length
        redraw(canvasRef.current, maze, pathRef.current, validPathLengthRef.current, false)
        setWon(true)
        return
      }
    }
    pathRef.current.push(pos)
    validPathLengthRef.current = pathRef.current.length
    redraw(canvasRef.current, maze, pathRef.current, validPathLengthRef.current, false)
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
      {wallHit && <p className="wall-hit">Hit a wall! Click on the blue path to resume, or clear to start over.</p>}
      {won && (
        <div className="win-banner">
          <p>You solved it!</p>
          <div className="win-actions">
            <button onClick={handleGenerate}>Generate new labyrinth</button>
            <button onClick={handleClearPath}>Draw again</button>
          </div>
        </div>
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
  )
}

export default App
