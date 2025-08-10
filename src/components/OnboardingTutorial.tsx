'use client';
import { useState } from 'react';
import { GlassPanel } from '@/components/GlassPanel';
import { GlassButton } from '@/components/GlassButton';

interface TutorialStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  tips?: string[];
}

interface OnboardingTutorialProps {
  onClose: () => void;
  onComplete: () => void;
}

const tutorialSteps: TutorialStep[] = [
  {
    title: "Welcome to AI Dress to Impress! 🎮",
    description: "Get ready for the ultimate fashion challenge! You'll have limited time to create amazing outfits using AI tools.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    tips: ["You just created your avatar - great start!", "Now let's learn the tools you'll use"]
  },
  {
    title: "Shopping Spree Phase (2 minutes) 🛍️",
    description: "Search for real clothes on Amazon and add them to your wardrobe. You have 2 minutes to collect items!",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    tips: [
      "Use the Search tool (S) to find clothes",
      "Look for items that match today's theme",
      "Add multiple options - you can choose later!"
    ]
  },
  {
    title: "AI Edit Tool ✨",
    description: "Transform any item with AI magic! Change colors, styles, or completely reimagine pieces to fit your vision.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    tips: [
      "Press (E) to open the AI editor",
      "Describe how you want to change an item",
      "Try: 'make this red' or 'add sparkles'"
    ]
  },
  {
    title: "Your Wardrobe 👗",
    description: "View all your collected items and try them on your avatar. Mix and match to create the perfect look!",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
    tips: [
      "Press (W) to open your wardrobe",
      "Try items on your avatar instantly",
      "Combine different pieces for unique looks"
    ]
  },
  {
    title: "Styling Round (90 seconds) 🎨",
    description: "The final countdown! Use all your collected items and AI tools to create your best outfit for judging.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    tips: [
      "Final styling phase is shorter - work fast!",
      "Focus on the theme for higher scores",
      "Last-minute AI edits can make the difference"
    ]
  },
  {
    title: "Ready to Compete? 🏆",
    description: "You're all set! Remember: be creative, work fast, and have fun. The AI judge will score your final look!",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
    tips: [
      "Keyboard shortcuts: S=Search, E=Edit, W=Wardrobe, A=AI Console",
      "Watch the timer - it's your biggest challenge!",
      "Most importantly: have fun and be creative! ✨"
    ]
  }
];

export function OnboardingTutorial({ onClose, onComplete }: OnboardingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = tutorialSteps[currentStep];
  const isLastStep = currentStep === tutorialSteps.length - 1;
  const isFirstStep = currentStep === 0;

  const nextStep = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <GlassPanel className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-blue-500">
                {step.icon}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {step.title}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Step {currentStep + 1} of {tutorialSteps.length}
                </p>
              </div>
            </div>
            <GlassButton
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="w-8 h-8 p-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </GlassButton>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
            />
          </div>

          {/* Content */}
          <div className="space-y-4">
            <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed">
              {step.description}
            </p>

            {step.tips && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 space-y-2">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Pro Tips:
                </h3>
                <ul className="space-y-1">
                  {step.tips.map((tip, index) => (
                    <li key={index} className="text-blue-800 dark:text-blue-200 flex items-start gap-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-white/20">
            <div className="flex gap-2">
              {!isFirstStep && (
                <GlassButton
                  onClick={prevStep}
                  variant="ghost"
                  className="flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </GlassButton>
              )}
            </div>

            <div className="flex gap-2">
              <GlassButton
                onClick={onClose}
                variant="ghost"
              >
                Skip Tutorial
              </GlassButton>
              <GlassButton
                onClick={nextStep}
                className="flex items-center gap-2"
              >
                {isLastStep ? (
                  <>
                    Start Playing!
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                ) : (
                  <>
                    Next
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </GlassButton>
            </div>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}
