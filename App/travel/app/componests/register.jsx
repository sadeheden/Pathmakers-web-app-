// import { Picker } from '@react-native-picker/picker';
// import { useState } from 'react';
// import { Button, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

// export default function Register({ onRegister }) {
//   const [registerEmail, setRegisterEmail] = useState('');
//   const [registerName, setRegisterName] = useState('');
//   const [registerPassword, setRegisterPassword] = useState('');
//   const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
//   const [registerGenre, setRegisterGenre] = useState('');

//   const genres = [
//     'Fiction',
//     'Non-fiction',
//     'Mystery',
//     'Fantasy',
//     'Science Fiction',
//     'Biography',
//     'Romance',
//     'Other',
//   ];

//   return (
//     <View style={styles.form}>
//       <Text style={styles.title}>Register</Text>
//       <TextInput
//         style={styles.input}
//         placeholder="Email"
//         value={registerEmail}
//         onChangeText={setRegisterEmail}
//         autoCapitalize="none"
//         keyboardType="email-address"
//       />
//       <TextInput
//         style={styles.input}
//         placeholder="Name"
//         value={registerName}
//         onChangeText={setRegisterName}
//       />
//       <TextInput
//         style={styles.input}
//         placeholder="Password"
//         value={registerPassword}
//         onChangeText={setRegisterPassword}
//         secureTextEntry
//       />
//       <TextInput
//         style={styles.input}
//         placeholder="Confirm Password"
//         value={registerConfirmPassword}
//         onChangeText={setRegisterConfirmPassword}
//         secureTextEntry
//       />
//       <View style={styles.pickerContainer}>
//         <Picker
//           selectedValue={registerGenre}
//           style={styles.picker}
//           onValueChange={setRegisterGenre}
//         >
//           <Picker.Item label="Select Genre" value="" />
//           {genres.map((genre) => (
//             <Picker.Item key={genre} label={genre} value={genre} />
//           ))}
//         </Picker>
//       </View>
//       <Button title="Register" onPress={() => { if (onRegister) onRegister({ registerEmail, registerName, registerPassword, registerConfirmPassword, registerGenre }); }} />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   form: { marginTop: 10 },
//   title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
//   input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 10, marginBottom: 15 },
//   pickerContainer: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, marginBottom: 15 },
//   picker: { height: Platform.OS === 'ios' ? 180 : 50, width: '100%' },
// });