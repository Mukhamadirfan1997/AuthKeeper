import { useState } from 'react'

interface NumpadProps {
  onInput: (digit: string) => void
  onDelete: () => void
}

export function Numpad({ onInput, onDelete }: NumpadProps) {
  const [pressedKey, setPressedKey] = useState<string | null>(null)

  const handlePress = (key: string) => {
    setPressedKey(key)
    setTimeout(() => setPressedKey(null), 150)
    if (key === '⌫') {
      onDelete()
    } else {
      onInput(key)
    }
  }

  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', '⌫'],
  ]

  return (
    <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
      {keys.flat().map((key) => {
        if (key === '') return <div key="empty" />

        const isPressed = pressedKey === key
        const isDelete = key === '⌫'

        return (
          <button
            key={key}
            onMouseDown={() => handlePress(key)}
            onTouchStart={() => handlePress(key)}
            className={`
              h-16 rounded-2xl text-2xl font-semibold
              transition-all duration-100 select-none
              ${isDelete
                ? 'bg-slate-600 text-text-primary active:bg-slate-500'
                : 'bg-slate-700/80 text-text-primary border border-slate-600/50 active:bg-slate-600'
              }
              ${isPressed ? 'scale-90 brightness-125' : 'active:scale-90'}
            `}
          >
            {key}
          </button>
        )
      })}
    </div>
  )
}
