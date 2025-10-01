'use client'

import { ChatPreset } from '@/types/types'

interface ChatPresetsProps {
    onSelectPreset: (prompt: string) => Promise<void>
}

const presets: ChatPreset[] = [
    {
        id: '1',
        title: 'Show my expenses for this week',
        prompt: 'Show my expenses for this week'
    },
    {
        id: '2',
        title: 'Where can I save money?',
        prompt: 'Where can I save money?'
    },
    {
        id: '3',
        title: 'Analyze my spending patterns',
        prompt: 'Analyze my spending patterns'
    },
    {
        id: '4',
        title: 'Create a budget plan',
        prompt: 'Create a budget plan'
    },
    {
        id: '5',
        title: 'Show my biggest expenses',
        prompt: 'Show my biggest expenses'
    },
    {
        id: '6',
        title: 'Compare this month vs last month',
        prompt: 'Compare this month vs last month'
    }
]

export const ChatPresets = ({ onSelectPreset }: ChatPresetsProps) => {
    return (
        <div className="space-y-2">
            <p className="text-xs font-medium text-gray-700 mb-3 sticky top-0 bg-white/80 backdrop-blur-sm py-1">Quick questions:</p>
            <div className="grid grid-cols-1 gap-2">
                {presets.map((preset) => (
                    <button
                        key={preset.id}
                        onClick={() => onSelectPreset(preset.prompt)}
                        className="w-full text-left px-3 py-2.5 text-xs bg-blue-50/70 hover:bg-blue-100/80 text-blue-700 rounded-full transition-all duration-200 border border-blue-200/50 hover:border-blue-300/70 hover:shadow-sm touch-manipulation"
                    >
                        {preset.title}
                    </button>
                ))}
            </div>
        </div>
    )
}