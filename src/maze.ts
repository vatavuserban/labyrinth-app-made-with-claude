export interface Cell {
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
}

export interface Maze {
  grid: Cell[][];
  cols: number;
  rows: number;
  start: { col: number; row: number };
  exit: { col: number; row: number };
}

export function generateMaze(cols: number, rows: number): Maze {
  const grid: Cell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      walls: { top: true, right: true, bottom: true, left: true },
    }))
  );

  const visited = Array.from({ length: rows }, () => new Array<boolean>(cols).fill(false));

  // Iterative recursive backtracker to avoid stack overflow on large grids
  const stack: Array<{ col: number; row: number }> = [{ col: 0, row: 0 }];
  visited[0][0] = true;

  const dirs = [
    { dc: 0, dr: -1, wall: 'top' as const, opposite: 'bottom' as const },
    { dc: 1, dr: 0, wall: 'right' as const, opposite: 'left' as const },
    { dc: 0, dr: 1, wall: 'bottom' as const, opposite: 'top' as const },
    { dc: -1, dr: 0, wall: 'left' as const, opposite: 'right' as const },
  ];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const { col, row } = current;

    const neighbors = shuffle(
      dirs
        .map(({ dc, dr, wall, opposite }) => ({
          nc: col + dc,
          nr: row + dr,
          wall,
          opposite,
        }))
        .filter(({ nc, nr }) => nc >= 0 && nc < cols && nr >= 0 && nr < rows && !visited[nr][nc])
    );

    if (neighbors.length === 0) {
      stack.pop();
    } else {
      const { nc, nr, wall, opposite } = neighbors[0];
      grid[row][col].walls[wall] = false;
      grid[nr][nc].walls[opposite] = false;
      visited[nr][nc] = true;
      stack.push({ col: nc, row: nr });
    }
  }

  return {
    grid,
    cols,
    rows,
    start: { col: 0, row: 0 },
    exit: { col: cols - 1, row: rows - 1 },
  };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
