import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  isRegisterMode = false;
  nombre = '';
  apellido = '';
  email = '';
  contrasena = '';

  alertaVisible = false;
  mensajeAlerta = '';
  tipoAlerta: 'exito' | 'error' | 'info' = 'info';

  // 🔹 URL base del backend
  private apiUrl = 'http://localhost:8000/api';
  private baseUrl = 'http://localhost:8000'; // URL base para imágenes

  constructor(public router: Router, private http: HttpClient) {}

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
      this.mostrarAlerta('Por favor completa todos los campos', 'error');
      return;
    }

    if (this.contrasena.length < 6) {
      this.mostrarAlerta('La contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }

    const user = {
      nombre: this.nombre,
      apellido: this.apellido,
      email: this.email,
      password: this.contrasena
    };

    this.http.post(`${this.apiUrl}/usuarios/register`, user).subscribe({
      next: (res) => {
        console.log('Usuario registrado:', res);
        this.mostrarAlerta('Registro exitoso 🎉', 'exito');
        setTimeout(() => {
          this.switchToLogin();
        }, 1000);
      },
      error: (err) => {
        console.error('Error al registrar:', err);
        const mensaje = err.error?.detail || 'Error al registrarte 😢';
        this.mostrarAlerta(mensaje, 'error');
      }
    });
  }

  // ===========================
  // Login - ACTUALIZADO CON ROLES
  // ===========================
  login() {
    // Validación básica
    if (!this.email || !this.contrasena) {
      this.mostrarAlerta('Por favor completa todos los campos', 'error');
      return;
    }

    // ✅ NUEVO: Usar el endpoint /login simple que devuelve el usuario completo
    const credentials = {
      email: this.email,
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

        // ✅ Guardar usuario completo CON ROL
        const userData = {
          id: response.id_usuario,
          id_usuario: response.id_usuario,
          nombre: response.nombre,
          apellido: response.apellido || '',
          email: response.email,
          telefono: response.telefono || '',
          imagen: imagenUrl,
          rol: response.rol  // ✅ CAMPO CLAVE
        };

        console.log('💾 Guardando en localStorage:', userData);

        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('email', response.email);
        localStorage.setItem('userId', response.id_usuario.toString());
        
        // Emitir evento para actualizar el header
        window.dispatchEvent(new Event('storage'));

        // ✅ REDIRIGIR SEGÚN EL ROL
        if (response.rol === 'admin') {
          console.log('🔐 Usuario ADMIN detectado, redirigiendo al panel admin...');
          this.mostrarAlerta(`¡Bienvenido Admin ${response.nombre}! 👑`, 'exito');
          setTimeout(() => {
            this.router.navigate(['/admin']);
          }, 1000);
        } else {
          console.log('👤 Usuario NORMAL detectado, redirigiendo a la tienda...');
          this.mostrarAlerta(`¡Hola ${response.nombre}! Inicio de sesión correcto 🔥`, 'exito');
          setTimeout(() => {
            this.router.navigate(['/']);
          }, 1000);
        }
      },
      error: (err) => {
        console.error('❌ Error al iniciar sesión:', err);
        const mensaje = err.error?.detail || 'Credenciales incorrectas ❌';
        this.mostrarAlerta(mensaje, 'error');
      }
    });
  }
}