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

 
const hf = new HfInference(HF_TOKEN);
 
export default function RealChatScreen() {
    const navigation = useNavigation();
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef(null);
 
  const askAI = useCallback(async (userMessage) => {
    try {
      setIsLoading(true);
 
      const systemPrompt = {
        role: "system",
        content:  "You are a travel assistant. Be brief (2 sentences max). You CANNOT make bookings or take payments. \
 If the user asks to book/reserve/pay, clearly state you cannot book and tell them to use the booking page or website to complete the purchase. \
 Never imply you completed a booking or reservation.",
      };
 
      const chatPayload = [systemPrompt, ...messages, userMessage];
 
     
     const response = await hf.chatCompletion({
      model: "meta-llama/Meta-Llama-3-8B-Instruct",
      messages: chatPayload,
      temperature: 0.7,
      max_tokens: 150,
    });

 
      if (response.choices?.[0]?.message?.content) {
        setMessages((prev) => [...prev, userMessage, response.choices[0].message]);
      } else {
        throw new Error("No response from model.");
      }
    } catch (error) {
      console.error("Error calling AI:", error);
      setMessages((prev) => [
        ...prev,
        userMessage,
        { role: "assistant", content: "Sorry, an error occurred. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);
 
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