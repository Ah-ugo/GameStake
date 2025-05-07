"use client";

import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { useWallet } from "@/context/wallet-context";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const games = [
  {
    id: "1",
    name: "Coin Toss",
    icon: require("../assets/images/games/coin-toss.png"),
    route: "/games/coin-toss",
    color: ["#FF9500", "#FF5E3A"],
    hot: true,
  },
  {
    id: "2",
    name: "Dice Roll",
    icon: require("../assets/images/games/dice-roll.png"),
    route: "/games/dice-roll",
    color: ["#52E5E7", "#130CB7"],
    featured: true,
  },
  {
    id: "3",
    name: "Rock Paper Scissors",
    icon: require("../assets/images/games/rock-paper-scissors.png"),
    route: "/games/rock-paper-scissors",
    color: ["#F02FC2", "#6094EA"],
  },
  {
    id: "4",
    name: "Even/Odd",
    icon: require("../assets/images/games/even-odd.png"),
    route: "/games/even-odd",
    color: ["#65FDF0", "#1D6FA3"],
  },
  {
    id: "5",
    name: "Card Draw",
    icon: require("../assets/images/games/card-draw.png"),
    route: "/games/card-draw",
    color: ["#7367F0", "#CE9FFC"],
    hot: true,
  },
  {
    id: "6",
    name: "Number Guess",
    icon: require("../assets/images/games/number-guess.png"),
    route: "/games/number-guess",
    color: ["#F6D242", "#FF52E5"],
  },
  {
    id: "7",
    name: "Wheel Spin",
    icon: require("../assets/images/games/wheel-spin.png"),
    route: "/games/wheel-spin",
    color: ["#00C9FF", "#92FE9D"],
    featured: true,
  },
  {
    id: "8",
    name: "Slot Machine",
    icon: require("../assets/images/games/slot-machine.png"),
    route: "/games/slot-machine",
    color: ["#FC466B", "#3F5EFB"],
    hot: true,
  },
  {
    id: "9",
    name: "Blackjack",
    icon: require("../assets/images/games/blackjack.png"),
    route: "/games/blackjack",
    color: ["#3F2B96", "#A8C0FF"],
    featured: true,
  },
  {
    id: "10",
    name: "Roulette",
    icon: require("../assets/images/games/roulette.png"),
    route: "/games/roulette",
    color: ["#11998E", "#38EF7D"],
    hot: true,
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { balance, fetchBalance } = useWallet();
  const { showToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const balanceScale = useSharedValue(1);
  const featuredGameIndex = useSharedValue(0);
  const featuredGames = games.filter((game) => game.featured);
  const hotGames = games.filter((game) => game.hot);

  // Animation values
  const playButtonScale = useSharedValue(1);
  const coinRotate = useSharedValue(0);
  const diceRotate = useSharedValue(0);
  const slotMachineShake = useSharedValue(0);

  useEffect(() => {
    loadData();

    // Start animations
    playButtonScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 800, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.in(Easing.ease) })
      ),
      -1,
      true
    );

    coinRotate.value = withRepeat(
      withTiming(360, { duration: 2000, easing: Easing.linear }),
      -1
    );

    diceRotate.value = withRepeat(
      withSequence(
        withTiming(45, { duration: 500 }),
        withTiming(-45, { duration: 500 }),
        withTiming(0, { duration: 500 })
      ),
      -1
    );

    slotMachineShake.value = withRepeat(
      withSequence(
        withTiming(5, { duration: 100 }),
        withTiming(-5, { duration: 100 }),
        withTiming(5, { duration: 100 }),
        withTiming(0, { duration: 100 }),
        withDelay(2000, withTiming(0, { duration: 0 }))
      ),
      -1
    );

    // Auto-rotate featured games
    const interval = setInterval(() => {
      featuredGameIndex.value = withTiming(
        (featuredGameIndex.value + 1) % featuredGames.length,
        { duration: 500 }
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      await fetchBalance();
    } catch (error) {
      showToast("Failed to load balance", "error");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchBalance();
    } catch (error) {
      showToast("Failed to refresh data", "error");
    } finally {
      setRefreshing(false);
    }
  };

  const handleGamePress = (route: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(route);
  };

  const animateBalance = () => {
    balanceScale.value = withSpring(1.1, { damping: 2 });
    setTimeout(() => {
      balanceScale.value = withSpring(1);
    }, 300);
  };

  useEffect(() => {
    animateBalance();
  }, [balance]);

  const handleLogout = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await logout();
    } catch (error) {
      showToast("Failed to logout", "error");
    }
  };

  const playButtonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: playButtonScale.value }],
    };
  });

  const coinAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotateY: `${coinRotate.value}deg` }],
    };
  });

  const diceAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${diceRotate.value}deg` }],
    };
  });

  const slotMachineAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: slotMachineShake.value }],
    };
  });

  const balanceStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: balanceScale.value }],
    };
  });

  const renderFeaturedGame = () => {
    const currentIndex = Math.floor(featuredGameIndex.value);
    const game = featuredGames[currentIndex];

    return (
      <TouchableOpacity
        onPress={() => handleGamePress(game.route)}
        activeOpacity={0.8}
        style={styles.featuredGameContainer}
      >
        <ImageBackground
          source={require("../assets/images/featured-bg.png")}
          style={styles.featuredBackground}
          imageStyle={{ borderRadius: 20 }}
        >
          <LinearGradient
            colors={["rgba(0,0,0,0.3)", "rgba(0,0,0,0.8)"]}
            style={styles.featuredGradient}
          >
            <View style={styles.featuredContent}>
              <Image source={game.icon} style={styles.featuredIcon} />
              <View style={styles.featuredTextContainer}>
                <Text style={styles.featuredTitle}>{game.name}</Text>
                <Text style={styles.featuredSubtitle}>FEATURED GAME</Text>
              </View>
              <Animated.View
                style={[styles.playNowButton, playButtonAnimatedStyle]}
              >
                <LinearGradient
                  colors={game.color}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.playNowGradient}
                >
                  <Text style={styles.playNowText}>PLAY</Text>
                </LinearGradient>
              </Animated.View>
            </View>
          </LinearGradient>
        </ImageBackground>
      </TouchableOpacity>
    );
  };

  const renderHotGame = ({ item, index }: any) => {
    let animatedStyle = {};

    if (item.name === "Coin Toss") {
      animatedStyle = coinAnimatedStyle;
    } else if (item.name === "Dice Roll") {
      animatedStyle = diceAnimatedStyle;
    } else if (item.name === "Slot Machine") {
      animatedStyle = slotMachineAnimatedStyle;
    }

    return (
      <TouchableOpacity
        onPress={() => handleGamePress(item.route)}
        style={styles.hotGameCard}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={item.color}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hotGameGradient}
        >
          <Animated.View style={[styles.hotGameIconContainer, animatedStyle]}>
            <Image source={item.icon} style={styles.hotGameIcon} />
          </Animated.View>
          <Text style={styles.hotGameName}>{item.name}</Text>
          <View style={styles.hotLabel}>
            <Text style={styles.hotLabelText}>HOT</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar style="light" />

      <LinearGradient colors={["#1a1a2e", "#121212"]} style={styles.background}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Hey, {user?.username || "Player"}
            </Text>
            <Text style={styles.subtitle}>Ready to win big today?</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={games}
          keyExtractor={(item) => item.id}
          numColumns={3}
          columnWrapperStyle={styles.gameRow}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.gamesList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#ffffff"
              colors={["#ffffff"]}
            />
          }
          ListHeaderComponent={() => (
            <View>
              <Animated.View style={[styles.balanceCard, balanceStyle]}>
                <BlurView
                  intensity={20}
                  tint="dark"
                  style={styles.blurContainer}
                >
                  <LinearGradient
                    colors={[
                      "rgba(106, 17, 203, 0.8)",
                      "rgba(37, 117, 252, 0.8)",
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.balanceGradient}
                  >
                    <View style={styles.balanceContent}>
                      <Text style={styles.balanceLabel}>Your Balance</Text>
                      <Text style={styles.balanceAmount}>
                        ₦{balance.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.balanceActions}>
                      <TouchableOpacity
                        onPress={() => {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light
                          );
                          router.push("/wallet/deposit");
                        }}
                        style={styles.balanceButton}
                      >
                        <Ionicons
                          name="add-circle-outline"
                          size={20}
                          color="#ffffff"
                        />
                        <Text style={styles.balanceButtonText}>Deposit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light
                          );
                          router.push("/wallet/withdraw");
                        }}
                        style={styles.balanceButton}
                      >
                        <Ionicons
                          name="arrow-down-circle-outline"
                          size={20}
                          color="#ffffff"
                        />
                        <Text style={styles.balanceButtonText}>Withdraw</Text>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </BlurView>
              </Animated.View>

              {renderFeaturedGame()}

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Hot Games</Text>
                {/* <TouchableOpacity>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity> */}
              </View>

              <FlatList
                data={hotGames}
                keyExtractor={(item) => `hot-${item.id}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hotGamesList}
                renderItem={renderHotGame}
              />

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>All Games</Text>
              </View>
            </View>
          )}
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInDown.delay(index * 100)
                .duration(600)
                .springify()}
              style={styles.gameCard}
            >
              <TouchableOpacity
                onPress={() => handleGamePress(item.route)}
                style={{ flex: 1 }}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={item.color}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gameGradient}
                >
                  <Image source={item.icon} style={styles.gameIcon} />
                  <Text style={styles.gameName}>{item.name}</Text>
                  {item.hot && (
                    <View style={styles.gameTag}>
                      <Text style={styles.gameTagText}>HOT</Text>
                    </View>
                  )}
                  {item.featured && (
                    <View style={[styles.gameTag, styles.featuredTag]}>
                      <Text style={styles.gameTagText}>FEATURED</Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}
        />
      </LinearGradient>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, styles.tabItemActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Ionicons name="game-controller" size={24} color="#2575fc" />
          <Text style={styles.tabLabelActive}>Games</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/transactions");
          }}
        >
          <Ionicons name="list" size={24} color="#9e9e9e" />
          <Text style={styles.tabLabel}>Transactions</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/profile");
          }}
        >
          <Ionicons name="person" size={24} color="#9e9e9e" />
          <Text style={styles.tabLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  background: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  greeting: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#ffffff",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#9e9e9e",
  },
  logoutButton: {
    padding: 8,
  },
  balanceCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
  },
  blurContainer: {
    borderRadius: 16,
    overflow: "hidden",
  },
  balanceGradient: {
    borderRadius: 16,
    padding: 20,
  },
  balanceContent: {
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontFamily: "Poppins-Bold",
    color: "#ffffff",
  },
  balanceActions: {
    flexDirection: "row",
  },
  balanceButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  balanceButtonText: {
    color: "#ffffff",
    fontFamily: "Poppins-SemiBold",
    marginLeft: 6,
  },
  featuredGameContainer: {
    marginHorizontal: 20,
    height: 180,
    borderRadius: 20,
    marginBottom: 24,
    overflow: "hidden",
  },
  featuredBackground: {
    width: "100%",
    height: "100%",
  },
  featuredGradient: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 16,
  },
  featuredContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  featuredIcon: {
    width: 60,
    height: 60,
    marginRight: 12,
  },
  featuredTextContainer: {
    flex: 1,
  },
  featuredTitle: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    color: "#ffffff",
  },
  featuredSubtitle: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: "#52E5E7",
  },
  playNowButton: {
    width: 80,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
  },
  playNowGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  playNowText: {
    color: "#ffffff",
    fontFamily: "Poppins-Bold",
    fontSize: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "Poppins-Bold",
    color: "#ffffff",
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#2575fc",
  },
  hotGamesList: {
    paddingLeft: 20,
    paddingRight: 10,
    marginBottom: 24,
  },
  hotGameCard: {
    width: 140,
    height: 180,
    marginRight: 10,
    borderRadius: 16,
    overflow: "hidden",
  },
  hotGameGradient: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  hotGameIconContainer: {
    alignItems: "center",
    marginTop: 10,
  },
  hotGameIcon: {
    width: 70,
    height: 70,
  },
  hotGameName: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    textAlign: "center",
  },
  hotLabel: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255, 59, 48, 0.8)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  hotLabelText: {
    color: "#ffffff",
    fontSize: 10,
    fontFamily: "Poppins-Bold",
  },
  gamesList: {
    paddingBottom: 80,
  },
  gameCard: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    marginHorizontal: "1.66%",
  },
  gameGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  gameIcon: {
    width: 48,
    height: 48,
    marginBottom: 8,
  },
  gameName: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    textAlign: "center",
  },
  gameTag: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "rgba(255, 59, 48, 0.8)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  featuredTag: {
    backgroundColor: "rgba(82, 229, 231, 0.8)",
  },
  gameTagText: {
    color: "#ffffff",
    fontSize: 8,
    fontFamily: "Poppins-Bold",
  },
  gameRow: {
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#1e1e1e",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#2a2a2a",
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  tabItemActive: {
    backgroundColor: "rgba(37, 117, 252, 0.1)",
    borderRadius: 8,
  },
  tabLabel: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#9e9e9e",
    marginTop: 4,
  },
  tabLabelActive: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
    color: "#2575fc",
    marginTop: 4,
  },
});
