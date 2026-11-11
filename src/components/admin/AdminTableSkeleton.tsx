import React from 'react';
import { motion } from 'motion/react';

const shimmerTransition = {
  duration: 1.5,
  repeat: Infinity,
  ease: 'easeInOut' as const
};

interface AdminTableSkeletonProps {
  rows?: number;
  type?: 'reservations' | 'transactions' | 'general';
}

export const AdminTableSkeleton: React.FC<AdminTableSkeletonProps> = ({
  rows = 5,
  type = 'general'
}) => {
  return (
    <>
      {[...Array(rows)].map((_, rowIndex) => (
        <tr key={rowIndex} className="hover:bg-stone-50/50">
          {type === 'reservations' ? (
            <>
              {/* Code & Room */}
              <td className="py-4 px-4">
                <div className="space-y-1.5">
                  <motion.div 
                    animate={{ opacity: [0.45, 0.85, 0.45] }}
                    transition={{ ...shimmerTransition, delay: rowIndex * 0.08 }}
                    className="h-3.5 w-24 bg-amber-900/20 rounded font-mono" 
                  />
                  <div className="h-4 w-32 bg-stone-200 rounded" />
                </div>
              </td>
              {/* Guest & Contact */}
              <td className="py-4 px-4">
                <div className="space-y-1.5">
                  <div className="h-4 w-36 bg-stone-200 rounded" />
                  <motion.div 
                    animate={{ opacity: [0.4, 0.8, 0.4] }}
                    transition={{ ...shimmerTransition, delay: rowIndex * 0.1 }}
                    className="h-3 w-44 bg-stone-100 rounded" 
                  />
                  <div className="h-3 w-28 bg-stone-100 rounded" />
                </div>
              </td>
              {/* Dates */}
              <td className="py-4 px-4">
                <div className="space-y-1.5">
                  <div className="h-3.5 w-28 bg-stone-200 rounded" />
                  <div className="h-3 w-20 bg-stone-100 rounded" />
                </div>
              </td>
              {/* Notifications */}
              <td className="py-4 px-4">
                <motion.div 
                  animate={{ opacity: [0.45, 0.8, 0.45] }}
                  transition={{ ...shimmerTransition, delay: rowIndex * 0.05 }}
                  className="h-6 w-24 bg-stone-200/80 rounded-md" 
                />
              </td>
              {/* Status */}
              <td className="py-4 px-4">
                <motion.div 
                  animate={{ opacity: [0.5, 0.9, 0.5] }}
                  transition={{ ...shimmerTransition, delay: rowIndex * 0.08 }}
                  className="h-6 w-24 bg-stone-200 rounded-md" 
                />
              </td>
              {/* Actions */}
              <td className="py-4 px-4 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <div className="h-8 w-20 bg-stone-200 rounded-lg" />
                  <div className="h-8 w-8 bg-stone-200 rounded-lg" />
                </div>
              </td>
            </>
          ) : type === 'transactions' ? (
            <>
              {/* Payment Channel */}
              <td className="py-4 px-4">
                <motion.div 
                  animate={{ opacity: [0.5, 0.9, 0.5] }}
                  transition={{ ...shimmerTransition, delay: rowIndex * 0.06 }}
                  className="h-6 w-24 bg-stone-200 rounded-md font-mono" 
                />
              </td>
              {/* Guest & Reservation */}
              <td className="py-4 px-4">
                <div className="space-y-1.5">
                  <div className="h-4 w-32 bg-stone-200 rounded" />
                  <div className="h-3 w-28 bg-stone-100 rounded" />
                </div>
              </td>
              {/* Reference & Slip Indicator */}
              <td className="py-4 px-4">
                <div className="flex items-center gap-2">
                  <motion.div 
                    animate={{ opacity: [0.5, 0.85, 0.5] }}
                    transition={{ ...shimmerTransition, delay: rowIndex * 0.1 }}
                    className="w-10 h-10 rounded-lg bg-stone-200 shrink-0" 
                  />
                  <div className="space-y-1">
                    <div className="h-3.5 w-28 bg-stone-200 rounded font-mono" />
                    <div className="h-3 w-20 bg-stone-100 rounded" />
                  </div>
                </div>
              </td>
              {/* Amount */}
              <td className="py-4 px-4">
                <motion.div 
                  animate={{ opacity: [0.5, 0.9, 0.5] }}
                  transition={{ ...shimmerTransition, delay: rowIndex * 0.08 }}
                  className="h-5 w-24 bg-stone-200 rounded" 
                />
              </td>
              {/* Verification Status */}
              <td className="py-4 px-4">
                <div className="h-6 w-24 bg-stone-200 rounded-md" />
              </td>
              {/* Verification Actions */}
              <td className="py-4 px-4 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <div className="h-8 w-16 bg-emerald-700/20 rounded-lg" />
                  <div className="h-8 w-16 bg-rose-700/20 rounded-lg" />
                </div>
              </td>
            </>
          ) : (
            <>
              <td className="py-4 px-4">
                <div className="h-4 w-28 bg-stone-200 rounded" />
              </td>
              <td className="py-4 px-4">
                <div className="h-4 w-36 bg-stone-200 rounded" />
              </td>
              <td className="py-4 px-4">
                <div className="h-4 w-24 bg-stone-200 rounded" />
              </td>
              <td className="py-4 px-4">
                <div className="h-4 w-20 bg-stone-200 rounded" />
              </td>
              <td className="py-4 px-4">
                <div className="h-6 w-20 bg-stone-200 rounded-md" />
              </td>
              <td className="py-4 px-4 text-right">
                <div className="h-8 w-20 bg-stone-200 rounded-lg ml-auto" />
              </td>
            </>
          )}
        </tr>
      ))}
    </>
  );
};
