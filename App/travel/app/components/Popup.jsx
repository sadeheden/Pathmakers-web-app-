import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function Popup({
  visible,
  title,
  message,
  onClose,
  onConfirm,
  confirmText = 'OK',
  cancelText = 'Cancel',
  showCancel = false,
  type = 'info', // ✅ Add type
}) {
  const isError = type === 'error';
  const isSuccess = type === 'success';

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.popup, isError && styles.errorBox, isSuccess && styles.successBox]}>
          <Text style={[styles.title, isError && styles.errorTitle, isSuccess && styles.successTitle]}>
            {title}
          </Text>
          <Text style={styles.message}>{message}</Text>

          <View style={styles.buttonRow}>
            {showCancel && (
              <TouchableOpacity style={[styles.button, styles.cancel]} onPress={onClose}>
                <Text style={styles.buttonText}>{cancelText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.button, styles.confirm]}
              onPress={onConfirm || onClose}
            >
              <Text style={styles.buttonText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popup: {
    backgroundColor: '#fff',
    width: '80%',
    borderRadius: 20,
    padding: 24,
    elevation: 5,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: '#222',
  },
  message: {
    fontSize: 16,
    color: '#444',
    marginBottom: 24,
    textAlign: 'center',
  },
  buttonRow: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    minWidth: 120,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    marginTop: 8,
    alignItems: 'center',
  },
  confirm: {
    backgroundColor: '#007AFF',
  },
  cancel: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  errorBox: {
    borderColor: '#838383ff',
    borderWidth: 2,
  },
  errorTitle: {
    color: '#e74c3c',
  },
  successBox: {
    borderColor: '#838383ff',
    borderWidth: 2,
  },
  successTitle: {
    color: '#27ae60',
  },
});
