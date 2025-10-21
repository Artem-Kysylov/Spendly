'use client'

type Props = {
  total: number
  current: number
}

export default function StepProgress({ total, current }: Props) {
  const percent = Math.min(Math.max(((current + 1) / Math.max(total, 1)) * 100, 0), 100)

  return (
    <div className="w-full">
      <div className="text-center text-xs font-medium text-gray-600 mb-2">
        {current + 1}/{total}
      </div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-blue-100 dark:bg-primary/20 transition-colors duration-300">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-in-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}