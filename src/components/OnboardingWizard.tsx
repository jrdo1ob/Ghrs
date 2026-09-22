'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { ChildIcon, TasksIcon, CheckIcon, SparkleIcon } from '@/components/icons'

interface OnboardingWizardProps {
  familyId: string
  childCount: number
  taskCount: number
  onComplete: () => void
}

const steps = [
  {
    icon: '🌱',
    title: 'مرحباً بك في غرس!',
    description: 'منصتك لبناء عادات إيجابية لدى أطفالك. ستبدأ رحلة النمو من بذرة إلى حديقة مزهرة.',
    detail: 'مع غرس، تحول الأعمال اليومية إلى مغامرة نمو ممتعة لطفلك.',
  },
  {
    icon: '👶',
    title: 'أضف أول طفل',
    description: 'أضف أطفالك لإنشاء ملفاتهم الشخصية وتخصيص مهامهم.',
    detail: 'كل طفل سيكون له رمز دخول خاص وكود PIN للحماية.',
    action: 'إضافة طفل',
    href: '/children',
  },
  {
    icon: '📋',
    title: 'أنشئ أول مهمة',
    description: 'أنشئ مهاماً مخصصة لكل طفل مع مكافآت نقاط.',
    detail: 'يمكنك تخصيص المهام حسب احتياجات عائلتك: مهام يومية، أسبوعية، أو مرهية.',
    action: 'إنشاء مهمة',
    href: '/tasks',
  },
  {
    icon: '🔗',
    title: 'شارك كود الدخول',
    description: 'شارك رمز الدخول مع طفلك عبر واتساب أو انسخه.',
    detail: 'طفلك سيستخدم الرمز ورمز PIN للدخول ورؤية مهامه.',
  },
  {
    icon: '🎉',
    title: 'اعتمد وكافئ!',
    description: 'عندما ينجز طفلك مهمة، اعتمدها واحصل على مكافأة فورية.',
    detail: '.points dots reward.糖果 reward. stars reward.',
  },
]

export default function OnboardingWizard({ familyId, childCount, taskCount, onComplete }: OnboardingWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  // Determine starting step based on family state
  useEffect(() => {
    const storageKey = `ghrs-onboarding-completed:${familyId}`
    const completed = localStorage.getItem(storageKey)
    if (completed === 'true') {
      onComplete()
      return
    }

    // Contextual starting step
    let startStep = 0
    if (childCount === 0) {
      startStep = 1 // "Add your first child"
    } else if (taskCount === 0) {
      startStep = 2 // "Create your first task"
    } else {
      startStep = 3 // Skip to "Share login code"
    }

    setCurrentStep(startStep)
    setIsVisible(true)
  }, [familyId, childCount, taskCount, onComplete])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    handleComplete()
  }

  const handleComplete = () => {
    const storageKey = `ghrs-onboarding-completed:${familyId}`
    localStorage.setItem(storageKey, 'true')
    setIsVisible(false)
    onComplete()
  }

  const handleAction = () => {
    const step = steps[currentStep]
    if (step.href) {
      handleComplete()
      router.push(step.href)
    }
  }

  const step = steps[currentStep]
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === steps.length - 1

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.6)' }}
      >
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="bg-[var(--ghrs-bg-card)] rounded-2xl p-6 w-full max-w-md shadow-xl"
        >
          {/* Step indicator */}
          <div className="flex justify-center gap-2 mb-4">
            {steps.map((_, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full transition-colors"
                style={{
                  background: i === currentStep
                    ? 'var(--ghrs-green-500)'
                    : i < currentStep
                      ? 'var(--ghrs-green-300)'
                      : 'var(--ghrs-border-default)',
                }}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-[var(--ghrs-green-50)] flex items-center justify-center text-5xl">
              {step.icon}
            </div>
          </div>

          {/* Content */}
          <h2
            className="text-xl font-bold text-center mb-2"
            style={{ color: 'var(--ghrs-text-primary)' }}
          >
            {step.title}
          </h2>
          <p
            className="text-sm text-center mb-2"
            style={{ color: 'var(--ghrs-text-secondary)' }}
          >
            {step.description}
          </p>
          <p
            className="text-xs text-center mb-6"
            style={{ color: 'var(--ghrs-text-tertiary)' }}
          >
            {step.detail}
          </p>

          {/* Action button (if step has one) */}
          {step.href && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAction}
              className="w-full px-4 py-3 rounded-xl font-bold text-white mb-3 transition-colors"
              style={{ background: 'var(--ghrs-green-600)' }}
            >
              {step.action}
            </motion.button>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3">
            {!isFirstStep && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleBack}
                className="flex-1 px-4 py-2.5 rounded-xl font-semibold transition-colors"
                style={{
                  background: 'var(--ghrs-bg-tertiary)',
                  color: 'var(--ghrs-text-primary)',
                }}
              >
                السابق
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={isLastStep ? handleComplete : handleNext}
              className="flex-1 px-4 py-2.5 rounded-xl font-bold text-white transition-colors"
              style={{ background: 'var(--ghrs-green-600)' }}
            >
              {isLastStep ? 'ابدأ الرحلة' : 'التالي'}
            </motion.button>
          </div>

          {/* Skip button */}
          <button
            onClick={handleSkip}
            className="w-full mt-3 py-2 text-sm font-semibold transition-colors"
            style={{ color: 'var(--ghrs-text-tertiary)' }}
          >
            تخطي
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
