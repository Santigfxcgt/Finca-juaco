import React from 'react';
import { motion } from 'motion/react';

const shimmerTransition = {
  duration: 1.5,
  repeat: Infinity,
  ease: 'easeInOut' as const
};

export const RoomCardSkeleton: React.FC<{ index?: number }> = ({ index = 0 }) => {
  return (
    <motion.article
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="bg-white rounded-3xl border border-[#D7C7B2]/70 overflow-hidden flex flex-col lg:flex-row shadow-xs select-none"
    >
      {/* 1. Large Format Photography Skeleton */}
      <div className="relative lg:w-5/12 aspect-16/10 lg:aspect-auto bg-stone-200/80 overflow-hidden shrink-0 min-h-[260px]">
        <motion.div
          animate={{ opacity: [0.45, 0.85, 0.45] }}
          transition={shimmerTransition}
          className="w-full h-full bg-gradient-to-r from-stone-200 via-stone-100 to-stone-200"
        />
        {/* Badges placeholder */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <motion.div 
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={shimmerTransition}
            className="w-16 h-6 rounded-md bg-[#005400]/25" 
          />
          <motion.div 
            animate={{ opacity: [0.5, 0.9, 0.5] }}
            transition={shimmerTransition}
            className="w-20 h-6 rounded-md bg-stone-800/30 backdrop-blur-xs" 
          />
        </div>
        {/* Photo museum counter placeholder */}
        <div className="absolute bottom-3 right-3 w-16 h-5 rounded-md bg-stone-800/30 backdrop-blur-xs" />
      </div>

      {/* 2. Editorial Room Content Skeleton */}
      <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between space-y-6">
        <div>
          {/* Header & Title line */}
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 mb-3">
            <motion.div
              animate={{ opacity: [0.45, 0.85, 0.45] }}
              transition={shimmerTransition}
              className="h-7 sm:h-8 w-3/5 bg-stone-200 rounded-lg"
            />
            <div className="h-5 w-24 bg-stone-200/70 rounded-md" />
          </div>

          {/* Metadata line with middots */}
          <div className="flex items-center gap-2.5 mb-4">
            <motion.div 
              animate={{ opacity: [0.5, 0.9, 0.5] }}
              transition={shimmerTransition}
              className="h-4 w-32 bg-[#005400]/15 rounded-md" 
            />
            <span className="text-stone-300">·</span>
            <div className="h-4 w-28 bg-stone-200 rounded-md" />
            <span className="text-stone-300">·</span>
            <div className="h-4 w-36 bg-stone-200/80 rounded-md" />
          </div>

          {/* Description lines */}
          <div className="space-y-2 mb-5">
            <motion.div 
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={shimmerTransition}
              className="h-3.5 w-full bg-stone-200/80 rounded" 
            />
            <motion.div 
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={shimmerTransition}
              className="h-3.5 w-4/5 bg-stone-200/70 rounded" 
            />
          </div>

          {/* Amenities block tone step placeholder */}
          <div className="bg-[#FAF8F5] rounded-2xl p-3.5 border border-[#D7C7B2]/30">
            <div className="h-3 w-36 bg-stone-300/70 rounded mb-3" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-[#005400]/20 shrink-0" />
                  <motion.div 
                    animate={{ opacity: [0.4, 0.8, 0.4] }}
                    transition={{ ...shimmerTransition, delay: i * 0.08 }}
                    className="h-3 w-20 bg-stone-200 rounded" 
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pricing and Action Footer */}
        <div className="pt-4 border-t border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <motion.div 
              animate={{ opacity: [0.45, 0.85, 0.45] }}
              transition={shimmerTransition}
              className="h-7 w-36 bg-[#330757]/15 rounded-lg" 
            />
            <div className="h-3 w-44 bg-stone-200/70 rounded" />
          </div>
          <motion.div 
            animate={{ opacity: [0.6, 0.9, 0.6] }}
            transition={shimmerTransition}
            className="min-h-[44px] w-44 bg-[#005400]/30 rounded-xl" 
          />
        </div>
      </div>
    </motion.article>
  );
};
