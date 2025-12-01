import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { ChatIAService } from '../services/chat-ia.service';

interface Mensaje {
  id: string;
  texto: string;
  es_usuario: boolean;
  timestamp: Date;
  tipo?: 'texto' | 'productos' | 'recomendacion';
  productos?: any[];
}

@Component({
  selector: 'app-chat-ia',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './chat-ia.component.html',
  styleUrl: './chat-ia.component.css',
  providers: [ChatIAService]
})
export class ChatIAComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatMessages', { static: false }) chatMessages!: ElementRef;

  // ===== CHAT =====
  mensajes: Mensaje[] = [];
  mensajeActual: string = '';
  cargando: boolean = false;

  // ===== USUARIO =====
  userMenuOpen: boolean = false;
  isLoggedIn: boolean = false;
  userName: string = '';
  userImage: string = 'assets/img/user-icon.png';
  userId: number = 0;

  // ===== BÚSQUEDA =====
  busqueda: string = '';

  // ===== SUGERENCIAS =====
  sugerenciasRapidas = [
    '¿Qué medicamento para la gripe?',
    'Medicamentos para la presión arterial',
    'Equipos de laboratorio',
    'Productos de farmacia',
    'Promociones actuales'
  ];

  constructor(
    private chatIAService: ChatIAService,
    private router: Router
  ) {}

  ngOnInit() {
    this.cargarUsuario();
    this.inicializarChat();
  }

  ngAfterViewChecked() {
    this.scrollAlFinal();
  }

  // ===== INICIALIZAR CHAT =====
  inicializarChat() {
    const mensajeBienvenida: Mensaje = {
      id: '1',
      texto: '👋 ¡Hola! Soy tu asistente IA de MedTools. Puedo ayudarte a encontrar medicamentos, equipos médicos y recomendaciones de salud. ¿Qué buscas hoy?\n\nPrueba preguntar sobre:\n• Síntomas o dolencias\n• Tipos de medicamentos\n• Equipos médicos\n• Promociones y ofertas',
      es_usuario: false,
      timestamp: new Date(),
      tipo: 'texto'
    };
    this.mensajes.push(mensajeBienvenida);
  }

  // ===== ENVIAR MENSAJE =====
  enviarMensaje() {
    if (!this.mensajeActual.trim()) return;

    // Agregar mensaje del usuario
    const mensajeUsuario: Mensaje = {
      id: `msg_${Date.now()}`,
      texto: this.mensajeActual,
      es_usuario: true,
      timestamp: new Date(),
      tipo: 'texto'
    };

    this.mensajes.push(mensajeUsuario);
    const pregunta = this.mensajeActual;
    this.mensajeActual = '';
    this.cargando = true;

    // Obtener respuesta de IA
    this.chatIAService.obtenerRespuestaIA(pregunta, this.userId).subscribe({
      next: (response) => {
        console.log('✅ Respuesta IA:', response);
        
        // Procesar la respuesta
        let textRespuesta = response.respuesta || response.texto || 'No pude procesar tu solicitud';
        let tipoRespuesta = response.tipo || 'texto';
        let productosRespuesta = response.productos || [];

        const mensajeRespuesta: Mensaje = {
          id: `msg_${Date.now()}`,
          texto: textRespuesta,
          es_usuario: false,
          timestamp: new Date(),
          tipo: tipoRespuesta,
          productos: productosRespuesta
        };

        this.mensajes.push(mensajeRespuesta);
        this.cargando = false;

        // Guardar en historial si está logueado
        if (this.isLoggedIn && this.userId) {
          this.chatIAService.guardarHistorialChat(
            this.userId,
            pregunta,
            textRespuesta
          ).subscribe({
            error: (err) => console.error('Error al guardar historial:', err)
          });
        }
      },
      error: (error) => {
        console.error('❌ Error:', error);
        
        let mensajeError = '❌ Lo siento, hubo un error al procesar tu solicitud. Por favor intenta de nuevo.';
        
        if (error.status === 0) {
          mensajeError = '❌ Error de conexión. Verifica que el servidor esté disponible.';
        } else if (error.error?.detail) {
          mensajeError = `❌ Error: ${error.error.detail}`;
        }

        const mensajeRespuestaError: Mensaje = {
          id: `msg_${Date.now()}`,
          texto: mensajeError,
          es_usuario: false,
          timestamp: new Date(),
          tipo: 'texto'
        };

        this.mensajes.push(mensajeRespuestaError);
        this.cargando = false;
      }
    });
  }

  // ===== SUGERENCIA RÁPIDA =====
  usarSugerencia(sugerencia: string) {
    this.mensajeActual = sugerencia;
    this.enviarMensaje();
  }

  // ===== IR A PRODUCTO =====
  irAProducto(productoId: number) {
    this.router.navigate(['/producto', productoId]);
  }

  // ===== SCROLL =====
  scrollAlFinal() {
    try {
      if (this.chatMessages) {
        this.chatMessages.nativeElement.scrollTop = 
          this.chatMessages.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.log('Error al hacer scroll', err);
    }
  }

  // ===== NAVEGACIÓN =====
  volverAtras() {
    this.router.navigate(['/']);
  }

  buscarProductos() {
    if (this.busqueda.trim()) {
      this.router.navigate(['/'], { queryParams: { q: this.busqueda } });
    }
  }

  // ===== USUARIO =====
  cargarUsuario() {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        this.isLoggedIn = true;
        this.userId = parsed.id;
        this.userName = parsed.nombre || parsed.email?.split('@')[0] || 'Usuario';
        this.userImage = parsed.imagen || 'assets/img/profile.jpeg';
        console.log('✅ Usuario cargado:', this.userName);
      } catch (error) {
        console.error('Error al cargar usuario:', error);
      }
    }
  }

  logout() {
    localStorage.removeItem('user');
    this.isLoggedIn = false;
    this.userMenuOpen = false;
    this.router.navigate(['/login']);
  }

  toggleUserMenu() {
    this.userMenuOpen = !this.userMenuOpen;
  }

  irPerfil() {
    this.userMenuOpen = false;
    this.router.navigate(['/perfil']);
  }

  irConfiguracion() {
    this.userMenuOpen = false;
    this.router.navigate(['/configuracion']);
  }

  @HostListener('document:click', ['$event'])
  clickFuera(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const clickedInsideUserInfo = target.closest('.user-info');
    
    if (!clickedInsideUserInfo && this.userMenuOpen) {
      this.userMenuOpen = false;
    }
  }
}
