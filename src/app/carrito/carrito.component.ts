import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

// Interfaces locales
interface ItemCarrito {
  id_carrito: number;
  id_usuario: number;
  id_producto: number;
  cantidad: number;
  color?: string | null;
  talla?: string | null;
  precio_unitario: number;
  fecha_agregado: string;
  fecha_actualizado: string;
  producto_nombre: string;
  producto_imagen: string | null;
  producto_disponible: boolean;
  producto_cantidad_disponible: number;
  subtotal: number;
}

interface CarritoResumen {
  id_usuario: number;
  total_items: number;
  total_productos: number;
  subtotal: number;
  items: ItemCarrito[];
}

@Component({
  selector: 'app-carrito',
  standalone: true,
  imports: [CommonModule, RouterModule, HttpClientModule],
  templateUrl: './carrito.component.html',
  styleUrl: './carrito.component.css'
})
export class CarritoComponent implements OnInit {
  
  private apiUrl = 'http://localhost:8000/api';
  
  // ===== DATOS DEL CARRITO =====
  carrito: CarritoResumen | null = null;
  cargando: boolean = true;
  
  // ===== USUARIO =====
  isLoggedIn: boolean = false;
  userId: number = 0;
  userName: string = '';
  userImage: string = 'assets/img/user-icon.png';
  userMenuOpen: boolean = false;

  // ===== MODAL DE CHECKOUT ===== ✅ NUEVO
  modalCheckoutVisible: boolean = false;
  direcciones: any[] = [];
  metodosPago: any[] = [];
  direccionSeleccionada: any = null;
  metodoPagoSeleccionado: any = null;
  procesandoPago: boolean = false;

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.cargarUsuario();
    if (this.isLoggedIn) {
      this.cargarCarrito();
    } else {
      this.router.navigate(['/login']);
    }
  }

  // ===== CARGAR USUARIO =====
  cargarUsuario(): void {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        this.isLoggedIn = true;
        this.userId = parsed.id;

        this.userName =
          parsed.nombre ||
          parsed.firstName ||
          parsed.username ||
          (parsed.email ? parsed.email.split('@')[0] : 'Usuario');

        this.userImage =
          parsed.imagen && parsed.imagen.trim() !== ''
            ? parsed.imagen
            : 'assets/img/profile.jpeg';
      } catch (error: unknown) {
        console.error('Error al cargar usuario:', error);
        this.logout();
      }
    } else {
      this.isLoggedIn = false;
    }
  }

  // ===== CARGAR CARRITO =====
  cargarCarrito(): void {
    this.cargando = true;
    this.http.get<CarritoResumen>(`${this.apiUrl}/carrito/usuario/${this.userId}`).subscribe({
      next: (carrito: CarritoResumen) => {
        this.carrito = carrito;
        this.cargando = false;
        console.log('✅ Carrito cargado:', carrito);
      },
      error: (error: unknown) => {
        console.error('❌ Error al cargar carrito:', error);
        this.cargando = false;
        this.carrito = null;
      }
    });
  }

  // ===== INCREMENTAR CANTIDAD =====
  incrementarCantidad(item: ItemCarrito): void {
    if (item.cantidad >= item.producto_cantidad_disponible) {
      alert(`Solo hay ${item.producto_cantidad_disponible} unidades disponibles`);
      return;
    }

    this.http.put(
      `${this.apiUrl}/carrito/${item.id_carrito}?id_usuario=${this.userId}`,
      { cantidad: item.cantidad + 1 }
    ).subscribe({
      next: () => {
        this.cargarCarrito();
      },
      error: (error: unknown) => {
        console.error('Error al actualizar cantidad:', error);
        alert('Error al actualizar cantidad');
      }
    });
  }

  // ===== DECREMENTAR CANTIDAD =====
  decrementarCantidad(item: ItemCarrito): void {
    if (item.cantidad <= 1) {
      return;
    }

    this.http.put(
      `${this.apiUrl}/carrito/${item.id_carrito}?id_usuario=${this.userId}`,
      { cantidad: item.cantidad - 1 }
    ).subscribe({
      next: () => {
        this.cargarCarrito();
      },
      error: (error: unknown) => {
        console.error('Error al actualizar cantidad:', error);
        alert('Error al actualizar cantidad');
      }
    });
  }

  // ===== ELIMINAR ITEM =====
  eliminarItem(item: ItemCarrito): void {
    if (!confirm(`¿Eliminar ${item.producto_nombre} del carrito?`)) {
      return;
    }

    this.http.delete(`${this.apiUrl}/carrito/${item.id_carrito}?id_usuario=${this.userId}`).subscribe({
      next: () => {
        this.cargarCarrito();
        console.log('✅ Producto eliminado del carrito');
        
        // Emitir evento para actualizar el contador
        window.dispatchEvent(new CustomEvent('carritoActualizado'));
      },
      error: (error: unknown) => {
        console.error('Error al eliminar item:', error);
        alert('Error al eliminar producto');
      }
    });
  }

  // ===== VACIAR CARRITO =====
  vaciarCarrito(): void {
    if (!confirm('¿Estás seguro de vaciar todo el carrito?')) {
      return;
    }

    this.http.delete(`${this.apiUrl}/carrito/usuario/${this.userId}`).subscribe({
      next: () => {
        this.cargarCarrito();
        console.log('✅ Carrito vaciado');
        
        // Emitir evento para actualizar el contador
        window.dispatchEvent(new CustomEvent('carritoActualizado'));
      },
      error: (error: unknown) => {
        console.error('Error al vaciar carrito:', error);
        alert('Error al vaciar carrito');
      }
    });
  }

  // ===== PROCEDER AL PAGO ===== ✅ ABRE MODAL
  procederAlPago(): void {
    // Verificar que hay items disponibles
    const itemsDisponibles = this.carrito?.items.filter(item => item.producto_disponible);
    
    if (!itemsDisponibles || itemsDisponibles.length === 0) {
      alert('No hay productos disponibles en el carrito');
      return;
    }

    this.modalCheckoutVisible = true;
    this.cargarDireccionesUsuario();
    this.cargarMetodosPagoUsuario();
  }

  // ===== CARGAR DIRECCIONES DEL USUARIO ===== ✅ NUEVO
  cargarDireccionesUsuario(): void {
    console.log('🔍 Cargando direcciones para usuario:', this.userId);
    
    this.http.get<any[]>(`${this.apiUrl}/direcciones/usuario/${this.userId}`).subscribe({
      next: (direcciones) => {
        console.log('✅ Direcciones recibidas:', direcciones);
        this.direcciones = direcciones;
        
        if (direcciones.length > 0) {
          this.direccionSeleccionada = direcciones[0];
        }
      },
      error: (error) => {
        console.error('❌ Error cargando direcciones:', error);
        this.direcciones = [];
      }
    });
  }

  // ===== CARGAR MÉTODOS DE PAGO DEL USUARIO ===== ✅ NUEVO
  cargarMetodosPagoUsuario(): void {
    console.log('🔍 Cargando métodos de pago para usuario:', this.userId);
    
    this.http.get<any[]>(`${this.apiUrl}/metodos-pago/usuario/${this.userId}`).subscribe({
      next: (metodos) => {
        console.log('✅ Métodos de pago recibidos:', metodos);
        this.metodosPago = metodos;
        
        if (metodos.length > 0) {
          this.metodoPagoSeleccionado = metodos[0];
        }
      },
      error: (error) => {
        console.error('❌ Error cargando métodos de pago:', error);
        this.metodosPago = [];
      }
    });
  }

  // ===== CERRAR MODAL ===== ✅ NUEVO
  cerrarModalCheckout(): void {
    this.modalCheckoutVisible = false;
    this.direccionSeleccionada = null;
    this.metodoPagoSeleccionado = null;
  }

  // ===== SELECCIONAR DIRECCIÓN ===== ✅ NUEVO
  seleccionarDireccion(direccion: any): void {
    this.direccionSeleccionada = direccion;
  }

  // ===== SELECCIONAR MÉTODO DE PAGO ===== ✅ NUEVO
  seleccionarMetodoPago(metodo: any): void {
    this.metodoPagoSeleccionado = metodo;
  }

  // ===== DETECTAR MARCA DE TARJETA ===== ✅ NUEVO
  detectarMarcaTarjeta(banco: string): string {
    if (!banco) return 'generic';
    
    const bancoLower = banco.toLowerCase();
    
    const marcasPorBanco: { [key: string]: string } = {
      'visa': 'visa',
      'mastercard': 'mastercard',
      'master card': 'mastercard',
      'american express': 'amex',
      'amex': 'amex',
      'discover': 'discover',
      'diners': 'diners',
      'jcb': 'jcb',
      'unionpay': 'unionpay',
      'maestro': 'maestro'
    };

    for (const [key, marca] of Object.entries(marcasPorBanco)) {
      if (bancoLower.includes(key)) {
        return marca;
      }
    }

    return 'generic';
  }

  // ===== OBTENER LOGO DE TARJETA ===== ✅ NUEVO
  obtenerLogoTarjeta(metodo: any): string {
    let marca = 'generic';

    if (metodo.banco) {
      marca = this.detectarMarcaTarjeta(metodo.banco);
    }

    const logos: { [key: string]: string } = {
      'visa': 'https://cdn.jsdelivr.net/gh/aaronfagan/svg-credit-card-payment-icons/flat/visa.svg',
      'mastercard': 'https://cdn.jsdelivr.net/gh/aaronfagan/svg-credit-card-payment-icons/flat/mastercard.svg',
      'amex': 'https://cdn.jsdelivr.net/gh/aaronfagan/svg-credit-card-payment-icons/flat/amex.svg',
      'discover': 'https://cdn.jsdelivr.net/gh/aaronfagan/svg-credit-card-payment-icons/flat/discover.svg',
      'diners': 'https://cdn.jsdelivr.net/gh/aaronfagan/svg-credit-card-payment-icons/flat/diners.svg',
      'jcb': 'https://cdn.jsdelivr.net/gh/aaronfagan/svg-credit-card-payment-icons/flat/jcb.svg',
      'unionpay': 'https://cdn.jsdelivr.net/gh/aaronfagan/svg-credit-card-payment-icons/flat/unionpay.svg',
      'maestro': 'https://cdn.jsdelivr.net/gh/aaronfagan/svg-credit-card-payment-icons/flat/maestro.svg',
      'generic': 'https://cdn.jsdelivr.net/gh/aaronfagan/svg-credit-card-payment-icons/flat/generic.svg'
    };

    return logos[marca] || logos['generic'];
  }

  // ===== OBTENER NOMBRE DE MARCA ===== ✅ NUEVO
  obtenerNombreMarca(metodo: any): string {
    if (!metodo.banco) return 'Tarjeta';
    
    const marca = this.detectarMarcaTarjeta(metodo.banco);
    
    const nombres: { [key: string]: string } = {
      'visa': 'Visa',
      'mastercard': 'Mastercard',
      'amex': 'American Express',
      'discover': 'Discover',
      'diners': 'Diners Club',
      'jcb': 'JCB',
      'unionpay': 'UnionPay',
      'maestro': 'Maestro',
      'generic': metodo.banco || 'Tarjeta'
    };

    return nombres[marca] || metodo.banco;
  }

  // ===== CALCULAR TOTAL ===== ✅ NUEVO
  calcularTotal(): number {
    return this.carrito?.subtotal || 0;
  }

  // ===== CONFIRMAR COMPRA ===== ✅ NUEVO
  confirmarCompra(): void {
    if (!this.direccionSeleccionada) {
      alert('Debes seleccionar una dirección de envío');
      return;
    }

    if (!this.metodoPagoSeleccionado) {
      alert('Debes seleccionar un método de pago');
      return;
    }

    if (!this.carrito || this.carrito.items.length === 0) {
      alert('No hay productos en el carrito');
      return;
    }

    this.procesandoPago = true;

    // Simular procesamiento de pago
    setTimeout(() => {
      const compra = {
        items: this.carrito!.items,
        total: this.carrito!.subtotal,
        direccion: this.direccionSeleccionada,
        metodo_pago: this.metodoPagoSeleccionado,
        fecha: new Date()
      };

      console.log('✅ Compra confirmada:', compra);

      this.procesandoPago = false;
      this.cerrarModalCheckout();
      
      // Vaciar el carrito después de la compra
      this.vaciarCarrito();
      
      alert('¡Compra realizada exitosamente! 🎉');
      this.router.navigate(['/perfil']);
    }, 2000);
  }

  // ===== CONTINUAR COMPRANDO =====
  continuarComprando(): void {
    this.router.navigate(['/']);
  }

  // ===== CONSTRUIR URL IMAGEN =====
  construirUrlImagen(imagen: string | null): string {
    if (!imagen) return 'assets/img/producto-default.jpg';
    if (imagen.startsWith('http')) return imagen;
    if (imagen.startsWith('assets/')) return imagen;
    if (imagen.startsWith('data:image')) return imagen;
    if (imagen.startsWith('/uploads/')) return `http://localhost:8000${imagen}`;
    return 'assets/img/producto-default.jpg';
  }

  // ===== IR A PRODUCTO =====
  irAProducto(idProducto: number): void {
    this.router.navigate(['/producto', idProducto]);
  }

  // ===== NAVEGACIÓN =====
  volverInicio(): void {
    this.router.navigate(['/']);
  }

  // ===== USUARIO MENÚ =====
  logout(): void {
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('storage'));
    this.isLoggedIn = false;
    this.userName = '';
    this.userImage = 'assets/img/profile.jpeg';
    this.userMenuOpen = false;
    this.router.navigate(['/']);
  }

  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
  }

  irPerfil(): void {
    this.userMenuOpen = false;
    this.router.navigate(['/perfil']);
  }

  irVender(): void {
    this.userMenuOpen = false;
    this.router.navigate(['/vender']);
  }

  irConfiguracion(): void {
    this.userMenuOpen = false;
    this.router.navigate(['/configuracion']);
  }

  @HostListener('document:click', ['$event'])
  clickFuera(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const clickedInsideUserInfo = target.closest('.user-info');
    
    if (!clickedInsideUserInfo && this.userMenuOpen) {
      this.userMenuOpen = false;
    }
  }
}