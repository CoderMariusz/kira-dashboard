'use client'
// components/home/household/InviteForm.tsx
// Formularz zaproszenia do household (POST /api/home/household/invite)
// STORY-4.7

import { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useSendInvite } from '@/hooks/home/useInvites'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface InviteFormProps {
  onSuccess?: () => void   // callback po sukcesie (np. refetch PendingInvites)
}

export function InviteForm({ onSuccess }: InviteFormProps) {
  const [email, setEmail]       = useState('')
  const [emailError, setEmailError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const { sendInvite, isPending } = useSendInvite({
    onSuccess: (invite) => {
      toast.success(`Zaproszenie wysłane do ${invite.email}`, {
        duration: 3000,
        style: { background: '#1a3a1a', border: '1px solid #2a5a2a', color: '#4ade80' },
      })
      setEmail('')
      setEmailError('')
      onSuccess?.()
    },
    onError: (msg, field) => {
      if (field === 'email' || !field) {
        setEmailError(msg)
        inputRef.current?.focus()
      } else {
        toast.error(msg, {
          duration: 5000,
          style: { background: '#3a1a1a', border: '1px solid #5a2a2a', color: '#f87171' },
        })
      }
    },
  })

  const validate = useCallback((val: string): boolean => {
    if (!val.trim() || !EMAIL_REGEX.test(val)) {
      setEmailError('Podaj poprawny adres email')
      inputRef.current?.focus()
      return false
    }
    setEmailError('')
    return true
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate(email)) return
    await sendInvite(email.trim())
  }, [email, validate, sendInvite])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    if (emailError) setEmailError('')
  }, [emailError])

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="flex gap-2 items-start flex-wrap sm:flex-nowrap">
        <div className="flex-1 w-full">
          <input
            ref={inputRef}
            id="invite-email"
            type="email"
            value={email}
            onChange={handleChange}
            placeholder="adres@email.com"
            disabled={isPending}
            aria-label="Adres email do zaproszenia"
            aria-invalid={emailError ? 'true' : undefined}
            aria-describedby={emailError ? 'invite-email-error' : undefined}
            className="w-full rounded-lg px-3 py-2 text-[13px] outline-none transition-colors disabled:opacity-50"
            style={{
              background: '#13111c',
              border: `1px solid ${emailError ? '#dc2626' : '#2a2540'}`,
              color: '#e6edf3',
            }}
          />
          {emailError && (
            <p
              id="invite-email-error"
              role="alert"
              style={{ color: '#f85149', fontSize: '11px', marginTop: '4px' }}
            >
              {emailError}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isPending}
          className="whitespace-nowrap"
          style={{ background: '#818cf8', color: '#fff', fontWeight: 600 }}
        >
          {isPending ? 'Wysyłanie…' : 'Zaproś do household'}
        </Button>
      </div>
    </form>
  )
}
