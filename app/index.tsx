"use client"

import { useRouter } from "expo-router"
import { useEffect } from "react"
import { StyleSheet, Text, View, Image } from "react-native"
import Animated, { FadeIn, FadeOut } from "react-native-reanimated"
import { useAuth } from "../context/auth-context"
import LottieView from "lottie-react-native"

export default function SplashScreen() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isLoading) {
        router.replace(isAuthenticated ? "/home" : "/auth/login")
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [isLoading, isAuthenticated, router])

  return (
    <Animated.View entering={FadeIn.duration(500)} exiting={FadeOut.duration(500)} style={styles.container}>
      <View style={styles.content}>
        <Image source={require("../assets/images/logo.png")} style={styles.logo} />
        <Text style={styles.title}>GameStake</Text>
        <Text style={styles.subtitle}>Test your luck, win big!</Text>
        <View style={styles.lottieContainer}>
          <LottieView source={require("../assets/animations/loading.json")} autoPlay loop style={styles.lottie} />
        </View>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontFamily: "Poppins-Bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#9e9e9e",
    marginBottom: 40,
  },
  lottieContainer: {
    width: 100,
    height: 100,
  },
  lottie: {
    width: "100%",
    height: "100%",
  },
})
