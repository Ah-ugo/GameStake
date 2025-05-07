"use client";

import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useToast } from "../../context/toast-context";
import { useWallet } from "../../context/wallet-context";

export default function DepositScreen() {
  const router = useRouter();
  const { balance, requestDeposit, fetchBalance } = useWallet();
  const { showToast } = useToast();
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchBalance();
  }, []);

  // This would come from your backend in a real app
  const bankDetails = {
    accountName: "PRINCE AHUEKWE",
    accountNumber: "6550004348",
    bankName: "Moniepoint MFB",
    routingNumber: "021000021",
  };

  const handleDeposit = async () => {
    const depositAmount = Number.parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      setError("Please enter a valid amount");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setError("");
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await requestDeposit(depositAmount);
      showToast("Deposit request submitted successfully", "success");
      Alert.alert(
        "Deposit Request Submitted",
        "Your deposit request has been submitted. Please transfer the funds to the provided bank account. Once confirmed by admin, your balance will be updated.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.detail ||
          "Failed to submit deposit request. Please try again."
      );
      showToast("Failed to submit deposit request", "error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: any) => {
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast("Copied to clipboard", "success");
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
        <Text style={styles.title}>Deposit</Text>
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceText}>₦{balance.toFixed(2)}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.duration(600).springify()}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Enter Deposit Amount</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.dollarSign}>₦</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor="#9e9e9e"
            />
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(200).duration(600).springify()}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Bank Account Details</Text>
          <View style={styles.bankDetailsCard}>
            <View style={styles.bankDetailRow}>
              <Text style={styles.bankDetailLabel}>Account Name:</Text>
              <View style={styles.bankDetailValueContainer}>
                <Text style={styles.bankDetailValue}>
                  {bankDetails.accountName}
                </Text>
                <TouchableOpacity
                  onPress={() => copyToClipboard(bankDetails.accountName)}
                >
                  <Ionicons name="copy-outline" size={18} color="#2575fc" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.bankDetailRow}>
              <Text style={styles.bankDetailLabel}>Account Number:</Text>
              <View style={styles.bankDetailValueContainer}>
                <Text style={styles.bankDetailValue}>
                  {bankDetails.accountNumber}
                </Text>
                <TouchableOpacity
                  onPress={() => copyToClipboard(bankDetails.accountNumber)}
                >
                  <Ionicons name="copy-outline" size={18} color="#2575fc" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.bankDetailRow}>
              <Text style={styles.bankDetailLabel}>Bank Name:</Text>
              <View style={styles.bankDetailValueContainer}>
                <Text style={styles.bankDetailValue}>
                  {bankDetails.bankName}
                </Text>
                <TouchableOpacity
                  onPress={() => copyToClipboard(bankDetails.bankName)}
                >
                  <Ionicons name="copy-outline" size={18} color="#2575fc" />
                </TouchableOpacity>
              </View>
            </View>

            {/* <View style={styles.bankDetailRow}>
              <Text style={styles.bankDetailLabel}>Routing Number:</Text>
              <View style={styles.bankDetailValueContainer}>
                <Text style={styles.bankDetailValue}>
                  {bankDetails.routingNumber}
                </Text>
                <TouchableOpacity
                  onPress={() => copyToClipboard(bankDetails.routingNumber)}
                >
                  <Ionicons name="copy-outline" size={18} color="#2575fc" />
                </TouchableOpacity>
              </View>
            </View> */}
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(400).duration(600).springify()}
          style={styles.section}
        >
          <Text style={styles.instructionsTitle}>Instructions</Text>
          <Text style={styles.instructionsText}>
            1. Enter the amount you wish to deposit
          </Text>
          <Text style={styles.instructionsText}>
            2. Transfer the exact amount to the bank account details provided
            above
          </Text>
          <Text style={styles.instructionsText}>
            3. Submit your deposit request
          </Text>
          <Text style={styles.instructionsText}>
            4. Admin will verify and approve your deposit
          </Text>
          <Text style={styles.instructionsText}>
            5. Once approved, your balance will be updated
          </Text>
        </Animated.View>

        <TouchableOpacity
          onPress={handleDeposit}
          disabled={isLoading}
          style={styles.buttonContainer}
        >
          <LinearGradient
            colors={["#6a11cb", "#2575fc"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Submit Deposit Request</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e1e",
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  dollarSign: {
    fontSize: 20,
    fontFamily: "Poppins-SemiBold",
    color: "#9e9e9e",
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 20,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
  },
  errorText: {
    color: "#ff5252",
    marginTop: 8,
    fontFamily: "Poppins-Regular",
  },
  bankDetailsCard: {
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 16,
  },
  bankDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#2a2a2a",
  },
  bankDetailLabel: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#9e9e9e",
  },
  bankDetailValueContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  bankDetailValue: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    marginRight: 8,
  },
  instructionsTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#ffffff",
    marginBottom: 16,
  },
  instructionsText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#9e9e9e",
    marginBottom: 8,
  },
  buttonContainer: {
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 16,
  },
  button: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
  },
});
