import { Input, IconButton, Copy, clx } from "@medusajs/ui"
import { Eye, EyeSlash, SquareTwoStack } from "@medusajs/icons"
import { useState, useCallback } from "react"

type SecretInputProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
}

export function SecretInput({
  value,
  onChange,
  placeholder = "Enter value...",
  disabled = false,
  className,
  id,
}: SecretInputProps) {
  const [visible, setVisible] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value)
  }, [value])

  return (
    <div className={clx("flex items-center gap-x-1", className)}>
      <Input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1"
      />
      <IconButton
        size="small"
        variant="transparent"
        type="button"
        onClick={() => setVisible(!visible)}
        disabled={disabled}
      >
        {visible ? <EyeSlash /> : <Eye />}
      </IconButton>
      {value && (
        <IconButton
          size="small"
          variant="transparent"
          type="button"
          onClick={handleCopy}
          disabled={disabled}
        >
          <SquareTwoStack />
        </IconButton>
      )}
    </div>
  )
}
