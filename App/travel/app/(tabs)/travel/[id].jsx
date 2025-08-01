// import { MaterialCommunityIcons } from '@expo/vector-icons';
// import { useLocalSearchParams } from 'expo-router';
// import { useEffect, useState } from 'react';
// import { ScrollView, StyleSheet, Text, View } from 'react-native';
// import { get } from '../../api';

// export default function BookDetails() {
//     const { id } = useLocalSearchParams();
//     const [book, setBook] = useState(null);
//     const [loading, setLoading] = useState(true);


//     async function fetchBook() {
//             try {
//                 const data = await get(`books/${id}`);
//                 setBook(data);
//             } catch (error) {
//                 console.error('Error fetching book:', error);
//             } finally {
//                 setLoading(false);
//             }
//         }

//     useEffect(() => {
//         fetchBook();

//         // Cleanup function if needed
//         return () => {
//             setBook(null); // Clear book on unmount
//             setLoading(true); // Reset loading state
//         };
//     }, [id]);

//     if (loading) {
//         return (
//             <View style={styles.container}>
//                 <Text>Loading...</Text>
//             </View>
//         );
//     }

//     if (!book) {
//         return (
//             <View style={styles.container}>
//                 <Text>Book not found</Text>
//             </View>
//         );
//     }

//     return (
//         <>
//             <ScrollView style={styles.container}>
//                 <View style={styles.card}>
//                     <Text style={styles.title}>{book.title}</Text>
//                     <Text style={styles.author}>by {book.author}</Text>
//                     <View style={styles.detailsRow}>
//                         <MaterialCommunityIcons name="bookshelf" size={20} color="#666" />
//                         <Text style={styles.detailText}>{book.genre}</Text>
//                     </View>
//                     <View style={styles.detailsRow}>
//                         <MaterialCommunityIcons name="calendar" size={20} color="#666" />
//                         <Text style={styles.detailText}>Published in {book.publishedYear}</Text>
//                     </View>
//                 </View>
//             </ScrollView>
//         </>
//     );
// }

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         backgroundColor: '#f5f5f5',
//     },
//     backButton: {
//         marginLeft: 16,
//     },
//     card: {
//         backgroundColor: 'white',
//         borderRadius: 15,
//         padding: 20,
//         margin: 16,
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
//         fontSize: 24,
//         fontWeight: 'bold',
//         color: '#333',
//         marginBottom: 10,
//     },
//     author: {
//         fontSize: 18,
//         color: '#666',
//         marginBottom: 20,
//     },
//     detailsRow: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         marginBottom: 15,
//     },
//     detailText: {
//         fontSize: 16,
//         color: '#666',
//         marginLeft: 10,
//     },
// });