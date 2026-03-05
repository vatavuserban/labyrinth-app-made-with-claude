import { useEffect, useRef, useState } from 'react'
import './App.css'
import { generateMaze, type Maze } from './maze'

const COLS = 25
const ROWS = 40
const CELL_SIZE = 20

function drawMaze(canvas: HTMLCanvasElement, maze: Maze) {
  const ctx = canvas.getContext('2d')!
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches

  ctx.fillStyle = isDark ? '#1a1a1a' : '#f0f0f0'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Highlight start (green) and exit (red)
  ctx.fillStyle = '#22c55e'
  ctx.fillRect(
    maze.start.col * CELL_SIZE,
    maze.start.row * CELL_SIZE,
    CELL_SIZE,
    CELL_SIZE
  )
  ctx.fillStyle = '#ef4444'
  ctx.fillRect(
    maze.exit.col * CELL_SIZE,
    maze.exit.row * CELL_SIZE,
    CELL_SIZE,
    CELL_SIZE
  )

  // Draw walls
  ctx.strokeStyle = isDark ? '#ffffff' : '#111111'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let r = 0; r < maze.rows; r++) {
    for (let c = 0; c < maze.cols; c++) {
      const { walls } = maze.grid[r][c]
      const x = c * CELL_SIZE
      const y = r * CELL_SIZE
      if (walls.top) {
        ctx.moveTo(x, y)
        ctx.lineTo(x + CELL_SIZE, y)
      }
      if (walls.right) {
        ctx.moveTo(x + CELL_SIZE, y)
        ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE)
      }
      if (walls.bottom) {
        ctx.moveTo(x, y + CELL_SIZE)
        ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE)
      }
      if (walls.left) {
        ctx.moveTo(x, y)
        ctx.lineTo(x, y + CELL_SIZE)
      }
    }
  }
  ctx.stroke()

  // Labels
  ctx.fillStyle = '#000000'
  ctx.font = `bold ${CELL_SIZE * 0.6}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('S', maze.start.col * CELL_SIZE + CELL_SIZE / 2, maze.start.row * CELL_SIZE + CELL_SIZE / 2)
  ctx.fillText('E', maze.exit.col * CELL_SIZE + CELL_SIZE / 2, maze.exit.row * CELL_SIZE + CELL_SIZE / 2)
}

function App() {
  const [maze, setMaze] = useState<Maze | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleGenerate = () => {
    setMaze(generateMaze(COLS, ROWS))
  }

  useEffect(() => {
    if (maze && canvasRef.current) {
      drawMaze(canvasRef.current, maze)
    }
  }, [maze])

  return (
    <div className="app">
      <h1>React Labyrinth</h1>
      <div className="controls">
        <button onClick={handleGenerate}>Generate labyrinth</button>
      </div>
      <canvas
        ref={canvasRef}
        className="maze-container"
        width={COLS * CELL_SIZE}
        height={ROWS * CELL_SIZE}
      />
    </div>
  )
}

export default App
