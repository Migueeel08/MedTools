import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuariosService } from '../../services/usuarios.service';

@Component({
  selector: 'app-editperfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editperfil.component.html',
  styleUrls: ['./editperfil.component.css']
})
export class EditPerfilComponent implements OnInit {
  user: any = {
    id: null,
    id_usuario: null,
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    lada: '+52',
    imagen: 'assets/img/avatar.png'
  };

  selectedFile: File | null = null;
  imagenPreview: string | ArrayBuffer | null = null;
  mostrarAlerta = false;
  mensajeAlerta = '';

  constructor(
    private router: Router,
    private usuarioService: UsuariosService
  ) {}

  ngOnInit(): void {
    const userString = localStorage.getItem('user');
    if (userString) {
      const userData = JSON.parse(userString);
      
      // ✅ Separar lada y teléfono de forma simple
      let lada = '+52';
      let telefono = '';
      
      if (userData.telefono) {
        const tel = userData.telefono.toString().replace(/\s+/g, ''); // Quitar espacios
        
        // Si empieza con +52, separar
        if (tel.startsWith('+52')) {
          lada = '+52';
          telefono = tel.substring(3); // Todo después de +52
        } 
        // Si empieza con +1, +34, +44, etc
        else if (tel.startsWith('+1')) {
          lada = '+1';
          telefono = tel.substring(2);
        }
        else if (tel.startsWith('+')) {
          // Para cualquier otra lada (+34, +44, +33, etc)
          lada = tel.substring(0, 3); // +XX
          telefono = tel.substring(3);
        }
        else {
          // Si no tiene +, es solo el número
          telefono = tel;
        }
      }
      
      this.user = { 
        ...userData,
        id_usuario: userData.id || userData.id_usuario,
        lada: userData.lada || lada,
        telefono: telefono  // ✅ Solo los 10 dígitos sin lada
      };
      
      console.log('📱 Lada:', this.user.lada);
      console.log('📱 Teléfono:', this.user.telefono);
      console.log('📱 Longitud del teléfono:', this.user.telefono.length);
    } else {
      const usuarioLocal = this.usuarioService.usuarioActual;
      if (usuarioLocal) {
        let lada = '+52';
        let telefono = '';
        
        if (usuarioLocal.telefono) {
          const tel = usuarioLocal.telefono.toString().replace(/\s+/g, '');
          
          if (tel.startsWith('+52')) {
            lada = '+52';
            telefono = tel.substring(3);
          } else if (tel.startsWith('+1')) {
            lada = '+1';
            telefono = tel.substring(2);
          } else if (tel.startsWith('+')) {
            lada = tel.substring(0, 3);
            telefono = tel.substring(3);
          } else {
            telefono = tel;
          }
        }
        
        this.user = { 
          ...usuarioLocal,
          id_usuario: usuarioLocal.id || usuarioLocal.id_usuario,
          lada: usuarioLocal.lada || lada,
          telefono: telefono
        };
      }
    }

    const userId = this.user.id || this.user.id_usuario;
    
    if (!userId) {
      console.error('No se encontró ID del usuario:', this.user);
      alert('No se encontró el ID del usuario. Vuelve a iniciar sesión.');
      this.router.navigate(['/login']);
      return;
    }

    this.user.id = userId;
    this.user.id_usuario = userId;

    console.log('ID del usuario confirmado:', userId);
  }

  guardarCambios(): void {
    const userId = this.user.id || this.user.id_usuario;

    if (!userId) {
      alert('Error: No se encontró el ID del usuario');
      return;
    }

    // ✅ Validar que el teléfono tenga 10 dígitos (México)
    let telefonoCompleto = '';
    
    if (this.user.telefono && this.user.telefono.trim() !== '') {
      // Limpiar: solo números
      let telLimpio = this.user.telefono.toString().replace(/\D/g, '');
      
      // Validar longitud (10 dígitos para México)
      if (telLimpio.length !== 10) {
        alert('El teléfono debe tener exactamente 10 dígitos');
        return;
      }
      
      // Concatenar lada + teléfono
      telefonoCompleto = `${this.user.lada}${telLimpio}`;
      
      console.log('📤 Teléfono completo a guardar:', telefonoCompleto);
      console.log('   Lada:', this.user.lada);
      console.log('   Número:', telLimpio);
    }

    const usuarioActualizar = {
      nombre: this.user.nombre,
      apellido: this.user.apellido,
      telefono: telefonoCompleto
    };

    console.log('💾 Datos a enviar:', usuarioActualizar);

    this.usuarioService.actualizarUsuario(userId, usuarioActualizar).subscribe({
      next: (usuarioActualizado: any) => {
        console.log('✅ Usuario actualizado:', usuarioActualizado);

        if (this.selectedFile) {
          this.usuarioService.subirFotoPerfil(userId, this.selectedFile).subscribe({
            next: (res: any) => {
              console.log('📸 Foto subida correctamente:', res);
              if (res.foto_url) {
                this.user.imagen = `http://localhost:8000${res.foto_url}`;
              }
              this.finalizarActualizacion();
            },
            error: (err: any) => {
              console.error('❌ Error al subir foto:', err);
              this.finalizarActualizacion();
            }
          });
        } else {
          this.finalizarActualizacion();
        }
      },
      error: (err: any) => {
        console.error('❌ Error al actualizar usuario:', err);
        alert('No se pudo actualizar el perfil: ' + (err.error?.detail || 'Error desconocido'));
      }
    });
  }

  finalizarActualizacion(): void {
    const apiUrl = 'http://localhost:8000';
    
    let imagenFinal = this.user.imagen;
    
    if (imagenFinal && !imagenFinal.startsWith('http') && !imagenFinal.startsWith('assets') && !imagenFinal.startsWith('data:image')) {
      if (imagenFinal.startsWith('/uploads')) {
        imagenFinal = `${apiUrl}${imagenFinal}`;
      }
    }

    // ✅ Guardar teléfono completo en localStorage
    let telefonoCompleto = '';
    if (this.user.telefono && this.user.telefono.trim() !== '') {
      let telLimpio = this.user.telefono.toString().replace(/\D/g, '');
      telefonoCompleto = `${this.user.lada}${telLimpio}`;
    }

    const userData = {
      id: this.user.id || this.user.id_usuario,
      id_usuario: this.user.id || this.user.id_usuario,
      nombre: this.user.nombre,
      apellido: this.user.apellido,
      email: this.user.email,
      telefono: telefonoCompleto,  // +526181234567
      lada: this.user.lada,         // +52
      imagen: imagenFinal,
      rol: this.user.rol || 'user'
    };

    console.log('💾 Guardando en localStorage:');
    console.log('   Teléfono completo:', userData.telefono);
    console.log('   Lada:', userData.lada);

    localStorage.setItem('user', JSON.stringify(userData));
    this.usuarioService.setUsuarioActual(userData);
    window.dispatchEvent(new Event('storage'));

    this.mensajeAlerta = '¡Perfil actualizado correctamente!';
    this.mostrarAlerta = true;

    setTimeout(() => {
      this.router.navigate(['/configuracion']);
    }, 2500);
  }

  volver(): void {
    this.router.navigate(['/configuracion']);
  }

  abrirSelectorFoto(): void {
    const input: HTMLElement | null = document.getElementById('fotoInput');
    input?.click();
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('Por favor selecciona una imagen válida (JPG, PNG, GIF, WEBP)');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen es muy grande. Máximo 5MB');
        return;
      }

      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.imagenPreview = reader.result;
        this.user.imagen = this.imagenPreview as string;
      };
      reader.readAsDataURL(file);
    }
  }
}