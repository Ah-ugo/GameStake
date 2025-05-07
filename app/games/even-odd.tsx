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
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Circle, Svg, Text as SvgText } from "react-native-svg";

const { width } = Dimensions.get("window");

const Lottie = Platform.select({
  native: () => require("lottie-react-native").default,
  default: () => require("@lottiefiles/dotlottie-react").DotLottieReact,
})();

export default function EvenOddScreen() {
  const router = useRouter();
  const { balance, fetchBalance } = useWallet();
  const { showToast } = useToast();
  const [betAmount, setBetAmount] = useState("");
  const [selectedChoice, setSelectedChoice] = useState(null); // "even" or "odd"
  const [number, setNumber] = useState(null);
  const [gameState, setGameState] = useState("idle"); // idle, playing, won, lost
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const confettiRef = useRef(null);

  const numberScale = useSharedValue(1);
  const numberRotate = useSharedValue(0);

  useEffect(() => {
    fetchBalance();
  }, []);

  const numberAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: numberScale.value },
        { rotateY: `${numberRotate.value * 360}deg` },
      ],
    };
  });

  const animateNumber = () => {
    numberScale.value = withSequence(
      withTiming(1.5, { duration: 300 }),
      withTiming(1, { duration: 300 })
    );

    numberRotate.value = withSequence(
      withTiming(1, {
        duration: 600,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }),
      withTiming(0, { duration: 0 })
    );
  };

  const handlePlay = async () => {
    if (!selectedChoice) {
      setError("Please select even or odd");
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
      const response = await api.post("/games/play/even-odd", {
        bet_amount: amount,
        choice: selectedChoice,
      });

      const { result: gameResult } = response.data;

      setTimeout(() => {
        setNumber(gameResult.number);
        animateNumber();

        setTimeout(() => {
          setResult({
            number: gameResult.number,
            isEven: gameResult.is_even,
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
    setSelectedChoice(null);
    setNumber(null);
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
        <Text style={styles.title}>Even/Odd</Text>
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceText}>₦{balance.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.gameContainer}>
        <Animated.View style={[styles.numberContainer, numberAnimatedStyle]}>
          <NumberCircle number={number} />
        </Animated.View>

        {gameState === "idle" && (
          <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(300)}
            style={styles.controlsContainer}
          >
            <Text style={styles.choiceLabel}>Select your prediction:</Text>
            <View style={styles.choicesRow}>
              <TouchableOpacity
                onPress={() => {
                  setSelectedChoice("even");
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.choiceButton,
                  selectedChoice === "even" && styles.selectedChoice,
                ]}
              >
                <Text
                  style={[
                    styles.choiceButtonText,
                    selectedChoice === "even" && styles.selectedChoiceText,
                  ]}
                >
                  Even
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setSelectedChoice("odd");
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.choiceButton,
                  selectedChoice === "odd" && styles.selectedChoice,
                ]}
              >
                <Text
                  style={[
                    styles.choiceButtonText,
                    selectedChoice === "odd" && styles.selectedChoiceText,
                  ]}
                >
                  Odd
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
              onPress={handlePlay}
              style={styles.playButtonContainer}
            >
              <LinearGradient
                colors={["#65FDF0", "#1D6FA3"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.playButton}
              >
                <Text style={styles.playButtonText}>Play</Text>
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
            <Text style={styles.loadingText}>Generating number...</Text>
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
              Number: {number} ({result?.isEven ? "Even" : "Odd"}) - You chose{" "}
              {selectedChoice.toUpperCase()}
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

const NumberCircle = ({ number = null, width = 150, height = 150 }) => (
  <Svg width={width} height={height} viewBox="0 0 100 100">
    <Circle cx="50" cy="50" r="45" fill="#65FDF0" />
    <Circle cx="50" cy="50" r="40" fill="#1D6FA3" />
    {number !== null && (
      <SvgText
        x="50"
        y="58"
        fontSize="32"
        fontWeight="bold"
        textAnchor="middle"
        fill="#FFFFFF"
      >
        {number}
      </SvgText>
    )}
    {number === null && (
      <SvgText
        x="50"
        y="58"
        fontSize="32"
        fontWeight="bold"
        textAnchor="middle"
        fill="#FFFFFF"
      >
        ?
      </SvgText>
    )}
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
  numberContainer: {
    width: 150,
    height: 150,
    marginVertical: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  controlsContainer: {
    width: "100%",
    alignItems: "center",
  },
  choiceLabel: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  choicesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 24,
  },
  choiceButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e1e1e",
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 8,
  },
  selectedChoice: {
    backgroundColor: "rgba(101, 253, 240, 0.2)",
    borderWidth: 1,
    borderColor: "#65FDF0",
  },
  choiceButtonText: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#9e9e9e",
  },
  selectedChoiceText: {
    color: "#65FDF0",
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
  playButtonContainer: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
  },
  playButton: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  playButtonText: {
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
