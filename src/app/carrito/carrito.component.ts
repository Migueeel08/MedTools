import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { StripeCheckoutService } from '../services/stripe-checkout.service';

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
export class CarritoComponent implements OnInit, OnDestroy {
  
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

  // ===== MODAL DE CHECKOUT =====
  modalCheckoutVisible: boolean = false;
  direcciones: any[] = [];
  metodosPago: any[] = [];
  direccionSeleccionada: any = null;
  metodoPagoSeleccionado: any = null;
  procesandoPago: boolean = false;

  // ===== STRIPE =====
  mostrarFormularioStripe: boolean = false;
  procesandoStripe: boolean = false;
  errorStripe: string = '';
  stripeInicializado: boolean = false;

  constructor(
    private router: Router,
    private http: HttpClient,
    private stripeService: StripeCheckoutService
  ) {}

  ngOnInit(): void {
    this.cargarUsuario();
    if (this.isLoggedIn) {
      this.cargarCarrito();
    } else {
      this.router.navigate(['/login']);
    }
  }

  ngOnDestroy(): void {
    if (this.stripeInicializado) {
      this.stripeService.destroyElements();
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
      } catch (error) {
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
      next: (carrito) => {
        this.carrito = carrito;
        this.cargando = false;
        console.log('✅ Carrito cargado:', carrito);
      },
      error: (error) => {
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
      error: (error) => {
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
      error: (error) => {
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
        
        window.dispatchEvent(new CustomEvent('carritoActualizado'));
      },
      error: (error) => {
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
        
        window.dispatchEvent(new CustomEvent('carritoActualizado'));
      },
      error: (error) => {
        console.error('Error al vaciar carrito:', error);
        alert('Error al vaciar carrito');
      }
    });
  }

  // ===== PROCEDER AL PAGO =====
  procederAlPago(): void {
    const itemsDisponibles = this.carrito?.items.filter(item => item.producto_disponible);
    
    if (!itemsDisponibles || itemsDisponibles.length === 0) {
      alert('No hay productos disponibles en el carrito');
      return;
    }

    this.modalCheckoutVisible = true;
    this.cargarDireccionesUsuario();
    this.cargarMetodosPagoUsuario();
  }

  // ===== CARGAR DIRECCIONES DEL USUARIO =====
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

  // ===== CARGAR MÉTODOS DE PAGO DEL USUARIO =====
  cargarMetodosPagoUsuario(): void {
    console.log('🔍 Cargando métodos de pago para usuario:', this.userId);
    
    this.http.get<any[]>(`${this.apiUrl}/metodos-pago/usuario/${this.userId}`).subscribe({
      next: (metodos) => {
        console.log('✅ Métodos de pago recibidos:', metodos);
        this.metodosPago = metodos;
      },
      error: (error) => {
        console.error('❌ Error cargando métodos de pago:', error);
        this.metodosPago = [];
      }
    });
  }

  // ===== CERRAR MODAL =====
  cerrarModalCheckout(): void {
    this.modalCheckoutVisible = false;
    this.direccionSeleccionada = null;
    this.metodoPagoSeleccionado = null;
    this.mostrarFormularioStripe = false;
    this.errorStripe = '';
    if (this.stripeInicializado) {
      this.stripeService.destroyElements();
      this.stripeInicializado = false;
    }
  }

  // ===== SELECCIONAR DIRECCIÓN =====
  seleccionarDireccion(direccion: any): void {
    this.direccionSeleccionada = direccion;
  }

  // ===== SELECCIONAR MÉTODO DE PAGO =====
  seleccionarMetodoPago(metodo: any): void {
    this.metodoPagoSeleccionado = metodo;
    if (this.mostrarFormularioStripe) {
      this.mostrarFormularioStripe = false;
      if (this.stripeInicializado) {
        this.stripeService.destroyElements();
        this.stripeInicializado = false;
      }
    }
  }

  // ===== PAGAR CON NUEVA TARJETA (STRIPE) =====
  async pagarConNuevaTarjeta() {
    this.metodoPagoSeleccionado = null;
    this.mostrarFormularioStripe = true;
    
    setTimeout(() => {
      const stripeSection = document.querySelector('.stripe-payment-section');
      if (stripeSection) {
        stripeSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
    
    setTimeout(async () => {
      try {
        await this.stripeService.initializeStripe('card-element-carrito');
        this.stripeInicializado = true;
        console.log('✅ Stripe inicializado para nueva tarjeta');
      } catch (error) {
        console.error('❌ Error al inicializar Stripe:', error);
        this.errorStripe = 'Error al cargar el formulario de pago';
      }
    }, 300);
  }

  // ===== PROCESAR PAGO CON STRIPE =====
  async procesarPagoConStripe() {
    if (!this.direccionSeleccionada) {
      alert('Debes seleccionar una dirección de envío');
      return;
    }

    if (!this.carrito) {
      alert('No hay productos en el carrito');
      return;
    }

    this.procesandoStripe = true;
    this.errorStripe = '';

    try {
      const paymentIntentData = {
        amount: this.carrito.subtotal,
        id_usuario: this.userId,
        id_producto: this.carrito.items[0].id_producto,
        cantidad: this.carrito.total_productos,
        descripcion: `Compra de ${this.carrito.total_productos} productos`
      };

      console.log('📤 Creando PaymentIntent...', paymentIntentData);

      const response = await this.stripeService
        .createPaymentIntent(paymentIntentData)
        .toPromise();

      console.log('✅ PaymentIntent creado:', response);

      const paymentIntent = await this.stripeService.confirmCardPayment(
        response.client_secret
      );

      console.log('✅ Pago confirmado:', paymentIntent);

      const confirmData = {
        payment_intent_id: paymentIntent.id,
        id_usuario: this.userId,
        id_producto: this.carrito.items[0].id_producto,
        cantidad: this.carrito.total_productos,
        precio_total: this.carrito.subtotal,
        id_direccion: this.direccionSeleccionada.id_direccion
      };

      const ventaResponse = await this.stripeService
        .confirmPayment(confirmData)
        .toPromise();

      console.log('✅ Venta registrada:', ventaResponse);

      this.procesandoStripe = false;
      this.cerrarModalCheckout();
      this.stripeService.destroyElements();
      
      await this.http.delete(`${this.apiUrl}/carrito/usuario/${this.userId}`).toPromise();
      window.dispatchEvent(new CustomEvent('carritoActualizado'));
      
      alert('¡Pago exitoso! 🎉 Tu compra ha sido procesada.');
      this.router.navigate(['/perfil']);

    } catch (error: any) {
      console.error('❌ Error en el pago:', error);
      this.procesandoStripe = false;
      this.errorStripe = error.message || 'Error al procesar el pago. Intenta de nuevo.';
    }
  }

  // ===== CANCELAR FORMULARIO STRIPE =====
  cancelarStripe() {
    this.mostrarFormularioStripe = false;
    this.errorStripe = '';
    if (this.stripeInicializado) {
      this.stripeService.destroyElements();
      this.stripeInicializado = false;
    }
  }

  // ===== DETECTAR MARCA DE TARJETA =====
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

  // ===== OBTENER LOGO DE TARJETA =====
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

  // ===== OBTENER NOMBRE DE MARCA =====
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

  // ===== CALCULAR TOTAL =====
  calcularTotal(): number {
    return this.carrito?.subtotal || 0;
  }

  // ===== CONFIRMAR COMPRA (con método guardado) =====
  confirmarCompra(): void {
    if (!this.direccionSeleccionada) {
      alert('Debes seleccionar una dirección de envío');
      return;
    }

    if (!this.metodoPagoSeleccionado) {
      alert('Debes seleccionar un método de pago o usar "Pagar con nueva tarjeta"');
      return;
    }

    if (!this.carrito || this.carrito.items.length === 0) {
      alert('No hay productos en el carrito');
      return;
    }

    this.procesandoPago = true;

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