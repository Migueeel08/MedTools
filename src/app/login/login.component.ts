import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';

declare var google: any;

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, AfterViewInit {
  isRegisterMode = false;
  nombre = '';
  apellido = '';
  email = '';
  contrasena = '';

  alertaVisible = false;
  mensajeAlerta = '';
  tipoAlerta: 'exito' | 'error' | 'info' = 'info';

  // 🔹 URL base del backend - ACTUALIZA ESTO CON TU URL
  private apiUrl = 'http://localhost:8000/api';
  private baseUrl = 'http://localhost:8000'; // URL base para imágenes

  constructor(public router: Router, private http: HttpClient) {}

  ngOnInit(): void {
    // Cargar el script de Google
    this.loadGoogleScript();
  }

  ngAfterViewInit(): void {
    // Inicializar Google Sign-In después de que la vista esté lista
    setTimeout(() => {
      this.initializeGoogleSignIn();
    }, 500);
  }

  // ===========================
  // GOOGLE SIGN-IN
  // ===========================
  loadGoogleScript(): void {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }

  initializeGoogleSignIn(): void {
    if (typeof google !== 'undefined') {
      google.accounts.id.initialize({
        client_id: '287808420980-s2poeedgd6veoojkev5j3huia9no8uh2.apps.googleusercontent.com', // CAMBIA ESTO POR TU CLIENT_ID
        callback: this.handleCredentialResponse.bind(this)
      });

      google.accounts.id.renderButton(
        document.getElementById('buttonDiv'),
        { 
          theme: 'outline', 
          size: 'large',
          width: '100%',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left'
        }
      );
    }
  }

  handleCredentialResponse(response: any): void {
    // Decodificar el JWT token que Google nos envía
    const payload = this.parseJwt(response.credential);
    
    console.log('📦 Payload completo de Google:', payload);

    // Enviar datos al backend
    const userData = {
      email: payload.email,
      nombre: payload.given_name || payload.name || 'Usuario',
      apellido: payload.family_name || '',
      imagen: payload.picture || 'assets/img/profile.jpeg',
      google_id: payload.sub,
      email_verified: payload.email_verified || false
    };

    console.log('📤 Datos que se enviarán al backend:', userData);

    this.http.post<any>(`${this.apiUrl}/usuarios/google-login`, userData)
      .subscribe({
        next: (response) => {
          console.log('✅ Login con Google exitoso:', response);

          // Construir URL completa de la imagen
          let imagenUrl = response.imagen;
          
          if (response.imagen && !response.imagen.startsWith('http')) {
            if (response.imagen.startsWith('/uploads')) {
              imagenUrl = `${this.baseUrl}${response.imagen}`;
            } else if (response.imagen.startsWith('uploads')) {
              imagenUrl = `${this.baseUrl}/${response.imagen}`;
            } else if (response.imagen.startsWith('assets/')) {
              imagenUrl = response.imagen;
            } else {
              imagenUrl = `${this.baseUrl}/uploads/perfiles/${response.imagen}`;
            }
          }

          // Guardar usuario completo CON ROL
          const userData = {
            id: response.id_usuario,
            id_usuario: response.id_usuario,
            nombre: response.nombre,
            apellido: response.apellido || '',
            email: response.email,
            telefono: response.telefono || '',
            imagen: imagenUrl,
            rol: response.rol
          };

          console.log('💾 Guardando en localStorage:', userData);

          localStorage.setItem('user', JSON.stringify(userData));
          localStorage.setItem('email', response.email);
          localStorage.setItem('userId', response.id_usuario.toString());
          
          // Emitir evento para actualizar el header
          window.dispatchEvent(new Event('storage'));

          // Redirigir según el rol
          if (response.rol === 'admin') {
            console.log('🔐 Usuario ADMIN detectado, redirigiendo al panel admin...');
            this.mostrarAlerta(`¡Bienvenido Admin ${response.nombre}! 🏥`, 'exito');
            setTimeout(() => {
              this.router.navigate(['/admin']);
            }, 1500);
          } else {
            console.log('👤 Usuario NORMAL detectado, redirigiendo a la tienda...');
            this.mostrarAlerta(`¡Bienvenido ${response.nombre}! Acceso concedido 💙`, 'exito');
            setTimeout(() => {
              this.router.navigate(['/']);
            }, 1500);
          }
        },
        error: (error) => {
          console.error('❌ Error completo:', error);
          console.error('❌ Error status:', error.status);
          console.error('❌ Error detail:', error.error);
          this.mostrarAlerta('Error al iniciar sesión con Google. Intenta nuevamente.', 'error');
        }
      });
  }

  parseJwt(token: string): any {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  }

  // ===========================
  // Cambiar entre Login y Registro
  // ===========================
  toggleMode() {
    this.isRegisterMode = !this.isRegisterMode;
    this.limpiarCampos();
  }

  switchToLogin() {
    this.isRegisterMode = false;
    this.limpiarCampos();
  }

  switchToRegister() {
    this.isRegisterMode = true;
    this.limpiarCampos();
  }

  limpiarCampos() {
    this.nombre = '';
    this.apellido = '';
    this.email = '';
    this.contrasena = '';
  }

  // ===========================
  // Mostrar alerta
  // ===========================
  mostrarAlerta(mensaje: string, tipo: 'exito' | 'error' | 'info' = 'info') {
    this.mensajeAlerta = mensaje;
    this.tipoAlerta = tipo;
    this.alertaVisible = true;
    setTimeout(() => this.alertaVisible = false, 3000);
  }

  // ===========================
  // Submit del formulario
  // ===========================
  onSubmit() {
    if (this.isRegisterMode) {
      this.register();
    } else {
      this.login();
    }
  }

  // ===========================
  // Registro de usuario
  // ===========================
  register() {
    // Validación básica
    if (!this.nombre || !this.apellido || !this.email || !this.contrasena) {
      this.mostrarAlerta('Por favor completa todos los campos requeridos', 'error');
      return;
    }

    // Validación de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.mostrarAlerta('Por favor ingresa un correo electrónico válido', 'error');
      return;
    }

    if (this.contrasena.length < 6) {
      this.mostrarAlerta('La contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }

    const user = {
      nombre: this.nombre.trim(),
      apellido: this.apellido.trim(),
      email: this.email.trim().toLowerCase(),
      password: this.contrasena
    };

    console.log('📝 Registrando usuario:', { ...user, password: '****' });

    this.http.post(`${this.apiUrl}/usuarios/register`, user).subscribe({
      next: (res) => {
        console.log('✅ Usuario registrado exitosamente:', res);
        this.mostrarAlerta('¡Registro exitoso! Ahora puedes iniciar sesión 🎉', 'exito');
        setTimeout(() => {
          this.switchToLogin();
        }, 1500);
      },
      error: (err) => {
        console.error('❌ Error al registrar:', err);
        let mensaje = 'Error al registrar usuario. Intenta nuevamente.';
        
        if (err.error?.detail) {
          mensaje = err.error.detail;
        } else if (err.status === 400) {
          mensaje = 'El correo electrónico ya está registrado';
        } else if (err.status === 0) {
          mensaje = 'No se pudo conectar con el servidor';
        }
        
        this.mostrarAlerta(mensaje, 'error');
      }
    });
  }

  // ===========================
  // Login - CON ROLES Y VALIDACIONES
  // ===========================
  login() {
    // Validación básica
    if (!this.email || !this.contrasena) {
      this.mostrarAlerta('Por favor completa todos los campos', 'error');
      return;
    }

    // Validación de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.mostrarAlerta('Por favor ingresa un correo electrónico válido', 'error');
      return;
    }

    const credentials = {
      email: this.email.trim().toLowerCase(),
      password: this.contrasena
    };

    console.log('🔐 Intentando login con:', credentials.email);

    this.http.post<any>(`${this.apiUrl}/usuarios/login`, credentials).subscribe({
      next: (response) => {
        console.log('✅ Login exitoso:', response);
        console.log('✅ Rol del usuario:', response.rol);

        // Construir URL completa de la imagen
        let imagenUrl = 'assets/img/profile.jpeg'; // Imagen por defecto
        
        if (response.imagen && response.imagen.trim() !== '') {
          if (response.imagen.startsWith('/uploads')) {
            imagenUrl = `${this.baseUrl}${response.imagen}`;
          } else if (response.imagen.startsWith('uploads')) {
            imagenUrl = `${this.baseUrl}/${response.imagen}`;
          } else if (response.imagen.startsWith('http')) {
            imagenUrl = response.imagen;
          } else if (response.imagen.startsWith('assets/')) {
            imagenUrl = response.imagen;
          } else if (!response.imagen.includes('/')) {
            imagenUrl = `${this.baseUrl}/uploads/perfiles/${response.imagen}`;
          } else {
            imagenUrl = `${this.baseUrl}${response.imagen}`;
          }
        }

        // Guardar usuario completo CON ROL
        const userData = {
          id: response.id_usuario,
          id_usuario: response.id_usuario,
          nombre: response.nombre,
          apellido: response.apellido || '',
          email: response.email,
          telefono: response.telefono || '',
          imagen: imagenUrl,
          rol: response.rol
        };

        console.log('💾 Guardando en localStorage:', userData);

        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('email', response.email);
        localStorage.setItem('userId', response.id_usuario.toString());
        
        // Emitir evento para actualizar el header
        window.dispatchEvent(new Event('storage'));

        // Redirigir según el rol
        if (response.rol === 'admin') {
          console.log('🔐 Usuario ADMIN detectado, redirigiendo al panel admin...');
          this.mostrarAlerta(`¡Bienvenido Admin ${response.nombre}! 🏥`, 'exito');
          setTimeout(() => {
            this.router.navigate(['/admin']);
          }, 1500);
        } else {
          console.log('👤 Usuario NORMAL detectado, redirigiendo a la tienda...');
          this.mostrarAlerta(`¡Hola ${response.nombre}! Acceso concedido 💙`, 'exito');
          setTimeout(() => {
            this.router.navigate(['/']);
          }, 1500);
        }
      },
      error: (err) => {
        console.error('❌ Error al iniciar sesión:', err);
        let mensaje = 'Credenciales incorrectas. Verifica tu email y contraseña.';
        
        if (err.error?.detail) {
          mensaje = err.error.detail;
        } else if (err.status === 401) {
          mensaje = 'Email o contraseña incorrectos';
        } else if (err.status === 404) {
          mensaje = 'Usuario no encontrado. Verifica tu email';
        } else if (err.status === 0) {
          mensaje = 'No se pudo conectar con el servidor';
        }
        
        this.mostrarAlerta(mensaje, 'error');
      }
    });
  }
}