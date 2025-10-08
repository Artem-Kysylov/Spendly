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
            <p className="text-xs font-medium text-white mb-3 sticky top-0 bg-black py-1">Quick questions:</p>
            <div className="grid grid-cols-1 gap-2">
                {presets.map((preset) => (
                    <button
                        key={preset.id}
                        onClick={() => onSelectPreset(preset.prompt)}
                        className="w-full text-left px-3 py-2.5 text-xs bg-gray-800 hover:bg-gray-700 text-white rounded-full transition-all duration-200 border border-gray-700 touch-manipulation"
                    >
                        {preset.title}
                    </button>
                ))}
            </div>
        </div>
    )
}