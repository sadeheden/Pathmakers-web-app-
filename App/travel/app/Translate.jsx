// import React, { useState } from 'react';
// import {
//   View,
//   Text,
//   TextInput,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
// } from 'react-native';
// import { Picker } from '@react-native-picker/picker';

// const languages = [
//   { label: 'English', value: 'en' },
//   { label: 'Hebrew', value: 'he' },
//   { label: 'Arabic', value: 'ar' },
//   { label: 'French', value: 'fr' },
//   { label: 'German', value: 'de' },
//   { label: 'Spanish', value: 'es' },
// ];

// export default function TranslatorScreen() {
//   const [inputText, setInputText] = useState('');
//   const [translatedText, setTranslatedText] = useState('');
//   const [sourceLang, setSourceLang] = useState('en');
//   const [targetLang, setTargetLang] = useState('he');

//   const handleTranslate = async () => {
//     if (!inputText || sourceLang === targetLang) {
//       setTranslatedText('Please enter text and choose different languages.');
//       return;
//     }
//       try {
//           const res = await fetch('https://libretranslate.com/translate', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           q: inputText,
//           source: sourceLang,
//           target: targetLang,
//           format: 'text',
//         }),
//         });

//       const data = await res.json();
//       setTranslatedText(data.translatedText || 'Translation failed');
//     } catch (error) {
//       console.error('Translation error:', error);
//       setTranslatedText('Error during translation.');
//     }
//   };

//   return (
//     <ScrollView contentContainerStyle={styles.container}>
//       <Text style={styles.title}>Translate Text</Text>

//       <TextInput
//         style={styles.input}
//         placeholder="Enter text to translate"
//         multiline
//         value={inputText}
//         onChangeText={setInputText}
//       />

//       <View style={styles.pickersContainer}>
//         <View style={styles.pickerWrapper}>
//           <Text style={styles.pickerLabel}>From:</Text>
//           <Picker
//             selectedValue={sourceLang}
//             style={styles.picker}
//             onValueChange={setSourceLang}
//           >
//             {languages.map((lang) => (
//               <Picker.Item key={lang.value} label={lang.label} value={lang.value} />
//             ))}
//           </Picker>
//         </View>

//         <View style={styles.pickerWrapper}>
//           <Text style={styles.pickerLabel}>To:</Text>
//           <Picker
//             selectedValue={targetLang}
//             style={styles.picker}
//             onValueChange={setTargetLang}
//           >
//             {languages.map((lang) => (
//               <Picker.Item key={lang.value} label={lang.label} value={lang.value} />
//             ))}
//           </Picker>
//         </View>
//       </View>

//       <TouchableOpacity style={styles.button} onPress={handleTranslate}>
//         <Text style={styles.buttonText}>Translate</Text>
//       </TouchableOpacity>

//       {translatedText !== '' && (
//         <View style={styles.resultContainer}>
//           <Text style={styles.resultLabel}>Translation:</Text>
//           <Text style={styles.result}>{translatedText}</Text>
//         </View>
//       )}
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     padding: 20,
//     paddingTop: 50,
//     backgroundColor: '#f8f8f8',
//     flexGrow: 1,
//   },
//   title: {
//     fontSize: 28,
//     fontWeight: 'bold',
//     marginBottom: 20,
//     alignSelf: 'center',
//   },
//   input: {
//     borderWidth: 1,
//     borderColor: '#ccc',
//     borderRadius: 10,
//     padding: 12,
//     marginBottom: 20,
//     backgroundColor: 'white',
//     fontSize: 16,
//   },
//   pickersContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//   },
//   pickerWrapper: {
//     flex: 1,
//     marginRight: 10,
//   },
//   pickerLabel: {
//     fontSize: 14,
//     marginBottom: 5,
//   },
//   picker: {
//     backgroundColor: '#fff',
//     borderWidth: 1,
//     borderColor: '#ccc',
//   },
//   button: {
//     backgroundColor: '#009688',
//     padding: 15,
//     marginTop: 20,
//     borderRadius: 10,
//   },
//   buttonText: {
//     color: 'white',
//     fontWeight: 'bold',
//     textAlign: 'center',
//   },
//   resultContainer: {
//     marginTop: 30,
//   },
//   resultLabel: {
//     fontSize: 18,
//     fontWeight: 'bold',
//   },
//   result: {
//     fontSize: 16,
//     marginTop: 10,
//     backgroundColor: '#fff',
//     padding: 15,
//     borderRadius: 10,
//   },
// });
