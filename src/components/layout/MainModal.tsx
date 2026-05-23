import { motion } from 'framer-motion'

import { Dashboard } from './Dashboard'

import type { Variants } from 'framer-motion'

const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    x: 400, // 오른쪽 화면 밖에서 시작
  },
  visible: {
    opacity: 1,
    x: 0, // 원래 위치로 슬라이드
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 24,
      mass: 0.8,
    },
  },
  exit: {
    opacity: 0,
    x: 400, // 다시 오른쪽으로 사라짐
    transition: {
      ease: 'easeInOut',
      duration: 0.2,
    },
  },
}

export function MainModal() {
  return (
    <motion.div
      variants={modalVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      // pointer-events-auto를 추가하여 최상위 호스트의 'none' 설정을 덮어쓰고 클릭을 허용합니다.
      className="fixed bottom-96px right-25px z-[2147483647] h-600px w-350px origin-right overflow-hidden rounded-36px bg-slate-100 shadow-[0_0_100px_0_rgba(0,0,0,0.2)] backdrop-blur-sm pointer-events-auto"
    >
      <Dashboard />
    </motion.div>
  )
}
