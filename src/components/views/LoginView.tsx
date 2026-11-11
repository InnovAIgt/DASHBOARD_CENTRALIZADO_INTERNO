import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalTab, setLegalTab] = useState<'privacidad' | 'terminos'>('privacidad');
  const [loading, setLoading] = useState(false);

  // Link stylesheet for login if not already present
  useEffect(() => {
    const existing = document.getElementById('login-css-link');
    if (!existing) {
      const link = document.createElement('link');
      link.id = 'login-css-link';
      link.rel = 'stylesheet';
      link.href = '/assets/css/login.css?v=20261021tokens';
      document.head.appendChild(link);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username || 'F', password || 'demo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-frame">
      <main className="login-shell">
        {/* Topbar navigation */}
        <header className="topbar" aria-label="Navegación principal">
          <span>OPERACIONES</span>
          <i aria-hidden="true"></i>
          <span>ADMINISTRACIÓN</span>
          <i aria-hidden="true"></i>
          <span>SISTEMAS</span>
          <b aria-hidden="true"></b>
        </header>

        {/* Brand and titles on left */}
        <section className="intro" aria-labelledby="portal-title">
          <div className="brand-lockup">
            <img
              className="brand-mark"
              src="/assets/img/logo-intelfon.png"
              alt="Logotipo RED Intelfon"
              width="104"
              height="104"
            />
            <div>
              <div className="brand-name">Intelfon</div>
              <div className="brand-tagline">C O N E C T A M O S &nbsp; T U &nbsp; M U N D O</div>
            </div>
          </div>
          <h1 id="portal-title">Portal corporativo interno</h1>
          <p className="intro-lead">
            Acceso centralizado a herramientas<br />operativas y administrativas
          </p>
        </section>

        {/* Login card on right */}
        <section className="login-card" aria-labelledby="login-title">
          <div className="login-card-content">
            <div className="card-heading">
              <h2 id="login-title">Iniciar sesión</h2>
              <small>Uso exclusivo de personal autorizado</small>
            </div>

            <form id="loginForm" onSubmit={handleSubmit}>
              <label className="field">
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  placeholder="Correo o usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </label>

              <label className="field">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  className="password-toggle"
                  type="button"
                  id="togglePassword"
                  onClick={() => setShowPassword(p => !p)}
                  aria-label="Mostrar u ocultar contraseña"
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </label>

              <div className="form-options">
                <label className="remember">
                  <input
                    id="remember"
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <span></span>Recordarme
                </label>
                <a
                  href="#recuperar"
                  id="recoverLink"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Comunícate con el área de Sistemas de RED Intelfon para restablecer tu acceso.');
                  }}
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>

              <div className="consent-block" id="consentBlock">
                <label className="remember consent">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                  />
                  <span></span>
                  He leído y acepto la política de privacidad y los términos y condiciones
                </label>
              </div>

              <button className="submit-button" type="submit" disabled={loading}>
                {loading ? 'INGRESANDO...' : 'INGRESAR AL PORTAL'}
              </button>

              <button
                className="legal-button"
                type="button"
                id="openLegal"
                onClick={() => setShowLegalModal(true)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M12 3 4.5 5.8v5.4c0 4.6 3.1 8.6 7.5 9.8 4.4-1.2 7.5-5.2 7.5-9.8V5.8L12 3Z"></path>
                  <path d="m9 12 2.2 2.2L15.5 10"></path>
                </svg>
                Política de privacidad y términos
              </button>
            </form>
          </div>
        </section>

        {/* Footer */}
        <footer className="page-footer">
          <span>
            Guatemala&nbsp;&nbsp; | &nbsp;&nbsp;El Salvador<br />
            <small>v1.0.0</small>
          </span>
        </footer>
      </main>

      {/* Legal & Terms Modal */}
      {showLegalModal && (
        <div className="legal-modal is-open" id="legalModal" role="dialog" aria-modal="true" aria-labelledby="legalTitle">
          <div className="legal-backdrop" onClick={() => setShowLegalModal(false)}></div>
          <div className="legal-dialog">
            <header className="legal-head">
              <div className="legal-head-copy">
                <h3 id="legalTitle">Política de privacidad y términos</h3>
                <p>Portal corporativo RED Intelfon</p>
              </div>
              <button
                className="legal-close"
                type="button"
                id="closeLegal"
                onClick={() => setShowLegalModal(false)}
                aria-label="Cerrar ventana"
              >
                ✕
              </button>
            </header>

            <nav className="legal-tabs" role="tablist" aria-label="Secciones del documento">
              <button
                className={`legal-tab ${legalTab === 'privacidad' ? 'is-active' : ''}`}
                type="button"
                role="tab"
                aria-selected={legalTab === 'privacidad'}
                onClick={() => setLegalTab('privacidad')}
              >
                Política de privacidad
              </button>
              <button
                className={`legal-tab ${legalTab === 'terminos' ? 'is-active' : ''}`}
                type="button"
                role="tab"
                aria-selected={legalTab === 'terminos'}
                onClick={() => setLegalTab('terminos')}
              >
                Términos y condiciones
              </button>
            </nav>

            <div className="legal-body">
              {legalTab === 'privacidad' ? (
                <section className="legal-panel is-active" role="tabpanel">
                  <h4>1. Responsable del tratamiento</h4>
                  <p>RED Intelfon, a través del área de Sistemas, es responsable de los datos personales que se recaban en este portal de uso interno.</p>
                  <h4>2. Datos que recopilamos</h4>
                  <ul>
                    <li>Usuario o correo corporativo y clave de acceso (almacenada cifrada).</li>
                    <li>Fecha, hora e identificador del equipo al iniciar sesión.</li>
                    <li>Preferencias de sesión, como «Recordarme».</li>
                  </ul>
                  <h4>3. Para qué usamos tus datos</h4>
                  <ul>
                    <li>Autenticarte y darte acceso a los tableros autorizados.</li>
                    <li>Garantizar la seguridad y trazar el acceso interno.</li>
                    <li>Atender incidencias reportadas a la mesa de ayuda.</li>
                  </ul>
                  <h4>4. Conservación y seguridad</h4>
                  <p>La información se conserva mientras exista la relación laboral o de servicios y según las políticas de retención de la empresa. Se aplican controles de acceso, cifrado y registro de actividad.</p>
                  <h4>5. Tus derechos</h4>
                  <p>Puedes solicitar acceso, rectificación, actualización o eliminación de tus datos escribiendo a la mesa de ayuda de Sistemas. El uso de este portal implica el tratamiento descrito en esta política.</p>
                </section>
              ) : (
                <section className="legal-panel is-active" role="tabpanel">
                  <h4>1. Acceso autorizado</h4>
                  <p>Este portal es de uso exclusivo del personal autorizado de RED Intelfon. El acceso es personal e intransferible.</p>
                  <h4>2. Tus credenciales</h4>
                  <ul>
                    <li>Sos responsable de tu usuario y contraseña.</li>
                    <li>No debes compartirlas ni guardarlas en equipos compartidos.</li>
                    <li>Cualquier acceso sospechoso debe reportarse a Sistemas.</li>
                  </ul>
                  <h4>3. Uso permitido</h4>
                  <ul>
                    <li>Utilizar el portal únicamente para actividades laborales.</li>
                    <li>Respetar la confidencialidad de la información consultada.</li>
                    <li>No copiar, difundir ni reutilizar datos fuera del ámbito corporativo.</li>
                  </ul>
                  <h4>4. Monitoreo y suspensión</h4>
                  <p>Las sesiones quedan registradas con fines de auditoría. El área de Sistemas puede suspender accesos ante incumplimientos de estas condiciones.</p>
                  <h4>5. Modificaciones</h4>
                  <p>Estos términos pueden actualizarse; la versión vigente siempre estará disponible en esta ventana. Al marcar la casilla confirmas que los has leído y aceptado.</p>
                </section>
              )}
            </div>

            <footer className="legal-foot">
              <small>Versión 1.0 · Octubre 2026</small>
              <div className="legal-foot-actions">
                <button
                  className="legal-ghost"
                  type="button"
                  onClick={() => setShowLegalModal(false)}
                >
                  Cerrar
                </button>
                <button
                  className="legal-accept"
                  type="button"
                  onClick={() => {
                    setTermsAccepted(true);
                    setShowLegalModal(false);
                  }}
                >
                  He leído, acepto
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};
