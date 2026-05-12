import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc, query, where, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCDs0Og67eNPYThs8JUFRXIpO390PwhGKw",
  authDomain: "jantar2026acia.firebaseapp.com",
  projectId: "jantar2026acia",
  storageBucket: "jantar2026acia.firebasestorage.app",
  messagingSenderId: "210472849085",
  appId: "1:210472849085:web:65f68c537c8a3cd2ba71d4",
  measurementId: "G-YZ1ELD65WC"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

const ADMIN_CREDENTIALS = {
  email: 'admin@acia2026.com',
  password: 'ACIA2026Admin!'
};

export const AuthService = {
  async login(email, password) {
    if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
      const adminUser = { email, role: 'admin', name: 'Administrador' };
      localStorage.setItem('adminUser', JSON.stringify(adminUser));
      return adminUser;
    }
    throw new Error('Credenciais inválidas');
  },

  logout() {
    localStorage.removeItem('adminUser');
  },

  getCurrentUser() {
    const user = localStorage.getItem('adminUser');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated() {
    return this.getCurrentUser() !== null;
  }
};

export const ConfigService = {
  async getConfig() {
    const q = query(collection(db, 'config'), where('id', '==', 'settings'));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    }
    const docRef = await addDoc(collection(db, 'config'), {
      id: 'settings',
      modeloConviteUrl: null,
      darkMode: false,
      createdAt: new Date().toISOString()
    });
    return { id: docRef.id, modeloConviteUrl: null, darkMode: false };
  },

  async updateConfig(data) {
    const q = query(collection(db, 'config'), where('id', '==', 'settings'));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docRef = doc(db, 'config', snapshot.docs[0].id);
      await updateDoc(docRef, data);
    } else {
      await addDoc(collection(db, 'config'), { id: 'settings', ...data });
    }
  },

  async uploadModelo(file) {
    const storageRef = ref(storage, 'modelos/convite.png');
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return url;
  },

  onSnapshotConfig(callback) {
    const q = query(collection(db, 'config'), where('id', '==', 'settings'));
    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        callback({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        callback(null);
      }
    });
  }
};

export const HistoricoService = {
  async adicionarAcesso(acao, detalhes) {
    await addDoc(collection(db, 'historico'), {
      acao,
      detalhes,
      timestamp: new Date().toISOString()
    });
  },

  async buscarHistorico(limite = 100) {
    const q = query(collection(db, 'historico'), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.slice(0, limite).map(doc => ({ id: doc.id, ...doc.data() }));
  },

  onSnapshotHistorico(callback) {
    const q = query(collection(db, 'historico'), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }
};

export const FirebaseService = {
  async adicionarConvidado(convidado) {
    const docRef = await addDoc(collection(db, 'convidados'), {
      ...convidado,
      createdAt: new Date().toISOString(),
      checkedIn: false,
      checkedInAt: null
    });
    return docRef.id;
  },

  async atualizarConvidado(id, dados) {
    const docRef = doc(db, 'convidados', id);
    await updateDoc(docRef, dados);
  },

  async excluirConvidado(id) {
    const docRef = doc(db, 'convidados', id);
    await deleteDoc(docRef);
  },

  async buscarConvidadoPorId(id) {
    const docRef = doc(db, 'convidados', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  },

  async buscarConvidadoPorQRCode(qrCodeId) {
    const q = query(collection(db, 'convidados'), where('qrCodeId', '==', qrCodeId));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    return null;
  },

  async buscarTodosConvidados() {
    const q = query(collection(db, 'convidados'), orderBy('nome', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async buscarConvidadosPorMesa(mesa) {
    const q = query(collection(db, 'convidados'), where('mesa', '==', mesa), orderBy('nome', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async buscarConvidadosPorStatus(checkedIn) {
    const q = query(collection(db, 'convidados'), where('checkedIn', '==', checkedIn), orderBy('nome', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async realizarCheckIn(id) {
    const docRef = doc(db, 'convidados', id);
    await updateDoc(docRef, {
      checkedIn: true,
      checkedInAt: new Date().toISOString()
    });
  },

  async buscarMesas() {
    const q = query(collection(db, 'convidados'), orderBy('mesa', 'asc'));
    const querySnapshot = await getDocs(q);
    const mesas = new Set();
    querySnapshot.docs.forEach(doc => {
      const mesa = doc.data().mesa;
      if (mesa) mesas.add(mesa);
    });
    return Array.from(mesas).sort();
  },

  async buscarEstatisticas() {
    const guests = await this.buscarTodosConvidados();
    const total = guests.length;
    const confirmados = guests.filter(g => g.checkedIn !== undefined && g.checkedIn !== null).length;
    const presentes = guests.filter(g => g.checkedIn === true).length;
    const pendentes = total - presentes;
    const mesasOcupadas = new Set(guests.map(g => g.mesa)).size;
    
    return { total, confirmados, presentes, pendentes, mesasOcupadas };
  },

  gerarQRCodeId() {
    return 'ACIA2026-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  },

  onSnapshotConvidados(callback) {
    const q = query(collection(db, 'convidados'), orderBy('nome', 'asc'));
    return onSnapshot(q, (snapshot) => {
      const guests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(guests);
    });
  },

  onSnapshotEstatisticas(callback) {
    const q = query(collection(db, 'convidados'));
    return onSnapshot(q, (snapshot) => {
      const guests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const total = guests.length;
      const presentes = guests.filter(g => g.checkedIn === true).length;
      const pendentes = total - presentes;
      const mesasOcupadas = new Set(guests.map(g => g.mesa)).size;
      callback({ total, presentes, pendentes, mesasOcupadas });
    });
  }
};

export default FirebaseService;