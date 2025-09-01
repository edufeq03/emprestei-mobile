import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, Image } from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';

// Importe sua imagem de logo aqui. 
// Certifique-se de que o arquivo 'emprestei-logo.png' esteja na pasta 'assets' do seu projeto.
import Logo from '../assets/emprestei-logo.png'; 

export default function LoginScreen({ auth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigation = useNavigation();

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Se o login for bem-sucedido, o listener em App.js redirecionará para a HomeScreen
    } catch (error) {
      Alert.alert("Erro de Login", "Verifique seu e-mail e senha.");
      console.error("Erro de login:", error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image 
          source={Logo} 
          style={styles.logo} 
          resizeMode="contain" 
        />
        <Text style={styles.appName}>Emprestei</Text>
        <Text style={styles.slogan}>Seu sistema de empréstimos inteligentes</Text>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={text => setEmail(text)}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          placeholder="Senha"
          value={password}
          onChangeText={text => setPassword(text)}
          style={styles.input}
          secureTextEntry
        />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={handleLogin} style={styles.button}>
          <Text style={styles.buttonText}>Entrar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3498db', // Cor de fundo azul principal
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40, // Espaço maior abaixo do logo
  },
  logo: {
    width: 150, // Tamanho da sua imagem de logo
    height: 150,
    marginBottom: 10,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  slogan: {
    fontSize: 16,
    color: '#eee',
    marginTop: 5,
  },
  inputContainer: {
    width: '80%',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
    fontSize: 16,
    borderColor: '#ddd',
    borderWidth: 1,
  },
  buttonContainer: {
    width: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#2ecc71', // Um verde vibrante para o botão
    width: '100%',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
});