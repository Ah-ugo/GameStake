"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { api } from "../lib/api"
import { useAuth } from "./auth-context"

type BankDetails = {
  accountName: string
  accountNumber: string
  bankName: string
  routingNumber: string
}

type Transaction = {
  id: string
  type: "deposit" | "withdrawal" | "game"
  amount: number
  status: "pending" | "completed" | "rejected" | "won" | "lost" | "tie"
  date: string
  game_type?: string
  details?: any
}

type WalletContextType = {
  balance: number
  transactions: Transaction[]
  fetchBalance: () => Promise<void>
  fetchTransactions: () => Promise<void>
  requestDeposit: (amount: number) => Promise<void>
  requestWithdrawal: (amount: number, bankDetails: BankDetails) => Promise<void>
  updateBalance: (newBalance: number) => void
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    if (isAuthenticated) {
      fetchBalance()
      fetchTransactions()
    }
  }, [isAuthenticated])

  const fetchBalance = async () => {
    if (!isAuthenticated) return

    try {
      const response = await api.get("/wallet/balance")
      setBalance(response.data.balance)
    } catch (error) {
      console.error("Failed to fetch balance", error)
      throw error
    }
  }

  const fetchTransactions = async () => {
    if (!isAuthenticated) return

    try {
      const response = await api.get("/wallet/transactions")
      setTransactions(response.data)
    } catch (error) {
      console.error("Failed to fetch transactions", error)
      throw error
    }
  }

  const requestDeposit = async (amount: number) => {
    try {
      await api.post("/wallet/deposit", {
        amount,
      })

      // Refresh transactions after deposit request
      await fetchTransactions()
    } catch (error) {
      console.error("Failed to request deposit", error)
      throw error
    }
  }

  const requestWithdrawal = async (amount: number, bankDetails: BankDetails) => {
    try {
      await api.post("/wallet/withdraw", {
        amount,
        bank_details: {
          account_name: bankDetails.accountName,
          account_number: bankDetails.accountNumber,
          bank_name: bankDetails.bankName,
          routing_number: bankDetails.routingNumber,
        },
      })

      // Refresh balance and transactions after withdrawal request
      await Promise.all([fetchBalance(), fetchTransactions()])
    } catch (error) {
      console.error("Failed to request withdrawal", error)
      throw error
    }
  }

  const updateBalance = (newBalance: number) => {
    setBalance(newBalance)
  }

  return (
    <WalletContext.Provider
      value={{
        balance,
        transactions,
        fetchBalance,
        fetchTransactions,
        requestDeposit,
        requestWithdrawal,
        updateBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider")
  }
  return context
}
