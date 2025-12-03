import { useRouter } from '@/i18n/routing'
import { Sparkles } from 'lucide-react'
import { motion } from 'motion/react'
import { useInsightHeuristics } from '@/hooks/useInsightHeuristics'
import { Transaction } from '@/types/types'

interface AiInsightTeaserProps {
    budget: number
    totalExpenses: number
    transactions: Transaction[]
}

export default function AiInsightTeaser({ budget, totalExpenses, transactions }: AiInsightTeaserProps) {
    const router = useRouter()
    const { message, type } = useInsightHeuristics({ budget, totalExpenses, transactions })

    const getStyles = () => {
        switch (type) {
            case 'alert': return 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-300'
            case 'praise': return 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-900/50 dark:text-green-300'
            case 'savings': return 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-900/50 dark:text-blue-300'
            default: return 'bg-primary/5 border-primary/20 text-primary dark:bg-primary/10 dark:border-primary/30'
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className={`rounded-lg border p-4 cursor-pointer flex items-center gap-3 min-w-0 overflow-hidden ${getStyles()}`}
            onClick={() => router.push('/ai-assistant')}
        >
            <div className="p-2 bg-white/50 dark:bg-black/20 rounded-full">
                <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-medium text-sm flex-1 min-w-0 truncate">{message}</span>
        </motion.div>
    )
}