import { useEffect, useRef, useState } from 'react';
import { api, downloadFile } from '../api.js';
import { connectSocket, disconnectSocket } from '../socket.js';
import { useAuth } from '../context/AuthContext.jsx';

const fmtSize = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.ceil(b / 1024)} KB`);

export default function Chat() {
  const { user, logout } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [newRoom, setNewRoom] = useState('');
  const [typing, setTyping] = useState('');
  const [error, setError] = useState('');

  const socketRef = useRef(null);
  const activeRef = useRef(null);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);
  const typingTimer = useRef(null);
  const lastTyping = useRef(0);

  const isMember = (room) => room.members.includes(user.id);
  const loadRooms = () => api.get('/rooms').then((d) => setRooms(d.rooms));

  // Connect socket + wire up listeners once
  useEffect(() => {
    loadRooms();
    const socket = connectSocket();
    socketRef.current = socket;

    socket.on('message:new', (msg) => {
      if (msg.room === activeRef.current?._id) setMessages((m) => [...m, msg]);
    });
    socket.on('message:deleted', ({ id }) => setMessages((m) => m.filter((x) => x._id !== id)));
    socket.on('room:deleted', ({ roomId }) => {
      setRooms((r) => r.filter((x) => x._id !== roomId));
      if (activeRef.current?._id === roomId) setActive(null);
    });
    socket.on('typing', ({ roomId, username }) => {
      if (roomId !== activeRef.current?._id) return;
      setTyping(username);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(''), 1500);
    });
    socket.on('connect_error', () => setError('Connection problem. Retrying...'));
    socket.on('connect', () => setError(''));

    return () => disconnectSocket();
  }, []);

  // Load history when switching rooms
  useEffect(() => {
    activeRef.current = active;
    setMessages([]);
    setTyping('');
    if (active && isMember(active)) {
      api.get(`/rooms/${active._id}/messages`).then((d) => setMessages(d.messages)).catch((e) => setError(e.message));
    }
  }, [active?._id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const run = async (fn) => {
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    }
  };

  const createRoom = (e) => {
    e.preventDefault();
    if (!newRoom.trim()) return;
    run(async () => {
      const { room } = await api.post('/rooms', { name: newRoom.trim() });
      setNewRoom('');
      await loadRooms();
      setActive(room);
    });
  };

  const joinRoom = () =>
    run(async () => {
      const { room } = await api.post(`/rooms/${active._id}/join`);
      setRooms((r) => r.map((x) => (x._id === room._id ? room : x)));
      setActive(room);
      const d = await api.get(`/rooms/${room._id}/messages`);
      setMessages(d.messages);
    });

  const leaveRoom = () =>
    run(async () => {
      const { room } = await api.post(`/rooms/${active._id}/leave`);
      setRooms((r) => r.map((x) => (x._id === room._id ? room : x)));
      setActive(room);
    });

  const deleteRoom = () => window.confirm('Delete this room and all its messages?') && run(() => api.del(`/rooms/${active._id}`));

  const send = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    socketRef.current.emit('message:send', { roomId: active._id, text }, (res) => res?.error && setError(res.error));
    setText('');
  };

  const onType = (e) => {
    setText(e.target.value);
    if (Date.now() - lastTyping.current > 1000) {
      lastTyping.current = Date.now();
      socketRef.current.emit('typing', { roomId: active._id });
    }
  };

  const upload = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    run(() => api.post(`/rooms/${active._id}/files`, form));
  };

  const canDeleteRoom = active && ((active.owner?._id || active.owner) === user.id || user.role === 'admin');

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="me">
          <strong>{user.username}</strong>
          {user.role === 'admin' && <span className="badge">admin</span>}
          <button className="ghost" onClick={logout}>Logout</button>
        </div>
        <form onSubmit={createRoom} className="new-room">
          <input placeholder="New room name" value={newRoom} onChange={(e) => setNewRoom(e.target.value)} />
          <button>+</button>
        </form>
        <ul>
          {rooms.map((r) => (
            <li key={r._id} className={active?._id === r._id ? 'active' : ''} onClick={() => setActive(r)}>
              # {r.name} {!isMember(r) && <small>(not joined)</small>}
            </li>
          ))}
        </ul>
      </aside>

      <main className="main">
        {!active ? (
          <div className="center">Pick a room or create one</div>
        ) : (
          <>
            <header className="room-header">
              <h3># {active.name}</h3>
              <div>
                {isMember(active) ? <button className="ghost" onClick={leaveRoom}>Leave</button> : <button onClick={joinRoom}>Join</button>}
                {canDeleteRoom && <button className="danger" onClick={deleteRoom}>Delete</button>}
              </div>
            </header>

            {error && <p className="error banner">{error}</p>}

            {isMember(active) ? (
              <>
                <div className="messages">
                  {messages.map((m) => (
                    <div key={m._id} className={`msg ${m.sender._id === user.id ? 'mine' : ''}`}>
                      <div className="meta">
                        {m.sender.username} · {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {(m.sender._id === user.id || user.role === 'admin') && (
                          <span className="x" onClick={() => run(() => api.del(`/messages/${m._id}`))}>delete</span>
                        )}
                      </div>
                      {m.text && <div>{m.text}</div>}
                      {m.file && (
                        <button className="file" onClick={() => run(() => downloadFile(m.file._id, m.file.originalName))}>
                          📎 {m.file.originalName} ({fmtSize(m.file.size)})
                        </button>
                      )}
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
                <div className="typing">{typing && `${typing} is typing...`}</div>
                <form className="composer" onSubmit={send}>
                  <input ref={fileRef} type="file" hidden onChange={upload} />
                  <button type="button" className="ghost" onClick={() => fileRef.current.click()}>📎</button>
                  <input placeholder="Type a message" value={text} onChange={onType} maxLength={2000} />
                  <button>Send</button>
                </form>
              </>
            ) : (
              <div className="center">Join this room to read and send messages</div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
