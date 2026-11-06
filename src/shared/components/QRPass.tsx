import React, { useMemo } from 'react'

interface QRPassProps {
  value: string
  size?: number
  fgColor?: string
  bgColor?: string
  className?: string
}

export function QRPass({
  value,
  size = 180,
  fgColor = '#0B192C',
  bgColor = '#FFFFFF',
  className = '',
}: QRPassProps) {
  // Deterministic 25x25 matrix generation with authentic QR finder eyes & data payload
  const matrix = useMemo(() => {
    const N = 25
    const grid: boolean[][] = Array.from({ length: N }, () => Array(N).fill(false))

    // Helper to draw standard 7x7 QR Position Detection Patterns (Finder Eyes)
    const drawFinderPattern = (startR: number, startC: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const isBorder = r === 0 || r === 6 || c === 0 || c === 6
          const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4
          grid[startR + r][startC + c] = isBorder || isInner
        }
      }
      // Separator white ring
      for (let r = -1; r <= 7; r++) {
        for (let c = -1; c <= 7; c++) {
          const tr = startR + r
          const tc = startC + c
          if (tr >= 0 && tr < N && tc >= 0 && tc < N) {
            if (r === -1 || r === 7 || c === -1 || c === 7) {
              grid[tr][tc] = false
            }
          }
        }
      }
    }

    // Draw 3 primary finder corners
    drawFinderPattern(0, 0)
    drawFinderPattern(0, N - 7)
    drawFinderPattern(N - 7, 0)

    // Timing patterns
    for (let i = 8; i < N - 8; i++) {
      grid[6][i] = i % 2 === 0
      grid[i][6] = i % 2 === 0
    }

    // Alignment pattern around (N-7, N-7)
    const ar = N - 7, ac = N - 7
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const isBorder = Math.abs(r) === 2 || Math.abs(c) === 2
        const isCenter = r === 0 && c === 0
        grid[ar + r][ac + c] = isBorder || isCenter
      }
    }

    // Populate remaining cells with payload bits derived from token hash
    let hash = 0
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i)
      hash |= 0
    }

    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        // Skip reserved finder and timing zones
        const inTopLeft = r <= 7 && c <= 7
        const inTopRight = r <= 7 && c >= N - 8
        const inBottomLeft = r >= N - 8 && c <= 7
        const inTiming = r === 6 || c === 6
        const inAlign = r >= N - 9 && r <= N - 5 && c >= N - 9 && c <= N - 5

        if (!inTopLeft && !inTopRight && !inBottomLeft && !inTiming && !inAlign) {
          const bitIndex = (r * N + c) % 31
          const pseudoBit = ((hash >> bitIndex) & 1) === 1
          const charCode = value.charCodeAt((r + c) % value.length)
          grid[r][c] = (pseudoBit && charCode % 2 === 0) || (r + c) % 3 === 0
        }
      }
    }

    return grid
  }, [value])

  const N = matrix.length
  const cellSize = size / N

  return (
    <div
      className={`inline-block p-3 rounded-xl shadow-md border border-stone-200 bg-white ${className}`}
      style={{ width: size + 24, height: size + 24 }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <rect width={size} height={size} fill={bgColor} />
        {matrix.map((row, r) =>
          row.map((cell, c) =>
            cell ? (
              <rect
                key={`${r}-${c}`}
                x={c * cellSize}
                y={r * cellSize}
                width={cellSize + 0.3}
                height={cellSize + 0.3}
                fill={fgColor}
              />
            ) : null
          )
        )}
      </svg>
    </div>
  )
}

