import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, Button, FlatList, Alert, TouchableOpacity, SafeAreaView, Modal } from 'react-native';
import { ref, onValue, set, push, update } from 'firebase/database';
import { signOut } from 'firebase/auth';

// Recebe a referência do banco de dados e autenticação via props
export default function HomeScreen({ database, auth }) {
  const [item, setItem] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [de, setDe] = useState('');
  const [para, setPara] = useState('');
  const [emprestimos, setEmprestimos] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState('ativos');
  const [editingId, setEditingId] = useState(null);
  
  const [userProfile, setUserProfile] = useState(null);
  const [lojas, setLojas] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    // Listener que pega o usuário autenticado
    const unsubscribeAuth = auth.onAuthStateChanged(authUser => {
      if (authUser) {
        const userRef = ref(database, `usuarios/${authUser.uid}`);
        const userListener = onValue(userRef, (snapshot) => {
          const profileData = snapshot.val();
          if (profileData) {
            setUserProfile(profileData);
            setDe(profileData.loja); 
          } else {
            setDe('');
          }
        });
        return () => userListener();
      }
    });

    const lojasListener = onValue(ref(database, 'lojas'), (snapshot) => {
      const lojasData = snapshot.val();
      if (lojasData) {
        // NOVO CÓDIGO AQUI: Filtra as lojas pela empresa do usuário logado
        if (userProfile && userProfile.empresa && lojasData[userProfile.empresa]) {
          const lojasDaEmpresa = Object.keys(lojasData[userProfile.empresa]);
          setLojas(lojasDaEmpresa);
        } else {
          setLojas([]);
        }
      }
    });

    // Listener para buscar os empréstimos em tempo real
    const emprestimosListener = onValue(ref(database, 'emprestimos'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const emprestimosFiltrados = Object.keys(data)
          .filter(key => 
            (userProfile && data[key].de === userProfile.loja) || 
            (userProfile && data[key].para === userProfile.loja)
          )
          .map(key => ({ id: key, ...data[key] }));
        
        setEmprestimos(emprestimosFiltrados.reverse());
      } else {
        setEmprestimos([]);
      }
    });

    return () => {
      unsubscribeAuth();
      lojasListener();
      emprestimosListener();
    };
  }, [auth, database, userProfile]);

  const handleSelectLoja = (loja) => {
    setPara(loja);
    setModalVisible(false);
  };

  const clearForm = () => {
    setItem('');
    setQuantidade('');
    setDe(userProfile ? userProfile.loja : '');
    setPara('');
    setEditingId(null);
  };

  const registrarEmprestimo = () => {
    if (!item || !quantidade || !de || !para) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }

    const nomeDoUsuario = userProfile ? `${userProfile.nome} - ${userProfile.loja}` : 'Anônimo';
    const novoEmprestimoRef = push(ref(database, 'emprestimos'));

    set(novoEmprestimoRef, {
      id: novoEmprestimoRef.key,
      item: item,
      quantidade: parseInt(quantidade),
      de: de,
      para: para,
      status: 'ativo',
      criadoPor: nomeDoUsuario, 
      data: new Date().toLocaleString(),
    })
    .then(() => {
      Alert.alert('Sucesso!', 'Empréstimo registrado!');
      clearForm();
    })
    .catch((error) => {
      console.error("Erro ao registrar empréstimo:", error);
      Alert.alert('Erro', 'Houve um problema ao registrar o empréstimo.');
    });
  };

  const editarEmprestimo = () => {
    if (!item || !quantidade || !de || !para || !editingId) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos e selecione um item para editar.');
      return;
    }
    
    const nomeDoUsuario = userProfile ? `${userProfile.nome} - ${userProfile.loja}` : 'Anônimo';
    const itemRef = ref(database, `emprestimos/${editingId}`);
    
    update(itemRef, {
      item: item,
      quantidade: parseInt(quantidade),
      de: de,
      para: para,
      editadoPor: nomeDoUsuario,
      dataEdicao: new Date().toLocaleString(),
    })
    .then(() => {
      Alert.alert('Sucesso!', 'Empréstimo atualizado com sucesso!');
      clearForm();
    })
    .catch((error) => {
      console.error("Erro ao atualizar empréstimo:", error);
      Alert.alert('Erro', 'Houve um problema ao atualizar o empréstimo.');
    });
  };

  const finalizarEmprestimo = (id) => {
    const nomeDoUsuario = userProfile ? `${userProfile.nome} - ${userProfile.loja}` : 'Anônimo';
    const itemRef = ref(database, `emprestimos/${id}`);

    update(itemRef, {
      status: 'finalizado',
      finalizadoPor: nomeDoUsuario,
      dataFinalizacao: new Date().toLocaleString(),
    })
    .then(() => {
      Alert.alert('Sucesso!', 'Empréstimo finalizado com sucesso!');
      clearForm();
    })
    .catch((error) => {
      console.error("Erro ao finalizar empréstimo:", error);
      Alert.alert('Erro', 'Houve um problema ao finalizar o empréstimo.');
    });
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.listItem}
      onPress={() => {
        if (item.status === 'finalizado') {
          Alert.alert('Aviso', 'Não é possível editar ou dar baixa em empréstimos finalizados.');
          return;
        }

        Alert.alert(
          'Opções do Empréstimo',
          'O que você deseja fazer?',
          [
            {
              text: 'Editar',
              onPress: () => {
                setItem(item.item);
                setQuantidade(String(item.quantidade));
                setDe(userProfile.loja);
                setPara(item.para);
                setEditingId(item.id);
              },
            },
            {
              text: 'Finalizar',
              onPress: () => finalizarEmprestimo(item.id),
            },
            {
              text: 'Cancelar',
              style: 'cancel',
            },
          ],
          { cancelable: false }
        );
      }}
    >
      <Text style={[styles.itemTitle, item.status === 'finalizado' && styles.finalizadoText]}>{item.item} ({item.quantidade})</Text>
      <Text style={styles.itemSubtitle}>De: {item.de} | Para: {item.para}</Text>
      {item.editadoPor ? (
        <Text style={styles.itemDate}>Editado por {item.editadoPor} em {item.dataEdicao}</Text>
      ) : item.criadoPor ? (
        <Text style={styles.itemDate}>Criado por {item.criadoPor} em {item.data}</Text>
      ) : (
        <Text style={styles.itemDate}>Criado em: {item.data}</Text>
      )}
      {item.status === 'finalizado' ? (
        <Text style={styles.finalizadoInfo}>
          Finalizado por {item.finalizadoPor} em {item.dataFinalizacao}
        </Text>
      ) : null}
    </TouchableOpacity>
  );

  const emprestimosFiltrados = emprestimos.filter(e => {
    if (filtroStatus === 'ativos') {
      return e.status === 'ativo';
    }
    return true;
  });

  const lojasDisponiveis = userProfile ? lojas.filter(loja => loja !== userProfile.loja) : [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titulo}>Gerenciador de Empréstimos</Text>
        <Button
          title="Sair"
          onPress={handleLogout}
          color="#e74c3c"
        />
      </View>
      <View style={styles.form}>
        {/* Nova View para dividir os inputs em duas colunas */}
        <View style={styles.rowInputs}>
          <TextInput
            style={[styles.input, styles.inputHalf]}
            placeholder="Item (ex: Maionese)"
            value={item}
            onChangeText={setItem}
          />
          <TextInput
            style={[styles.input, styles.inputHalf]}
            placeholder="Quantidade"
            value={quantidade}
            onChangeText={setQuantidade}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.rowInputs}>
          <TextInput
            style={[styles.input, styles.inputHalf]}
            placeholder="De (seu nome/loja)"
            value={de}
            onChangeText={setDe}
          />
          <TouchableOpacity
            style={[styles.input, styles.inputHalf, { justifyContent: 'center' }]}
            onPress={() => setModalVisible(true)}
          >
            <Text style={{ color: para ? '#000' : '#888' }}>
              {para || 'Para (nome/loja do destino)'}
            </Text>
          </TouchableOpacity>
        </View>
        <Button
          title={editingId ? 'Atualizar Empréstimo' : 'Registrar Empréstimo'}
          onPress={editingId ? editarEmprestimo : registrarEmprestimo}
        />
        {editingId && (
          <Button
            title="Cancelar Edição"
            onPress={clearForm}
            color="red"
          />
        )}
      </View>
      <Text style={styles.listaTitulo}>Empréstimos Registrados</Text>
      <View style={styles.filtroContainer}>
        <TouchableOpacity 
          style={[styles.filtroButton, filtroStatus === 'ativos' && styles.filtroButtonAtivo]}
          onPress={() => setFiltroStatus('ativos')}
        >
          <Text style={[styles.filtroButtonText, filtroStatus === 'ativos' && styles.filtroButtonTextAtivo]}>Ativos</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filtroButton, filtroStatus === 'todos' && styles.filtroButtonAtivo]}
          onPress={() => setFiltroStatus('todos')}
        >
          <Text style={[styles.filtroButtonText, filtroStatus === 'todos' && styles.filtroButtonTextAtivo]}>Todos</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={emprestimosFiltrados}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        style={styles.lista}
      />
      
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Selecione a Loja de Destino</Text>
            <FlatList
              data={lojasDisponiveis}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.lojaItem}
                  onPress={() => handleSelectLoja(item)}
                >
                  <Text style={styles.lojaText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <Button
              title="Fechar"
              onPress={() => setModalVisible(!modalVisible)}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 80,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  form: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  // Novo estilo para a linha de inputs
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
  // Novo estilo para os inputs que ocupam metade da largura
  inputHalf: {
    flex: 1,
    marginRight: 5,
  },
  listaTitulo: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  lista: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#555',
    marginTop: 5,
  },
  itemDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
    textAlign: 'right',
  },
  finalizadoText: {
    color: 'gray',
    textDecorationLine: 'line-through',
  },
  finalizadoInfo: {
    fontSize: 12,
    color: '#333',
    marginTop: 5,
    fontStyle: 'italic',
    textAlign: 'right',
  },
  filtroContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  filtroButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginHorizontal: 5,
    backgroundColor: '#e0e0e0',
  },
  filtroButtonAtivo: {
    backgroundColor: '#3498db',
  },
  filtroButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
  filtroButtonTextAtivo: {
    color: '#fff',
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '80%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  lojaItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    width: '100%',
    alignItems: 'center',
  },
  lojaText: {
    fontSize: 16,
  }
});