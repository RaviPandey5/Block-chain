import { useEffect, useState } from 'react'
import { useWeb3React } from '@web3-react/core'
import { Web3Provider } from '@ethersproject/providers'
import { injected } from '../lib/web3'

export function useMetaMask() {
  const context = useWeb3React<Web3Provider>()
  const { account, activate, deactivate } = context
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(false)

  // Handle connection errors
  function handleError(error: Error) {
    if (error.message.includes('No Ethereum provider')) {
      return new Error('Please install MetaMask')
    }
    if (error.message.includes('User rejected')) {
      return new Error('Please authorize MetaMask')
    }
    return error
  }

  // Connect to MetaMask
  async function connect() {
    setLoading(true)
    try {
      await activate(injected)
      setError(null)
      setActive(true)
    } catch (err) {
      setError(handleError(err as Error))
    } finally {
      setLoading(false)
    }
  }

  // Disconnect from MetaMask
  async function disconnect() {
    try {
      deactivate()
      setActive(false)
    } catch (err) {
      setError(handleError(err as Error))
    }
  }

  // Auto-connect if previously connected
  useEffect(() => {
    injected
      .isAuthorized()
      .then((isAuthorized) => {
        if (isAuthorized && !active && !error) {
          connect()
        }
      })
  }, [active, error])

  // Handle network and account changes
  useEffect(() => {
    const { ethereum } = window as any
    if (ethereum && ethereum.on) {
      const handleChainChanged = () => {
        connect()
      }
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          connect()
        } else {
          disconnect()
        }
      }

      ethereum.on('chainChanged', handleChainChanged)
      ethereum.on('accountsChanged', handleAccountsChanged)

      return () => {
        if (ethereum.removeListener) {
          ethereum.removeListener('chainChanged', handleChainChanged)
          ethereum.removeListener('accountsChanged', handleAccountsChanged)
        }
      }
    }
  }, [])

  return { active, account, connect, disconnect, error, loading }
} 