
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { EyeIcon } from '../components/icons/Icons';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loginDemo, loading, error } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDemoClick = () => {
      loginDemo();
      navigate('/dashboard');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg border border-gray-200">
        <h1 className="text-2xl font-bold text-center text-gray-800">
          Nafat Immobilier
        </h1>
        <h2 className="text-xl font-semibold text-center text-gray-700">Connexion</h2>
        <form className="space-y-6" onSubmit={handleSubmit} autoComplete="off">
          <div>
            <label
              htmlFor="email"
              className="text-sm font-medium text-gray-700"
            >
              Adresse e-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="off"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 mt-1 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="text-sm font-medium text-gray-700"
            >
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 mt-1 text-gray-700 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-300"
            >
              {loading ? 'Connexion en cours...' : 'Se connecter'}
            </button>
            
            <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">OU</span>
                <div className="flex-grow border-t border-gray-200"></div>
            </div>

            <button
              type="button"
              onClick={handleDemoClick}
              disabled={loading}
              className="w-full px-4 py-2 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center transition-colors"
            >
              <EyeIcon className="w-5 h-5 mr-2" />
              Accéder au mode Démo (Formation)
            </button>
             <p className="text-xs text-center text-gray-500 mt-2">
                Le mode démo utilise des données locales temporaires. Aucune donnée n'est enregistrée sur le serveur.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
