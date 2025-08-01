// import { router, useFocusEffect } from 'expo-router';
// import { useCallback, useState } from 'react';
// import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// import { get } from '../../api';

// export default function index() {
//     const [books, setBooks] = useState([]);

//     async function fetchBooks() {
//         try {
//             let data = await get('books');
//             console.log('Fetched books:', data);
//             setBooks(data);
//         } catch (error) {
//             console.error('Error fetching books:', error);
//         }
//     }

//     useFocusEffect(useCallback(()=>{
//         fetchBooks();
//         // // Cleanup function if needed
//         // return () => {
//         //     setBooks([]); // Clear books on unmount
//         // };
//     }, []));

//     const renderBookCard = ({ item }) => (
//         <TouchableOpacity 
//             style={styles.card} 
//             onPress={() => router.push(`/books/${item._id}`)}
//         >
//             <Text style={styles.title}>{item.title}</Text>
//             <Text style={styles.author}>by {item.author}</Text>
//             <View style={styles.details}>
//                 <Text style={styles.genre}>{item.genre}</Text>
//                 <Text style={styles.year}>{item.publishedYear}</Text>
//             </View>
//         </TouchableOpacity>
//     );

//     return (
//         <View style={styles.container}>
//             <FlatList
//                 data={books}
//                 renderItem={renderBookCard}
//                 keyExtractor={(item) => item._id}
//                 contentContainerStyle={styles.list}
//                 showsVerticalScrollIndicator={false}
//             />
//         </View>
//     );
// }

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         backgroundColor: '#f5f5f5',
//         padding: 10,
//     },
//     list: {
//         padding: 10,
//     },
//     card: {
//         backgroundColor: 'white',
//         borderRadius: 10,
//         padding: 15,
//         marginBottom: 15,
//         shadowColor: '#000',
//         shadowOffset: {
//             width: 0,
//             height: 2,
//         },
//         shadowOpacity: 0.25,
//         shadowRadius: 3.84,
//         elevation: 5,
//     },
//     title: {
//         fontSize: 18,
//         fontWeight: 'bold',
//         marginBottom: 5,
//         color: '#333',
//     },
//     author: {
//         fontSize: 16,
//         color: '#666',
//         marginBottom: 10,
//     },
//     details: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         marginTop: 5,
//     },
//     genre: {
//         color: '#007AFF',
//         fontSize: 14,
//     },
//     year: {
//         color: '#666',
//         fontSize: 14,
//     },
// });