"use client";

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import LottieView from "lottie-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
// import { ScrollView } from "react-native-gesture-handler";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Circle, Rect, Svg } from "react-native-svg";
import { useToast } from "../../context/toast-context";
import { useWallet } from "../../context/wallet-context";
import { api } from "../../lib/api";

const { width } = Dimensions.get("window");
const Lottie = Platform.select({
  native: () => require("lottie-react-native").default,
  default: () => require("@lottiefiles/dotlottie-react").DotLottieReact,
})();

// Slot symbols
const SYMBOLS = ["🍒", "🍋", "🍊", "🍇", "💎", "7️⃣", "🎰"];

// Symbol payouts
const PAYOUTS = {
  "🍒": 2,
  "🍋": 3,
  "🍊": 4,
  "🍇": 5,
  "💎": 10,
  "7️⃣": 15,
  "🎰": 20,
};

// Mock result for offline testing - will only be used if API fails
const MOCK_RESULTS = [
  { symbols: ["🍒", "🍒", "🍒"], won: true, multiplier: 2 },
  { symbols: ["🍋", "🍋", "🍋"], won: true, multiplier: 3 },
  { symbols: ["🍊", "🍊", "🍊"], won: true, multiplier: 4 },
  { symbols: ["🍇", "🍇", "🍇"], won: true, multiplier: 5 },
  { symbols: ["💎", "💎", "💎"], won: true, multiplier: 10 },
  { symbols: ["7️⃣", "7️⃣", "7️⃣"], won: true, multiplier: 15 },
  { symbols: ["🎰", "🎰", "🎰"], won: true, multiplier: 20 },
  { symbols: ["🍒", "🍋", "🍊"], won: false, multiplier: 0 },
  { symbols: ["🍇", "💎", "7️⃣"], won: false, multiplier: 0 },
  { symbols: ["🎰", "🍒", "🍋"], won: false, multiplier: 0 },
];

export default function SlotMachineScreen() {
  const router = useRouter();
  const { balance, fetchBalance, updateBalanceLocally } = useWallet();
  const { showToast } = useToast();
  const [betAmount, setBetAmount] = useState("");
  const [reels, setReels] = useState(["❓", "❓", "❓"]);
  const [gameState, setGameState] = useState("idle"); // idle, loading, playing, won, lost
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiAttempts, setApiAttempts] = useState(0);
  const [useOfflineMode, setUseOfflineMode] = useState(false);
  const confettiRef = useRef(null);
  const buttonRef = useRef(null);

  const reel1Position = useSharedValue(0);
  const reel2Position = useSharedValue(0);
  const reel3Position = useSharedValue(0);
  const leverRotation = useSharedValue(0);

  useEffect(() => {
    fetchBalance();
  }, []);

  // Debug logging for button presses
  useEffect(() => {
    if (isSubmitting) {
      console.log("Button is currently disabled - submission in progress");
    }
  }, [isSubmitting]);

  const reel1Style = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: reel1Position.value }],
    };
  });

  const reel2Style = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: reel2Position.value }],
    };
  });

  const reel3Style = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: reel3Position.value }],
    };
  });

  const leverStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: -20 }, // Pivot point
        { rotate: `${leverRotation.value}deg` },
        { translateX: 20 }, // Restore position
      ],
    };
  });

  const animateReels = (finalSymbols: any) => {
    console.log("Animating reels with symbols:", finalSymbols);

    // Pull the lever
    leverRotation.value = withSequence(
      withTiming(45, { duration: 200, easing: Easing.bounce }),
      withDelay(600, withTiming(0, { duration: 200 }))
    );

    // Animate each reel with different durations for a staggered effect
    const reelHeight = 80;
    const spinAmount = 10 * reelHeight; // Spin through 10 symbols for effect (reduced from 20)

    // Reset positions
    reel1Position.value = 0;
    reel2Position.value = 0;
    reel3Position.value = 0;

    // Animate reel 1 (faster)
    reel1Position.value = withSequence(
      withTiming(-spinAmount, {
        duration: 600,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }),
      withTiming(-spinAmount + reelHeight * SYMBOLS.indexOf(finalSymbols[0]), {
        duration: 200,
      })
    );

    // Animate reel 2 (slightly delayed and faster)
    reel2Position.value = withDelay(
      100,
      withSequence(
        withTiming(-spinAmount, {
          duration: 800,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        }),
        withTiming(
          -spinAmount + reelHeight * SYMBOLS.indexOf(finalSymbols[1]),
          { duration: 200 }
        )
      )
    );

    // Animate reel 3 (more delayed and faster)
    reel3Position.value = withDelay(
      200,
      withSequence(
        withTiming(-spinAmount, {
          duration: 1000,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        }),
        withTiming(
          -spinAmount + reelHeight * SYMBOLS.indexOf(finalSymbols[2]),
          { duration: 200 }
        )
      )
    );
  };

  // Function to get a random mock result for offline mode
  const getMockResult = (betAmount: any) => {
    const randomIndex = Math.floor(Math.random() * MOCK_RESULTS.length);
    const mockResult = MOCK_RESULTS[randomIndex];

    return {
      result: {
        ...mockResult,
        amount: mockResult.won ? betAmount * mockResult.multiplier : 0,
      },
    };
  };

  // Offer offline mode if API fails repeatedly
  const offerOfflineMode = () => {
    Alert.alert(
      "Connection Issues",
      "Would you like to play in offline mode? Note: This will use simulated results and not affect your actual balance.",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => setIsSubmitting(false),
        },
        {
          text: "Play Offline",
          onPress: () => {
            setUseOfflineMode(true);
            handleSpin(true);
          },
        },
      ]
    );
  };

  // const handleSpin = async (offlineMode = useOfflineMode) => {
  //   console.log("Spin button pressed, current state:", {
  //     gameState,
  //     isSubmitting,
  //     offlineMode,
  //   });

  //   // Prevent multiple submissions
  //   if (isSubmitting) {
  //     console.log("Ignoring button press - submission already in progress");
  //     return;
  //   }

  //   const amount = Number.parseFloat(betAmount);
  //   if (isNaN(amount) || amount <= 0) {
  //     setError("Please enter a valid bet amount");
  //     return;
  //   }

  //   if (amount > balance && !offlineMode) {
  //     setError("Insufficient balance");
  //     return;
  //   }

  //   setError("");
  //   setIsSubmitting(true);
  //   setGameState("loading");
  //   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  //   console.log("Starting spin with bet amount:", amount);

  //   try {
  //     let response;

  //     if (offlineMode) {
  //       // Use mock data in offline mode
  //       console.log("Using offline mode with mock data");
  //       response = { data: getMockResult(amount) };
  //       // Simulate network delay
  //       await new Promise((resolve) => setTimeout(resolve, 500));
  //     } else {
  //       // Attempt API call with timeout
  //       console.log("Attempting API call");
  //       const controller = new AbortController();
  //       const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

  //       try {
  //         response = await api.post(
  //           "/games/play/slot-machine",
  //           {
  //             bet_amount: amount,
  //           },
  //           { signal: controller.signal }
  //         );

  //         clearTimeout(timeoutId);
  //         console.log("API call successful");
  //         setApiAttempts(0); // Reset attempts on success
  //       } catch (err) {
  //         clearTimeout(timeoutId);
  //         console.error("API call failed:", err);

  //         // Increment API attempt counter
  //         const newAttempts = apiAttempts + 1;
  //         setApiAttempts(newAttempts);

  //         // After 3 failed attempts, offer offline mode
  //         if (newAttempts >= 3) {
  //           offerOfflineMode();
  //           return;
  //         }

  //         throw err; // Re-throw to be caught by outer catch
  //       }
  //     }

  //     const { result: gameResult } = response.data;

  //     // Extract symbols from the result
  //     const resultSymbols = gameResult.symbols;
  //     console.log("Got result symbols:", resultSymbols);

  //     // Change state to playing to show the animation
  //     setGameState("playing");
  //     animateReels(resultSymbols);

  //     // Wait for animation to complete
  //     setTimeout(() => {
  //       console.log("Animation complete, updating UI");
  //       setReels(resultSymbols);

  //       const won = gameResult.won;
  //       const winAmount = won ? amount * gameResult.multiplier : 0;

  //       setResult({
  //         symbols: resultSymbols,
  //         won,
  //         multiplier: gameResult.multiplier,
  //         amount: winAmount,
  //       });

  //       setGameState(won ? "won" : "lost");

  //       if (!offlineMode) {
  //         fetchBalance(); // Refresh balance after game
  //       } else {
  //         // Update balance locally in offline mode
  //         if (won) {
  //           updateBalanceLocally(balance + winAmount - amount);
  //         } else {
  //           updateBalanceLocally(balance - amount);
  //         }
  //       }

  //       if (won) {
  //         confettiRef.current?.play();
  //         Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  //         showToast(`You won $${winAmount.toFixed(2)}!`, "success");
  //       } else {
  //         Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  //         showToast(`You lost $${amount.toFixed(2)}`, "error");
  //       }

  //       setIsSubmitting(false);
  //       console.log("Game complete, ready for next spin");
  //     }, 1500);
  //   } catch (err) {
  //     console.error("Error in handleSpin:", err);
  //     setError(
  //       err.response?.data?.detail || "Something went wrong. Please try again."
  //     );
  //     setGameState("idle");
  //     showToast("Failed to place bet", "error");
  //     setIsSubmitting(false);
  //   }
  // };

  const handleSpin = async (offlineModeParam: any) => {
    // Use current state value instead of default parameter to avoid stale closure
    const offlineMode = offlineModeParam ?? useOfflineMode;

    console.log("Spin button pressed, current state:", {
      gameState,
      isSubmitting,
      offlineMode,
    });

    // Prevent multiple submissions
    if (isSubmitting) {
      console.log("Ignoring button press - submission already in progress");
      return;
    }

    const amount = Number.parseFloat(betAmount);
    if (isNaN(amount) || amount < 10) {
      setError("Please enter a valid bet amount greater than or equal to ₦10");
      return;
    }

    if (amount > balance && !offlineMode) {
      setError("Insufficient balance");
      return;
    }

    setError("");
    setIsSubmitting(true);
    setGameState("loading");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    console.log("Starting spin with bet amount:", amount);

    try {
      let response;

      if (offlineMode) {
        // Use mock data in offline mode
        console.log("Using offline mode with mock data");
        response = { data: getMockResult(amount) };
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 500));
      } else {
        // Attempt API call with timeout
        console.log("Attempting API call");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
          response = await api.post(
            "/games/play/slot-machine",
            { bet_amount: amount },
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);
          console.log("API call successful");
          setApiAttempts(0);
        } catch (err) {
          clearTimeout(timeoutId);
          console.error("API call failed:", err);
          const newAttempts = apiAttempts + 1;
          setApiAttempts(newAttempts);

          if (newAttempts >= 3) {
            offerOfflineMode();
            return;
          }
          throw err;
        }
      }

      const { result: gameResult } = response.data;
      const resultSymbols = gameResult.symbols;
      console.log("Got result symbols:", resultSymbols);

      setGameState("playing");
      animateReels(resultSymbols);

      setTimeout(() => {
        console.log("Animation complete, updating UI");
        setReels(resultSymbols);

        const won = gameResult.won;
        const winAmount = won ? amount * gameResult.multiplier : 0;

        setResult({
          symbols: resultSymbols,
          won,
          multiplier: gameResult.multiplier,
          amount: winAmount,
        });

        setGameState(won ? "won" : "lost");

        if (!offlineMode) {
          fetchBalance();
        } else {
          const newBalance = won
            ? balance + winAmount - amount
            : balance - amount;
          updateBalanceLocally(newBalance);
        }

        if (won) {
          confettiRef.current?.play();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showToast(`You won $${winAmount.toFixed(2)}!`, "success");
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          showToast(`You lost $${amount.toFixed(2)}`, "error");
        }

        setIsSubmitting(false);
        console.log("Game complete, ready for next spin");
      }, 1500);
    } catch (err: any) {
      console.error("Error in handleSpin:", err);
      setError(
        err.response?.data?.detail || "Something went wrong. Please try again."
      );
      setGameState("idle");
      showToast("Failed to place bet", "error");
      setIsSubmitting(false);
    }
  };

  const resetGame = () => {
    console.log("Resetting game");
    setBetAmount("");
    setReels(["❓", "❓", "❓"]);
    setGameState("idle");
    setResult(null);
    setError("");
    reel1Position.value = 0;
    reel2Position.value = 0;
    reel3Position.value = 0;
    setIsSubmitting(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.title}>Slot Machine</Text>
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceText}>₦{balance.toFixed(2)}</Text>
          {useOfflineMode && (
            <Text style={styles.offlineIndicator}>OFFLINE</Text>
          )}
        </View>
      </View>

      <View style={styles.gameContainer}>
        <View style={styles.slotMachineContainer}>
          <SlotMachineSvg />

          <View style={styles.reelsContainer}>
            <View style={styles.reelWindow}>
              <Animated.View style={[styles.reel, reel1Style]}>
                {SYMBOLS.map((symbol, index) => (
                  <Text key={`reel1-${index}`} style={styles.reelSymbol}>
                    {symbol}
                  </Text>
                ))}
              </Animated.View>
            </View>

            <View style={styles.reelWindow}>
              <Animated.View style={[styles.reel, reel2Style]}>
                {SYMBOLS.map((symbol, index) => (
                  <Text key={`reel2-${index}`} style={styles.reelSymbol}>
                    {symbol}
                  </Text>
                ))}
              </Animated.View>
            </View>

            <View style={styles.reelWindow}>
              <Animated.View style={[styles.reel, reel3Style]}>
                {SYMBOLS.map((symbol, index) => (
                  <Text key={`reel3-${index}`} style={styles.reelSymbol}>
                    {symbol}
                  </Text>
                ))}
              </Animated.View>
            </View>
          </View>

          <Animated.View style={[styles.lever, leverStyle]}>
            <View style={styles.leverHandle} />
            <View style={styles.leverKnob} />
          </Animated.View>
        </View>

        <ScrollView
          style={{ width: "100%", marginBottom: 50 }}
          // keyboardShouldPersistTaps={true}
          keyboardShouldPersistTaps="always"
        >
          {gameState === "idle" && (
            <Animated.View
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(300)}
              style={styles.controlsContainer}
            >
              <Text style={styles.gameDescription}>
                Spin the reels and match symbols to win! Different symbols have
                different payouts.
              </Text>

              <View style={styles.payoutsContainer}>
                <Text style={styles.payoutsTitle}>Symbol Payouts:</Text>
                <View style={styles.payoutsList}>
                  {Object.entries(PAYOUTS).map(
                    ([symbol, multiplier], index) => (
                      <View key={index} style={styles.payoutItem}>
                        <Text style={styles.payoutSymbol}>{symbol}</Text>
                        <Text style={styles.payoutMultiplier}>
                          {multiplier}x
                        </Text>
                      </View>
                    )
                  )}
                </View>
              </View>

              <Text style={styles.betLabel}>Enter bet amount:</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.dollarSign}>₦</Text>
                <TextInput
                  style={styles.betInput}
                  keyboardType="numeric"
                  value={betAmount}
                  onChangeText={setBetAmount}
                  placeholder="0.00"
                  placeholderTextColor="#9e9e9e"
                />
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                ref={buttonRef}
                onPress={() => {
                  console.log("Button pressed");
                  handleSpin();
                }}
                // onPress={() => console.log("TEST BUTTON WORKED")}
                style={[
                  styles.spinButtonContainer,
                  isSubmitting && styles.disabledButton,
                ]}
                disabled={isSubmitting}
                activeOpacity={0.7} // Make it more responsive
              >
                <LinearGradient
                  colors={["#FC466B", "#3F5EFB"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.spinButton}
                >
                  <Text style={styles.spinButtonText}>
                    {isSubmitting ? "Processing..." : "Spin Reels"}
                  </Text>
                  {isSubmitting && (
                    <ActivityIndicator
                      size="small"
                      color="#ffffff"
                      style={styles.buttonLoader}
                    />
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}

          {gameState === "loading" && (
            <Animated.View
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(300)}
              style={styles.loadingContainer}
            >
              <ActivityIndicator
                size="large"
                color="#FC466B"
                style={styles.loader}
              />
              <Text style={styles.loadingText}>Placing bet...</Text>
            </Animated.View>
          )}

          {gameState === "playing" && (
            <Animated.View
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(300)}
              style={styles.loadingContainer}
            >
              <Text style={styles.loadingText}>Spinning reels...</Text>
            </Animated.View>
          )}

          {(gameState === "won" || gameState === "lost") && (
            <Animated.View
              entering={SlideInDown.duration(500).springify()}
              exiting={SlideOutDown.duration(500)}
              style={styles.resultContainer}
            >
              <Text
                style={[
                  styles.resultText,
                  gameState === "won"
                    ? styles.wonResultText
                    : styles.lostResultText,
                ]}
              >
                {gameState === "won" ? "You Won!" : "You Lost!"}
              </Text>
              <Text style={styles.resultDetails}>{reels.join(" ")}</Text>
              {gameState === "won" && (
                <View>
                  <Text style={styles.multiplierText}>
                    Multiplier: {result?.multiplier}x
                  </Text>
                  <Text style={styles.amountWon}>
                    +₦{result?.amount.toFixed(2)}
                  </Text>
                </View>
              )}
              {gameState === "lost" && (
                <Text style={styles.amountLost}>
                  -₦{Number.parseFloat(betAmount).toFixed(2)}
                </Text>
              )}

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  onPress={resetGame}
                  style={styles.actionButtonContainer}
                  disabled={isSubmitting}
                >
                  <LinearGradient
                    colors={["#6a11cb", "#2575fc"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.actionButton}
                  >
                    <Text style={styles.actionButtonText}>Play Again</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.back()}
                  style={[
                    styles.actionButtonContainer,
                    styles.secondaryButtonContainer,
                  ]}
                  disabled={isSubmitting}
                >
                  <View style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>Exit Game</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </View>

      {gameState === "won" && (
        <View style={styles.confettiContainer}>
          {Platform.OS === "web" ? (
            <Lottie
              ref={confettiRef}
              src={require("../../assets/animations/confetti.json")}
              style={styles.confetti}
              loop={false}
              autoplay={false}
            />
          ) : (
            <LottieView
              ref={confettiRef}
              source={require("../../assets/animations/confetti.json")}
              style={styles.confetti}
              loop={false}
              autoPlay={false}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const SlotMachineSvg = ({ width = 300, height = 250 }) => (
  <Svg width={width} height={height} viewBox="0 0 300 250">
    <Rect x="10" y="10" width="280" height="230" rx="20" fill="#3F5EFB" />
    <Rect x="20" y="20" width="260" height="210" rx="15" fill="#FC466B" />
    <Rect x="30" y="40" width="240" height="120" rx="10" fill="#333333" />
    <Rect x="40" y="50" width="60" height="100" rx="5" fill="#222222" />
    <Rect x="120" y="50" width="60" height="100" rx="5" fill="#222222" />
    <Rect x="200" y="50" width="60" height="100" rx="5" fill="#222222" />
    <Circle cx="40" cy="180" r="10" fill="#FFD700" />
    <Circle cx="70" cy="180" r="10" fill="#FFD700" />
    <Circle cx="100" cy="180" r="10" fill="#FFD700" />
    <Circle cx="130" cy="180" r="10" fill="#FFD700" />
    <Circle cx="160" cy="180" r="10" fill="#FFD700" />
    <Circle cx="190" cy="180" r="10" fill="#FFD700" />
    <Circle cx="220" cy="180" r="10" fill="#FFD700" />
    <Circle cx="250" cy="180" r="10" fill="#FFD700" />
    <Rect x="40" y="200" width="220" height="20" rx="5" fill="#FFD700" />
  </Svg>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#ffffff",
  },
  balanceContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: "center",
  },
  balanceText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
  },
  offlineIndicator: {
    fontSize: 10,
    fontFamily: "Poppins-SemiBold",
    color: "#FC466B",
    marginTop: 2,
  },
  gameContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  slotMachineContainer: {
    position: "relative",
    marginVertical: 20,
    alignItems: "center",
  },
  reelsContainer: {
    position: "absolute",
    top: 50,
    left: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    width: 220,
  },
  reelWindow: {
    width: 60,
    height: 80,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  reel: {
    alignItems: "center",
  },
  reelSymbol: {
    fontSize: 40,
    lineHeight: 80,
    textAlign: "center",
  },
  lever: {
    position: "absolute",
    top: 50,
    right: -20,
    width: 20,
    height: 100,
    alignItems: "center",
  },
  leverHandle: {
    width: 10,
    height: 80,
    backgroundColor: "#FFD700",
    borderRadius: 5,
  },
  leverKnob: {
    width: 20,
    height: 20,
    backgroundColor: "#FF0000",
    borderRadius: 10,
  },
  controlsContainer: {
    width: "100%",
    alignItems: "center",
    paddingBottom: 50, // Add padding at the bottom for scrolling
  },
  gameDescription: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#9e9e9e",
    textAlign: "center",
    marginBottom: 16,
  },
  payoutsContainer: {
    width: "100%",
    marginBottom: 20,
  },
  payoutsTitle: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    marginBottom: 8,
  },
  payoutsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  payoutItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "48%",
    marginBottom: 8,
    backgroundColor: "#1e1e1e",
    padding: 8,
    borderRadius: 8,
  },
  payoutSymbol: {
    fontSize: 20,
    marginRight: 8,
  },
  payoutMultiplier: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
  },
  quickBetContainer: {
    width: "100%",
    marginBottom: 16,
  },
  quickBetButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  quickBetButton: {
    backgroundColor: "#2a2a2a",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 50,
    alignItems: "center",
  },
  quickBetText: {
    color: "#ffffff",
    fontFamily: "Poppins-SemiBold",
    fontSize: 14,
  },
  betLabel: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e1e",
    borderRadius: 8,
    paddingHorizontal: 16,
    width: "100%",
    marginBottom: 24,
  },
  dollarSign: {
    fontSize: 20,
    fontFamily: "Poppins-SemiBold",
    color: "#9e9e9e",
    marginRight: 8,
  },
  betInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 20,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
  },
  errorText: {
    color: "#ff5252",
    marginBottom: 16,
    fontFamily: "Poppins-Regular",
    alignSelf: "flex-start",
  },
  spinButtonContainer: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
    elevation: 5, // Android shadow
    shadowColor: "#000", // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginBottom: 20, // Add margin to ensure button is not cut off
  },
  disabledButton: {
    opacity: 0.6,
  },
  spinButton: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  spinButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    marginRight: 8,
  },
  buttonLoader: {
    marginLeft: 8,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  loader: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    marginBottom: 16,
  },
  resultContainer: {
    width: "100%",
    alignItems: "center",
    backgroundColor: "#1e1e1e",
    borderRadius: 16,
    padding: 24,
    marginTop: 20,
    marginBottom: 20,
  },
  resultText: {
    fontSize: 28,
    fontFamily: "Poppins-Bold",
    marginBottom: 8,
  },

  wonResultText: {
    color: "#4CAF50",
  },
  lostResultText: {
    color: "#F44336",
  },
  resultDetails: {
    fontSize: 32,
    fontFamily: "Poppins-Regular",
    marginBottom: 16,
  },
  multiplierText: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    marginBottom: 8,
  },
  amountWon: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#4CAF50",
    marginBottom: 24,
  },
  amountLost: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#F44336",
    marginBottom: 24,
  },
  actionButtons: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButtonContainer: {
    flex: 1,
    borderRadius: 8,
    overflow: "hidden",
    marginHorizontal: 4,
  },
  actionButton: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
  },
  secondaryButtonContainer: {
    backgroundColor: "transparent",
  },
  secondaryButton: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
  },
  confettiContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: "none",
  },
  confetti: {
    width: "100%",
    height: "100%",
  },
});
