import React, { useRef, useState, useCallback } from 'react'
import styled from '@emotion/styled'
import { _, isValidEmail } from '@mailmask/utils'
import { flex } from 'emotion-styled-utils'
import { useRouter } from 'next/router'
import { toast } from 'react-toastify'

import { trackEvent } from '../analytics'
import { withApollo } from '../hoc'
import { useSafeMutation } from '../hooks'
import { RequestLoginLinkMutation } from '../../graphql/mutations'
import Button from './Button'
import QueryResult from './QueryResult'
import TextInput from './TextInput'

const Container = styled.div`
  ${({ theme }) => theme.media.when({ minW: 'mobile' })} {
    max-width: 500px;
  }
`

const Form = styled.form`
  ${flex({ direction: 'row', justify: 'center', align: 'center' })};
  margin-bottom: 0.5rem;
`

const SubmitButton = styled(Button)`
  margin-left: 0.5rem;
`

const GetStartedForm = ({ className, buttonText = 'Start', plan, schedule }) => {
  const router = useRouter()
  const [ email, setEmail ] = useState('')
  const [ isValid, setIsValid ] = useState(false)
  const [ doRequest, result ] = useSafeMutation(RequestLoginLinkMutation)

  const inputRef = useRef(null)

  const updateEmail = useCallback(newEmail => {
    if (newEmail !== email) {
      setEmail(newEmail)
      setIsValid(isValidEmail(newEmail))
    }
  }, [ email ])

  const submitEmail = useCallback(async e => {
    e.preventDefault()

    if (!isValid) {
      inputRef.current.focus()
      toast.error(`Please enter a valid email address`)
      return
    }

    const ret = await doRequest({
      variables: {
        loginLinkRequest: {
          email,
          plan,
          schedule,
        }
      }
    })

    const token = _.get(ret, 'data.result.token')

    if (token) {
      trackEvent('signup', 'RequestedLoginEmail')

      router.replace({
        pathname: `/await-email`,
        query: { token }
      })
    }
  }, [ plan, email, isValid, doRequest, router, schedule ])

  return (
    <Container className={className}>
      <Form onSubmit={submitEmail}>
        <TextInput
          ref={inputRef}
          type="email"
          value={email}
          onChange={updateEmail}
          placeholder='Your email address...'
        />
        <SubmitButton
          loading={result.loading}
          onClick={submitEmail}
        >
          {buttonText}
        </SubmitButton>
      </Form>
      <QueryResult {...result} hideLoading={true} />
    </Container>
  )
}

export default withApollo(GetStartedForm)
