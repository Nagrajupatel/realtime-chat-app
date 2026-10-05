import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegister) await register(form.username, form.email, form.password);
      else await login(form.email, form.password);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="center">
      <form className="card" onSubmit={submit}>
        <h2>{isRegister ? 'Create account' : 'Welcome back'}</h2>
        {isRegister && <input placeholder="Username" value={form.username} onChange={set('username')} required />}
        <input type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
        <input type="password" placeholder="Password" value={form.password} onChange={set('password')} required minLength={6} />
        {error && <p className="error">{error}</p>}
        <button type="submit">{isRegister ? 'Sign up' : 'Log in'}</button>
        <p className="link" onClick={() => setIsRegister(!isRegister)}>
          {isRegister ? 'Already have an account? Log in' : "New here? Create an account"}
        </p>
      </form>
    </div>
  );
}
