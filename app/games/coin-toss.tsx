import { useToast } from "@/context/toast-context";
import { useWallet } from "@/context/wallet-context";
import { api } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import LottieView from "lottie-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Easing,
  Platform,
  Animated as RNAnimated,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Circle, G, Path, Svg, Text as SvgText } from "react-native-svg";

const Lottie = Platform.select({
  native: () => require("lottie-react-native").default,
  default: () => require("@lottiefiles/dotlottie-react").DotLottieReact,
})();

export default function CoinTossScreen() {
  const router = useRouter();
  const { balance, fetchBalance } = useWallet();
  const { showToast } = useToast();
  const [betAmount, setBetAmount] = useState("");
  const [selectedSide, setSelectedSide] = useState(null);
  const [gameState, setGameState] = useState("idle"); // idle, playing, won, lost
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const flipAnimation = useRef(new RNAnimated.Value(0)).current;
  const confettiRef = useRef(null);

  useEffect(() => {
    fetchBalance();
  }, []);

  // Fix the coin flip animation to ensure it shows the correct side
  const flipCoin = (resultSide: any) => {
    flipAnimation.setValue(0);

    // Determine the final rotation based on the result
    // For heads, we want to end with the heads side showing (0 or 2 full rotations)
    // For tails, we want to end with the tails side showing (1 full rotation)
    const finalRotation = resultSide === "heads" ? 2 : 1;

    RNAnimated.timing(flipAnimation, {
      toValue: finalRotation,
      duration: 1000,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  };

  // Adjust interpolation to ensure correct side is shown
  const frontInterpolate = flipAnimation.interpolate({
    inputRange: [0, 0.5, 1, 1.5, 2],
    outputRange: ["0deg", "90deg", "180deg", "270deg", "360deg"],
  });

  const backInterpolate = flipAnimation.interpolate({
    inputRange: [0, 0.5, 1, 1.5, 2],
    outputRange: ["180deg", "270deg", "360deg", "450deg", "540deg"],
  });

  // Adjust opacity to ensure correct side is visible
  const frontOpacity = flipAnimation.interpolate({
    inputRange: [0, 0.49, 0.51, 0.99, 1.01, 1.49, 1.51, 2],
    outputRange: [1, 1, 0, 0, 0, 0, 1, 1],
  });

  const backOpacity = flipAnimation.interpolate({
    inputRange: [0, 0.49, 0.51, 0.99, 1.01, 1.49, 1.51, 2],
    outputRange: [0, 0, 1, 1, 1, 1, 0, 0],
  });

  const frontAnimatedStyle = {
    transform: [{ rotateY: frontInterpolate }],
    opacity: frontOpacity,
  };

  const backAnimatedStyle = {
    transform: [{ rotateY: backInterpolate }],
    opacity: backOpacity,
  };

  // Update the handleBet function to pass the result side to flipCoin
  const handleBet = async () => {
    if (!selectedSide) {
      setError("Please select heads or tails");
      return;
    }

    const amount = Number.parseFloat(betAmount);
    if (isNaN(amount) || amount < 10) {
      setError("Please enter a valid bet amount greater than or equal to ₦10");
      return;
    }

    if (amount > balance) {
      setError("Insufficient balance");
      return;
    }

    setError("");
    setGameState("playing");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const response = await api.post("/games/play/coin-toss", {
        bet_amount: amount,
        choice: selectedSide,
      });

      const { result: gameResult } = response.data;

      // Pass the result side to flipCoin
      flipCoin(gameResult.side);

      setTimeout(() => {
        setResult({
          side: gameResult.side,
          won: gameResult.won,
          amount: gameResult.won ? amount * 2 : 0,
        });

        setGameState(gameResult.won ? "won" : "lost");
        fetchBalance(); // Refresh balance after game

        if (gameResult.won) {
          confettiRef.current?.play();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showToast(`You won ₦${(amount * 2).toFixed(2)}!`, "success");
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          showToast(`You lost ₦${amount.toFixed(2)}`, "error");
        }
      }, 1000);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || "Something went wrong. Please try again."
      );
      setGameState("idle");
      showToast("Failed to place bet", "error");
    }
  };

  const resetGame = () => {
    setBetAmount("");
    setSelectedSide(null);
    setGameState("idle");
    setResult(null);
    setError("");
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
        <Text style={styles.title}>Coin Toss</Text>
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceText}>₦{balance.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.gameContainer}>
        <View style={styles.coinContainer}>
          <RNAnimated.View
            style={[styles.coin, styles.coinFront, frontAnimatedStyle]}
          >
            <CoinFrontSvg />
          </RNAnimated.View>
          <RNAnimated.View
            style={[styles.coin, styles.coinBack, backAnimatedStyle]}
          >
            <CoinBackSvg />
          </RNAnimated.View>
        </View>

        {gameState === "idle" && (
          <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(300)}
            style={styles.betContainer}
          >
            <Text style={styles.betLabel}>Select your side:</Text>
            <View style={styles.sideSelector}>
              <TouchableOpacity
                onPress={() => {
                  setSelectedSide("heads");
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.sideButton,
                  selectedSide === "heads" && styles.selectedSide,
                ]}
              >
                <Text
                  style={[
                    styles.sideButtonText,
                    selectedSide === "heads" && styles.selectedSideText,
                  ]}
                >
                  Heads
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setSelectedSide("tails");
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.sideButton,
                  selectedSide === "tails" && styles.selectedSide,
                ]}
              >
                <Text
                  style={[
                    styles.sideButtonText,
                    selectedSide === "tails" && styles.selectedSideText,
                  ]}
                >
                  Tails
                </Text>
              </TouchableOpacity>
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
              onPress={handleBet}
              style={styles.betButtonContainer}
            >
              <LinearGradient
                colors={["#FF9500", "#FF5E3A"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.betButton}
              >
                <Text style={styles.betButtonText}>Place Bet</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {gameState === "playing" && (
          <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(300)}
            style={styles.loadingContainer}
          >
            <Text style={styles.loadingText}>Flipping coin...</Text>
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
            <Text style={styles.resultDetails}>
              {result?.side.toUpperCase()} - You chose{" "}
              {selectedSide.toUpperCase()}
            </Text>
            {gameState === "won" && (
              <Text style={styles.amountWon}>
                +₦{(Number.parseFloat(betAmount) * 2).toFixed(2)}
              </Text>
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
              >
                <View style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Exit Game</Text>
                </View>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
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

// Update the CoinFrontSvg and CoinBackSvg components to clearly show H and T
const CoinFrontSvg = () => (
  <Svg width="100%" height="100%" viewBox="0 0 100 100">
    <Circle cx="50" cy="50" r="50" fill="#FFD700" />
    <Circle cx="50" cy="50" r="45" fill="#FFC800" />
    <G transform="translate(50, 50)">
      <Circle cx="0" cy="0" r="35" fill="#FFD700" />
      <Path
        d="M-15,-5 L15,-5 L15,5 L-15,5 Z"
        fill="#FFA500"
        transform="rotate(45)"
      />
      <Path
        d="M-15,-5 L15,-5 L15,5 L-15,5 Z"
        fill="#FFA500"
        transform="rotate(-45)"
      />
      <Circle cx="0" cy="0" r="20" fill="#FFA500" />
      <SvgText
        x="0"
        y="7"
        fontSize="24"
        fontWeight="bold"
        textAnchor="middle"
        fill="#FFD700"
      >
        H
      </SvgText>
    </G>
  </Svg>
);

const CoinBackSvg = () => (
  <Svg width="100%" height="100%" viewBox="0 0 100 100">
    <Circle cx="50" cy="50" r="50" fill="#FFD700" />
    <Circle cx="50" cy="50" r="45" fill="#FFC800" />
    <G transform="translate(50, 50)">
      <Circle cx="0" cy="0" r="35" fill="#FFD700" />
      <Path d="M-25,-3 L25,-3 L25,3 L-25,3 Z" fill="#FFA500" />
      <Path d="M-3,-25 L3,-25 L3,25 L-3,25 Z" fill="#FFA500" />
      <Circle cx="0" cy="0" r="20" fill="#FFA500" />
      <SvgText
        x="0"
        y="7"
        fontSize="24"
        fontWeight="bold"
        textAnchor="middle"
        fill="#FFD700"
      >
        T
      </SvgText>
    </G>
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
  },
  balanceText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
  },
  gameContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  coinContainer: {
    width: 150,
    height: 150,
    marginVertical: 40,
    position: "relative",
  },
  coin: {
    width: "100%",
    height: "100%",
    position: "absolute",
    backfaceVisibility: "hidden",
    borderRadius: 75,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  coinFront: {
    backgroundColor: "#FFD700",
  },
  coinBack: {
    backgroundColor: "#FFD700",
  },
  betContainer: {
    width: "100%",
    alignItems: "center",
  },
  betLabel: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  sideSelector: {
    flexDirection: "row",
    width: "100%",
    marginBottom: 24,
  },
  sideButton: {
    flex: 1,
    backgroundColor: "#1e1e1e",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4,
  },
  selectedSide: {
    backgroundColor: "rgba(255, 149, 0, 0.2)",
    borderWidth: 1,
    borderColor: "#FF9500",
  },
  sideButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#9e9e9e",
  },
  selectedSideText: {
    color: "#FF9500",
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
  betButtonContainer: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
  },
  betButton: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  betButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
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
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#9e9e9e",
    marginBottom: 16,
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
