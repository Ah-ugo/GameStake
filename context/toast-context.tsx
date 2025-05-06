"use client"

import { createContext, useContext, useState, useEffect, useRef } from "react"
import { StyleSheet, Text, Animated, Dimensions } from "react-native"

type ToastType = "success" | "error" | "info" | "warning"

type ToastContextType = {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }) {
  const [message, setMessage] = useState("")
  const [type, setType] = useState<ToastType>("info")
  const [visible, setVisible] = useState(false)
  const translateY = useRef(new Animated.Value(-100)).current
  const timeout = useRef<NodeJS.Timeout | null>(null)

  const showToast = (msg: string, toastType: ToastType = "info") => {
    setMessage(msg)
    setType(toastType)
    setVisible(true)

    // Clear any existing timeout
    if (timeout.current) {
      clearTimeout(timeout.current)
    }

    // Set a new timeout to hide the toast after 3 seconds
    timeout.current = setTimeout(() => {
      hideToast()
    }, 3000)
  }

  const hideToast = () => {
    setVisible(false)
  }

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
      }).start()
    } else {
      Animated.spring(translateY, {
        toValue: -100,
        useNativeDriver: true,
      }).start()
    }
  }, [visible])

  useEffect(() => {
    return () => {
      if (timeout.current) {
        clearTimeout(timeout.current)
      }
    }
  }, [])

  const getBackgroundColor = () => {
    switch (type) {
      case "success":
        return "#4CAF50"
      case "error":
        return "#F44336"
      case "warning":
        return "#FFC107"
      case "info":
      default:
        return "#2196F3"
    }
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Animated.View
        style={[
          styles.toastContainer,
          {
            transform: [{ translateY }],
            backgroundColor: getBackgroundColor(),
          },
        ]}
      >
        <Text style={styles.toastText}>{message}</Text>
      </Animated.View>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

const { width } = Dimensions.get("window")

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    top: 50,
    left: width * 0.1,
    right: width * 0.1,
    padding: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 9999,
  },
  toastText: {
    color: "#ffffff",
    fontFamily: "Poppins-SemiBold",
    fontSize: 14,
    textAlign: "center",
  },
})
