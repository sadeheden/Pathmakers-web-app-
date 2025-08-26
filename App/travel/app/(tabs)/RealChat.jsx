import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native";
import { HF_TOKEN } from "@env";
import { HfInference } from "@huggingface/inference";
import { useNavigation } from "@react-navigation/native";

// --- Demo toggle (reads from Expo env); '1' = force mock mode
const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK === "1";

// Only create HF client if we are not mocking AND we have a token
const hf = !USE_MOCK && HF_TOKEN ? new HfInference(HF_TOKEN) : null;

/* ---------------- Mock brain (short, varied tips) ---------------- */
const MOCK_RESPONSES = {
  book: [
    "I can’t book from chat. Use the Booking page to complete payment and confirmation.",
    "Booking isn’t available here—please head to the Booking page to reserve and pay.",
  ],
  flights: [
    "Cheapest fares are often mid-week. Compare 1-stop vs nonstop in the Flights tab.",
    "Book ~4–6 weeks ahead and watch baggage fees—they change the real price a lot.",
  ],
  hotels: [
    "Pick near transit with free cancellation. 8.5+ rating is a safe bet.",
    "Compare ‘pay now’ vs ‘pay at property’—flex rates can be worth the extra.",
  ],
  attractions: [
    "Choose 3 must-dos and pre-book the popular one. Leave a half-day buffer.",
    "City passes can save 15–30% if you plan 3+ museums.",
  ],
  weather: [
    "Check the 10-day forecast the day before you fly; pack a light layer + rain cover.",
    "Do outdoor sights before noon; save museums for the afternoon heat.",
  ],
  visa: [
    "Visa rules change—confirm on your government site for your passport.",
    "I can’t verify visas here; please double-check consular guidance.",
  ],
  general: [
    "Tell me destination + dates + budget—I’ll sketch flights, hotel area, and 3 sights.",
    "Share where/when you’re traveling and I’ll outline a quick plan to refine.",
  ],
};
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const mockReply = (text) => {
  const s = String(text || "").toLowerCase();
  if (/(book|reserve|pay|payment|checkout)/.test(s)) return pick(MOCK_RESPONSES.book);
  if (/(flight|airline|fare|ticket)/.test(s)) return pick(MOCK_RESPONSES.flights);
  if (/(hotel|stay|accommod)/.test(s)) return pick(MOCK_RESPONSES.hotels);
  if (/(attraction|things to do|sight|museum|tour)/.test(s)) return pick(MOCK_RESPONSES.attractions);
  if (/(weather|temperature|rain|sunny|forecast)/.test(s)) return pick(MOCK_RESPONSES.weather);
  if (/(visa|entry|passport)/.test(s)) return pick(MOCK_RESPONSES.visa);
  return pick(MOCK_RESPONSES.general);
};

export default function RealChatScreen() {
  const navigation = useNavigation();
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [banner, setBanner] = useState(null); // shows why we’re in demo mode
  const scrollViewRef = useRef(null);

  // Smooth “typing” simulation
  const simulate = (userMessage, reason) => {
    setBanner(reason ? `Demo reply (${reason})` : "Demo reply");
    setIsLoading(true);
    setTimeout(() => {
      const reply = mockReply(userMessage.content);
      setMessages((prev) => [...prev, userMessage, { role: "assistant", content: reply }]);
      setIsLoading(false);
    }, 600 + Math.random() * 800);
  };

  const askAI = useCallback(
    async (userMessage) => {
      // Force demo or missing provider => simulate
      if (USE_MOCK || !hf) {
        simulate(userMessage, USE_MOCK ? "demo mode" : "no provider");
        return;
      }

      let usedMock = false;
      try {
        setIsLoading(true);

        const systemPrompt = {
          role: "system",
          content:
            "You are a travel assistant. Be brief (2 sentences max). You CANNOT make bookings or take payments. " +
            "If the user asks to book/reserve/pay, clearly state you cannot book and tell them to use the booking page or website to complete the purchase. " +
            "Never imply you completed a booking or reservation.",
        };

        const chatPayload = [systemPrompt, ...messages, userMessage];

        const response = await hf.chatCompletion({
          model: "meta-llama/Meta-Llama-3-8B-Instruct",
          messages: chatPayload,
          temperature: 0.7,
          max_tokens: 150,
        });

        const content = response?.choices?.[0]?.message?.content;
        if (!content) throw new Error("No response from model.");
        setMessages((prev) => [...prev, userMessage, { role: "assistant", content }]);
      } catch (error) {
        const msg = String(error?.message || error);
        const quota =
          /exceeded|quota|credits|insufficient|billing|402|rate limit/i.test(msg);
        if (quota) {
          usedMock = true;
          simulate(userMessage, "provider quota exceeded");
        } else {
          console.error("Error calling AI:", error);
          setMessages((prev) => [
            ...prev,
            userMessage,
            { role: "assistant", content: "Sorry, an error occurred. Please try again." },
          ]);
        }
      } finally {
        if (!usedMock) setIsLoading(false);
      }
    },
    [messages]
  );

  const handleSend = () => {
    if (text.trim() === "") return;
    const userMessage = { role: "user", content: text.trim() };
    setText("");
    askAI(userMessage);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Triper - Chat</Text>
        </View>

        

        <View style={styles.chatWrapper}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.chatBox}
            contentContainerStyle={{ paddingVertical: 10 }}
            onContentSizeChange={() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }}
            keyboardShouldPersistTaps="handled"
          >
            {messages
              .filter((m) => m.role !== "system")
              .map((message, index) => (
                <View
                  key={index}
                  style={[
                    styles.messageContainer,
                    message.role === "user" ? styles.userMessage : styles.botMessage,
                  ]}
                >
                  <Text style={styles.messageText}>{message.content}</Text>
                </View>
              ))}
            {isLoading && (
              <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 10 }} />
            )}
          </ScrollView>

          <View style={styles.inputContainer}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Type your message..."
              style={styles.input}
              editable={!isLoading}
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={isLoading || !text.trim()}
              style={[
                styles.sendButton,
                (isLoading || !text.trim()) && { opacity: 0.5 },
              ]}
            >
              <Text style={styles.sendText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#007AFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  backButton: {
    marginRight: 10,
    padding: 5,
  },
  backText: {
    color: "#fff",
    fontSize: 20,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  banner: {
    backgroundColor: "#FFF3CD",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomColor: "#F1E2A8",
    borderBottomWidth: 1,
  },
  bannerText: {
    color: "#8A6D3B",
    textAlign: "center",
    fontSize: 13,
  },
  chatWrapper: {
    flex: 1,
  },
  chatBox: {
    flex: 1,
    paddingHorizontal: 10,
  },
  messageContainer: {
    padding: 10,
    marginVertical: 5,
    borderRadius: 10,
    maxWidth: "80%",
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#daf0ff",
  },
  botMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#f1f1f1",
  },
  messageText: {
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 20,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: "#007AFF",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    justifyContent: "center",
  },
  sendText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
