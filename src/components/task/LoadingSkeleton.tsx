import { motion } from 'framer-motion'

export function LoadingSkeleton() {
  return (
    <div className="space-y-16px">
      {[...Array(4)].map((_, index) => (
        <motion.div
          key={index}
          className="mb-12px rounded-12px border border-gray-100 bg-white p-12px shadow-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
        >
          <div className="mb-8px flex items-center gap-8px">
            <div className="h-18px w-18px animate-pulse rounded-full bg-gray-100" />
            <div className="h-14px w-1/3 animate-pulse rounded-4px bg-gray-100" />
          </div>
          <div className="mb-12px h-16px w-full animate-pulse rounded-4px bg-gray-100" />
          <div className="flex items-center justify-between border-t border-gray-50 pt-8px">
            <div className="h-12px w-1/4 animate-pulse rounded-4px bg-gray-50" />
            <div className="h-16px w-1/4 animate-pulse rounded-8px bg-gray-50" />
          </div>
        </motion.div>
      ))}
    </div>
  )
}
