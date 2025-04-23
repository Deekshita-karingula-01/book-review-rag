import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import './App.css';

// Your web app's Firebase configuration
const firebaseConfig = {
  // TODO: Add your Firebase project configuration here
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const App = () => {
  const [user, setUser] = useState(null);
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const chatHistoryRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchChatHistory(user.uid);
    }
  }, [user]);

  useEffect(() => {
    if (chatHistoryRef.current) {
        chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const fetchChatHistory = async (userId) => {
    const q = query(collection(db, 'queries'), where('userId', '==', userId), orderBy('timestamp'));
    const querySnapshot = await getDocs(q);
    const history = querySnapshot.docs.map((doc) => doc.data());
    setChatHistory(history);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (query.trim() === '' || !user) return;

    const newQuery = { text: query, isUser: true };
    setChatHistory([...chatHistory, newQuery]);
    setQuery('');

    try {
      const response = await fetch('http://localhost:8080', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, userId: user.uid }),
      });

      const data = await response.json();
      setChatHistory((prevHistory) => [...prevHistory, { text: data.response, isUser: false }]);
      await addDoc(collection(db, 'queries'), {
        userId: user.uid,
        text: query,
        timestamp: new Date(),
      });
      fetchChatHistory(user.uid);
    } catch (error) {
      console.error('Error sending query:', error);
      setChatHistory((prevHistory) => [...prevHistory, { text: "Error sending query", isUser: false }]);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Book Recommendation Chatbot</h1>
        {user ? (
          <>
            <button onClick={handleSignOut}>Sign Out</button>
          </>
        ) : (
          <button onClick={handleSignIn}>Sign In with Google</button>
        )}
      </header>
      {user && (
        <main className="chat-container">
          <div className="chat-history" ref={chatHistoryRef}>
            {chatHistory.map((message, index) => (
              <div
                key={index}
                className={`message ${message.isUser ? 'user' : 'bot'}`}
              >
                {message.text}
              </div>
            ))}
          </div>
          <form className="input-area" onSubmit={handleSubmit}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type your query here..."
            />
            <button type="submit">Send</button>
          </form>
        </main>
      )}
    </div>
  );
};

export default App;
