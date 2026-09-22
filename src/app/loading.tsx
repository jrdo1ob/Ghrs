'use client'

import { motion } from 'framer-motion'
import PageLoader from '@/components/PageLoader'

export default function Loading() {
  return <PageLoader icon="🌱" text="جاري التحميل..." fullScreen />
}
