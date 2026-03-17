import { Button, Text, clx } from "@medusajs/ui"
import { ArrowLeft, ArrowRight, CheckCircleSolid } from "@medusajs/icons"
import { useState, type ReactNode } from "react"

export type WizardStep = {
  id: string
  label: string
  content: ReactNode
  isComplete?: boolean
  canProceed?: boolean
}

type StepWizardProps = {
  steps: WizardStep[]
  onComplete?: () => void
  currentStep?: number
  onStepChange?: (step: number) => void
}

export function StepWizard({
  steps,
  onComplete,
  currentStep: controlledStep,
  onStepChange,
}: StepWizardProps) {
  const [internalStep, setInternalStep] = useState(0)
  const currentStep = controlledStep ?? internalStep

  const setStep = (step: number) => {
    if (onStepChange) {
      onStepChange(step)
    } else {
      setInternalStep(step)
    }
  }

  const current = steps[currentStep]
  const isLast = currentStep === steps.length - 1
  const canGoNext = current?.canProceed !== false

  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex items-center gap-x-2">
        {steps.map((step, idx) => (
          <button
            key={step.id}
            type="button"
            onClick={() => idx <= currentStep && setStep(idx)}
            className={clx(
              "flex items-center gap-x-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
              idx === currentStep
                ? "bg-ui-bg-base-pressed text-ui-fg-base"
                : idx < currentStep
                  ? "text-ui-fg-subtle cursor-pointer hover:bg-ui-bg-base-hover"
                  : "text-ui-fg-disabled cursor-default"
            )}
            disabled={idx > currentStep}
          >
            {step.isComplete ? (
              <CheckCircleSolid className="text-ui-fg-interactive" />
            ) : (
              <span
                className={clx(
                  "flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium",
                  idx === currentStep
                    ? "bg-ui-fg-base text-ui-bg-base"
                    : "bg-ui-bg-switch-off text-ui-fg-on-color"
                )}
              >
                {idx + 1}
              </span>
            )}
            <Text size="small" weight={idx === currentStep ? "plus" : "regular"}>
              {step.label}
            </Text>
          </button>
        ))}
      </div>

      <div className="min-h-[200px]">{current?.content}</div>

      <div className="flex items-center justify-between border-t border-ui-border-base pt-4">
        <Button
          size="small"
          variant="secondary"
          onClick={() => setStep(currentStep - 1)}
          disabled={currentStep === 0}
          type="button"
        >
          <ArrowLeft />
          Back
        </Button>

        {isLast ? (
          <Button
            size="small"
            onClick={onComplete}
            disabled={!canGoNext}
            type="button"
          >
            Save & Activate
          </Button>
        ) : (
          <Button
            size="small"
            onClick={() => setStep(currentStep + 1)}
            disabled={!canGoNext}
            type="button"
          >
            Next
            <ArrowRight />
          </Button>
        )}
      </div>
    </div>
  )
}
