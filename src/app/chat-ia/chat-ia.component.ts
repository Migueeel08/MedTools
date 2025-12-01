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
  tipo?: 'texto' | 'productos';
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
    '¿Hay oxímetros disponibles?',
    'Medicamentos para la presión arterial',
    'Termómetros digitales',
    '¿Qué tomar para el dolor de cabeza?',
    'Equipos de laboratorio'
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
      texto: '👋 ¡Hola! Soy tu asistente IA de MedTools. Puedo ayudarte a encontrar medicamentos, equipos médicos y darte recomendaciones de salud.\n\n💡 Prueba preguntarme:\n• "¿Hay oxímetros disponibles?"\n• "¿Qué tomar para el dolor de cabeza?"\n• "Necesito un termómetro digital"',
      es_usuario: false,
      timestamp: new Date(),
      tipo: 'texto'
    };
    this.mensajes.push(mensajeBienvenida);
  }

  // ===== FORMATEAR TEXTO =====
  formatearTexto(texto: string): string {
    // Convertir saltos de línea en <br>
    return texto.replace(/\n/g, '<br>');
  }

  // ===== ENVIAR MENSAJE =====
  enviarMensaje() {
    if (!this.mensajeActual.trim()) return;

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

    this.chatIAService.obtenerRespuestaIA(pregunta, this.userId).subscribe({
      next: (response) => {
        console.log('✅ Respuesta IA:', response);
        
        const mensajeRespuesta: Mensaje = {
          id: `msg_${Date.now()}`,
          texto: response.respuesta || 'No pude procesar tu solicitud',
          es_usuario: false,
          timestamp: new Date(),
          tipo: response.tipo || 'texto',
          productos: response.productos || []
        };

        this.mensajes.push(mensajeRespuesta);
        this.cargando = false;
      },
      error: (error) => {
        console.error('❌ Error:', error);
        
        const mensajeError: Mensaje = {
          id: `msg_${Date.now()}`,
          texto: '❌ Lo siento, hubo un error. Por favor intenta de nuevo.',
          es_usuario: false,
          timestamp: new Date(),
          tipo: 'texto'
        };

        this.mensajes.push(mensajeError);
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
    } catch (err) {}
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