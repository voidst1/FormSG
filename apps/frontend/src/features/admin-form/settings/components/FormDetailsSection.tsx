import {
  KeyboardEventHandler,
  MutableRefObject,
  useCallback,
  useEffect,
  useRef,
} from 'react'
import { Controller, RegisterOptions, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FormControl, Skeleton, Stack } from '@chakra-ui/react'
import { isEmpty } from 'lodash'

import { useFormTitleValidationRules } from '~utils/formValidation'
import FormErrorMessage from '~components/FormControl/FormErrorMessage'
import FormLabel from '~components/FormControl/FormLabel'
import Input from '~components/Input'

import { useMutateFormSettings } from '../mutations'
import { useAdminFormSettings } from '../queries'

export interface FormTitleSubmitHandle {
  validate: () => Promise<boolean>
  save: () => void
}

interface FormDetailsSectionProps {
  enableAutosave?: boolean
  submitRef?: MutableRefObject<FormTitleSubmitHandle | undefined>
}

export const FormDetailsSection = ({
  enableAutosave = true,
  submitRef,
}: FormDetailsSectionProps): JSX.Element => {
  const { data: settings, isLoading: isLoadingSettings } =
    useAdminFormSettings()

  return (
    <Skeleton isLoaded={!isLoadingSettings && !!settings}>
      <Stack spacing="2rem">
        {settings ? (
          <FormTitleInput
            initialTitle={settings.title}
            enableAutosave={enableAutosave}
            submitRef={submitRef}
          />
        ) : null}
      </Stack>
    </Skeleton>
  )
}

interface FormTitleInputProps {
  initialTitle: string
  enableAutosave?: boolean
  submitRef?: MutableRefObject<FormTitleSubmitHandle | undefined>
}

export const FormTitleInput = ({
  initialTitle,
  enableAutosave = true,
  submitRef,
}: FormTitleInputProps): JSX.Element => {
  const { t } = useTranslation()
  const { formName } = t('features.common', { returnObjects: true })
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    mode: 'onChange',
    defaultValues: {
      title: initialTitle,
    },
  })

  const { mutateFormTitle } = useMutateFormSettings()
  const formTitleValidationRules = useFormTitleValidationRules()

  const handleBlur = useCallback(() => {
    return handleSubmit(
      ({ title }) => {
        if (title === initialTitle) return

        return mutateFormTitle.mutate(title, {
          onError: () => reset(),
          onSuccess: () => reset({ title }),
        })
      },
      () => reset(),
    )()
  }, [handleSubmit, initialTitle, mutateFormTitle, reset])

  const pendingTitleRef = useRef<string | null>(null)

  const handleValidate = useCallback(
    (): Promise<boolean> =>
      new Promise((resolve) => {
        handleSubmit(
          ({ title }) => {
            pendingTitleRef.current = title === initialTitle ? null : title
            resolve(true)
          },
          () => {
            pendingTitleRef.current = null
            resolve(false)
          },
        )()
      }),
    [handleSubmit, initialTitle],
  )

  const handleSave = useCallback(() => {
    const title = pendingTitleRef.current
    if (!title) return
    pendingTitleRef.current = null
    mutateFormTitle.mutate(title, {
      onError: () => reset(),
      onSuccess: () => reset({ title }),
    })
  }, [mutateFormTitle, reset])

  useEffect(() => {
    if (submitRef)
      submitRef.current = { validate: handleValidate, save: handleSave }
  }, [submitRef, handleValidate, handleSave])

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleBlur()
      }
    },
    [handleBlur],
  )

  return (
    <FormControl isInvalid={!isEmpty(errors)}>
      <FormLabel isRequired>{formName}</FormLabel>

      <Controller<{ title: string }>
        control={control}
        name="title"
        rules={formTitleValidationRules as RegisterOptions<{ title: string }>}
        render={({ field }) => (
          <Input
            {...field}
            onBlur={enableAutosave ? handleBlur : field.onBlur}
            onKeyDown={enableAutosave ? handleKeyDown : undefined}
          />
        )}
      />
      <FormErrorMessage>{String(errors.title?.message)}</FormErrorMessage>
    </FormControl>
  )
}
