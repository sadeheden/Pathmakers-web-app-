import React, { useState,useRef, useEffect, useCallback } from "react";
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


export default function RealChatScreen() {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "system",
      content:
        "Act as a travel agent. Answer questions with full explanations and step-by-step thinking.",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
const scrollViewRef = useRef(null);

 const askAI = useCallback(async (userMessage) => {
  try {
    setIsLoading(true);

    const response = await fetch("https://pathmakers-web-app-app-travel.onrender.com/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: [...messages, userMessage] }), // <--- כאן חשוב לשלוח את ההודעה החדשה יחד עם ההיסטוריה
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Server responded with error:", text);
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();

    if (data.choices && data.choices.length > 0) {
      setMessages((prev) => [
        ...prev,
        userMessage,
        data.choices[0].message,
      ]);
    } else {
      throw new Error("Invalid response");
    }
  } catch (error) {
    console.error("Error:", error);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "Sorry, an error occurred. Please try again.",
      },
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
      <Text style={styles.header}>AI Triper - Chat</Text>

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
          message.role === "user"
            ? styles.userMessage
            : styles.botMessage,
        ]}
      >
        <Text style={styles.messageText}>{message.content}</Text>
      </View>
    ))}
  {isLoading && (
    <ActivityIndicator
      size="large"
      color="#6633cc"
      style={{ marginTop: 10 }}
    />
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
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    paddingVertical: 15,
    backgroundColor: "#6633cc",
    color: "#fff",
  },
  chatBox: {
    flex: 1,
    padding: 10,
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
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
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
    backgroundColor: "#6633cc",
    borderRadius: 20,
    paddingHorizontal: 15,
    justifyContent: "center",
  },
  sendText: {
    color: "#fff",
    fontWeight: "bold",
  },
  safeArea: {
  flex: 1,
  backgroundColor: "#6633cc",
},
container: {
  flex: 1,
  backgroundColor: "#fff",
},
header: {
  fontSize: 20,
  fontWeight: "bold",
  textAlign: "center",
  paddingVertical: 15,
  backgroundColor: "#6633cc",
  color: "#fff",
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
  backgroundColor: "#6633cc",
  borderRadius: 20,
  paddingHorizontal: 15,
  paddingVertical: 8,
},
sendText: {
  color: "#fff",
  fontWeight: "bold",
},


});
