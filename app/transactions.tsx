"use client";

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useToast } from "../context/toast-context";
import { useWallet } from "../context/wallet-context";

export default function TransactionsScreen() {
  const router = useRouter();
  const { balance, transactions, fetchTransactions, fetchBalance } =
    useWallet();
  const { showToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([fetchTransactions(), fetchBalance()]);
    } catch (error) {
      showToast("Failed to load transactions", "error");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchTransactions(), fetchBalance()]);
    } catch (error) {
      showToast("Failed to refresh data", "error");
    } finally {
      setRefreshing(false);
    }
  };

  const filteredTransactions = transactions.filter((transaction) => {
    if (activeTab === "all") return true;
    return transaction.type === activeTab;
  });

  const getTransactionIcon = (type) => {
    switch (type) {
      case "deposit":
        return "arrow-up-circle-outline";
      case "withdrawal":
        return "arrow-down-circle-outline";
      case "game":
        return "game-controller-outline";
      default:
        return "cash-outline";
    }
  };

  const getTransactionColor = (type, status) => {
    if (status === "pending") return "#FFC107";
    if (type === "deposit") return "#4CAF50";
    if (type === "withdrawal") return "#F44336";
    if (type === "game") {
      return status === "won" ? "#4CAF50" : "#F44336";
    }
    return "#9e9e9e";
  };

  const getTransactionStatusText = (type, status) => {
    if (type === "game") {
      return status === "won" ? "Won" : "Lost";
    }
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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
        <Text style={styles.title}>Transactions</Text>
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceText}>₦{balance.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          onPress={() => {
            setActiveTab("all");
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          style={[styles.tab, activeTab === "all" && styles.activeTab]}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "all" && styles.activeTabText,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setActiveTab("deposit");
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          style={[styles.tab, activeTab === "deposit" && styles.activeTab]}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "deposit" && styles.activeTabText,
            ]}
          >
            Deposits
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setActiveTab("withdrawal");
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          style={[styles.tab, activeTab === "withdrawal" && styles.activeTab]}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "withdrawal" && styles.activeTabText,
            ]}
          >
            Withdrawals
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setActiveTab("game");
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          style={[styles.tab, activeTab === "game" && styles.activeTab]}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "game" && styles.activeTabText,
            ]}
          >
            Games
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.transactionsList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ffffff"
            colors={["#ffffff"]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={48} color="#9e9e9e" />
            <Text style={styles.emptyText}>No transactions found</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeInDown.delay(index * 100)
              .duration(600)
              .springify()}
          >
            <View style={styles.transactionCard}>
              <View style={styles.transactionIconContainer}>
                <Ionicons
                  name={getTransactionIcon(item.type)}
                  size={24}
                  color={getTransactionColor(item.type, item.status)}
                />
              </View>
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionTitle}>
                  {item.type === "game"
                    ? `${item.game_type || "Game"} - ${getTransactionStatusText(
                        item.type,
                        item.status
                      )}`
                    : item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                </Text>
                <Text style={styles.transactionDate}>
                  {formatDate(item.date)}
                </Text>
              </View>
              <View style={styles.transactionAmountContainer}>
                <Text
                  style={[
                    styles.transactionAmount,
                    {
                      color: getTransactionColor(item.type, item.status),
                    },
                  ]}
                >
                  {item.type === "deposit" ||
                  (item.type === "game" && item.status === "won")
                    ? "+"
                    : "-"}
                  ₦{Number.parseFloat(item.amount).toFixed(2)}
                </Text>
                <Text
                  style={[
                    styles.transactionStatus,
                    {
                      color: getTransactionColor(item.type, item.status),
                    },
                  ]}
                >
                  {getTransactionStatusText(item.type, item.status)}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}
      />

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.replace("/home");
          }}
        >
          <Ionicons name="game-controller" size={24} color="#9e9e9e" />
          <Text style={styles.tabLabel}>Games</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, styles.tabItemActive]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Ionicons name="list" size={24} color="#2575fc" />
          <Text style={styles.tabLabelActive}>Transactions</Text>
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
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
  },
  activeTab: {
    backgroundColor: "rgba(37, 117, 252, 0.1)",
  },
  tabText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#9e9e9e",
  },
  activeTabText: {
    fontFamily: "Poppins-SemiBold",
    color: "#2575fc",
  },
  transactionsList: {
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  transactionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  transactionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#2a2a2a",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    color: "#9e9e9e",
  },
  transactionAmountContainer: {
    alignItems: "flex-end",
  },
  transactionAmount: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    marginBottom: 4,
  },
  transactionStatus: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#9e9e9e",
    marginTop: 16,
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
