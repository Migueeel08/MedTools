import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-detalle-producto',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './detalle-producto.component.html',
  styleUrl: './detalle-producto.component.css'
})
export class DetalleProductoComponent implements OnInit {
  
  // ===== API =====
  private apiUrl = 'http://localhost:8000/api';

  // ===== PRODUCTO =====
  producto: any = null;
  cargando: boolean = true;
  productId: number = 0;

  // ===== SELECCIONES DEL USUARIO =====
  imagenSeleccionada: number = 0;
  colorSeleccionado: string = '';
  tallaSeleccionada: string = '';
  cantidadComprar: number = 1;
  esFavorito: boolean = false;

  // ===== USUARIO =====
  isLoggedIn: boolean = false;
  userName: string = '';
  userImage: string = 'assets/img/user-icon.png';
  userMenuOpen: boolean = false;
  userId: number = 0;

  // ===== BÚSQUEDA =====
  busqueda: string = '';

  // ===== MODAL DE CHECKOUT =====
  modalCheckoutVisible: boolean = false;
  direcciones: any[] = [];
  metodosPago: any[] = [];
  direccionSeleccionada: any = null;
  metodoPagoSeleccionado: any = null;
  procesandoPago: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.productId = +params['id'];
      if (this.productId) {
        this.cargarProducto();
      }
    });

    this.cargarUsuario();
    this.verificarFavorito();
  }

  // ===== CARGAR PRODUCTO =====
  cargarProducto() {
    this.cargando = true;
    const url = `${this.apiUrl}/productos/${this.productId}`;

    this.http.get<any>(url).subscribe({
      next: (data) => {
        console.log('✅ Producto cargado:', data);
        
        this.producto = {
          id_producto: data.id_producto,
          nombre: data.nombre,
          descripcion: data.descripcion,
          precio: data.precio,
          imagen: this.construirUrlImagen(data.imagen),
          categoria: data.categoria || '',
          subcategoria: data.subcategoria || '',
          disponible: data.disponible,
          cantidad_disponible: data.cantidad_disponible,
          vendedor: data.vendedor_nombre || 'Vendedor',
          id_vendedor: data.id_vendedor,
          vistas: data.vistas || 0,
          estado: data.estado,
          reviews: data.reviews || 0,
          marca: data.marca || null,
          calificacion: data.calificacion || 0,
          condicion: data.condicion || 'nuevo',
          precio_anterior: data.precio_anterior || null,
          descuento: data.descuento || null,
          color: data.color || null,
          talla: data.talla || null
        };

        this.colorSeleccionado = this.producto.color;
        this.tallaSeleccionada = this.producto.talla;

        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar producto:', error);
        this.cargando = false;
        this.producto = null;
      }
    });
  }

  construirUrlImagen(imagen: string | null): string {
    if (!imagen) return 'assets/img/producto-default.jpg';
    if (imagen.startsWith('http')) return imagen;
    if (imagen.startsWith('assets/')) return imagen;
    if (imagen.startsWith('data:image')) return imagen;
    if (imagen.startsWith('/uploads/')) return `http://localhost:8000${imagen}`;
    return 'assets/img/producto-default.jpg';
  }

  getColorHex(colorNombre: string): string {
    const colores: any = {
      'negro': '#000000',
      'blanco': '#FFFFFF',
      'rojo': '#FF0000',
      'azul': '#0000FF',
      'verde': '#00FF00',
      'amarillo': '#FFFF00',
      'rosa': '#FFC0CB',
      'gris': '#808080',
      'naranja': '#FFA500',
      'morado': '#800080',
    };
    return colores[colorNombre?.toLowerCase()] || '#667eea';
  }

  // ===== NAVEGACIÓN =====
  volverInicio() {
    this.router.navigate(['/']);
  }

  volverCategoria() {
    this.router.navigate(['/']);
  }

  buscarProductos() {
    if (this.busqueda.trim()) {
      this.router.navigate(['/'], { queryParams: { q: this.busqueda } });
    }
  }

  // ===== IMÁGENES =====
  seleccionarImagen(index: number) {
    this.imagenSeleccionada = index;
  }

  // ===== FAVORITOS =====
  toggleFavorito() {
    this.esFavorito = !this.esFavorito;
    
    if (this.esFavorito) {
      this.agregarAFavoritos();
    } else {
      this.quitarDeFavoritos();
    }
  }

  verificarFavorito() {
    const favoritos = localStorage.getItem('favoritos');
    if (favoritos) {
      const listaFavoritos = JSON.parse(favoritos);
      this.esFavorito = listaFavoritos.includes(this.productId);
    }
  }

  agregarAFavoritos() {
    let favoritos = [];
    const favoritosStr = localStorage.getItem('favoritos');
    
    if (favoritosStr) {
      favoritos = JSON.parse(favoritosStr);
    }
    
    if (!favoritos.includes(this.productId)) {
      favoritos.push(this.productId);
      localStorage.setItem('favoritos', JSON.stringify(favoritos));
      console.log('✅ Producto agregado a favoritos');
    }
  }

  quitarDeFavoritos() {
    const favoritosStr = localStorage.getItem('favoritos');
    
    if (favoritosStr) {
      let favoritos = JSON.parse(favoritosStr);
      favoritos = favoritos.filter((id: number) => id !== this.productId);
      localStorage.setItem('favoritos', JSON.stringify(favoritos));
      console.log('❌ Producto quitado de favoritos');
    }
  }

  // ===== CANTIDAD =====
  incrementarCantidad() {
    if (this.cantidadComprar < this.producto.cantidad_disponible) {
      this.cantidadComprar++;
    }
  }

  decrementarCantidad() {
    if (this.cantidadComprar > 1) {
      this.cantidadComprar--;
    }
  }

  // ===== COMPRAR AHORA - ABRE MODAL =====
  comprarAhora() {
    if (!this.isLoggedIn) {
      alert('Debes iniciar sesión para comprar');
      this.router.navigate(['/login']);
      return;
    }

    this.modalCheckoutVisible = true;
    this.cargarDireccionesUsuario();
    this.cargarMetodosPagoUsuario();
  }

  // ===== CARGAR DIRECCIONES DEL USUARIO =====
  cargarDireccionesUsuario() {
    console.log('🔍 Cargando direcciones para usuario:', this.userId);
    
    this.http.get<any[]>(`${this.apiUrl}/direcciones/usuario/${this.userId}`).subscribe({
      next: (direcciones) => {
        console.log('✅ Direcciones recibidas:', direcciones);
        console.log('📊 Cantidad de direcciones:', direcciones.length);
        
        this.direcciones = direcciones;
        
        if (direcciones.length > 0) {
          this.direccionSeleccionada = direcciones[0];
          console.log('✅ Dirección seleccionada por defecto:', this.direccionSeleccionada);
        } else {
          console.warn('⚠️ No hay direcciones disponibles');
        }
      },
      error: (error) => {
        console.error('❌ Error cargando direcciones:', error);
        console.error('📝 Detalles del error:', error.error);
        console.error('🔗 URL llamada:', `${this.apiUrl}/direcciones/usuario/${this.userId}`);
        this.direcciones = [];
      }
    });
  }

  // ===== CARGAR MÉTODOS DE PAGO DEL USUARIO =====
  cargarMetodosPagoUsuario() {
    console.log('🔍 Cargando métodos de pago para usuario:', this.userId);
    
    this.http.get<any[]>(`${this.apiUrl}/metodos-pago/usuario/${this.userId}`).subscribe({
      next: (metodos) => {
        console.log('✅ Métodos de pago recibidos:', metodos);
        console.log('📊 Cantidad de métodos:', metodos.length);
        
        this.metodosPago = metodos;
        
        if (metodos.length > 0) {
          this.metodoPagoSeleccionado = metodos[0];
          console.log('✅ Método seleccionado por defecto:', this.metodoPagoSeleccionado);
        } else {
          console.warn('⚠️ No hay métodos de pago disponibles');
        }
      },
      error: (error) => {
        console.error('❌ Error cargando métodos de pago:', error);
        console.error('📝 Detalles del error:', error.error);
        console.error('🔗 URL llamada:', `${this.apiUrl}/metodos-pago/usuario/${this.userId}`);
        this.metodosPago = [];
      }
    });
  }

  // ===== CERRAR MODAL =====
  cerrarModalCheckout() {
    this.modalCheckoutVisible = false;
    this.direccionSeleccionada = null;
    this.metodoPagoSeleccionado = null;
  }

  // ===== SELECCIONAR DIRECCIÓN =====
  seleccionarDireccion(direccion: any) {
    this.direccionSeleccionada = direccion;
  }

  // ===== SELECCIONAR MÉTODO DE PAGO =====
  seleccionarMetodoPago(metodo: any) {
    this.metodoPagoSeleccionado = metodo;
  }

  // ===== DETECTAR MARCA DE TARJETA POR BANCO =====
  detectarMarcaTarjeta(banco: string): string {
    if (!banco) return 'generic';
    
    const bancoLower = banco.toLowerCase();
    
    // Detectar por nombre del banco
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

    // Buscar coincidencias
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

    // Intentar detectar marca por banco
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
    return this.producto.precio * this.cantidadComprar;
  }

  // ===== CONFIRMAR COMPRA =====
  confirmarCompra() {
    if (!this.direccionSeleccionada) {
      alert('Debes seleccionar una dirección de envío');
      return;
    }

    if (!this.metodoPagoSeleccionado) {
      alert('Debes seleccionar un método de pago');
      return;
    }

    this.procesandoPago = true;

    setTimeout(() => {
      const venta = {
        id_producto: this.producto.id_producto,
        id_comprador: this.userId,
        id_vendedor: this.producto.id_vendedor,
        cantidad: this.cantidadComprar,
        precio_total: this.calcularTotal(),
        direccion: this.direccionSeleccionada,
        metodo_pago: this.metodoPagoSeleccionado,
        color: this.colorSeleccionado,
        talla: this.tallaSeleccionada,
        fecha: new Date()
      };

      console.log('✅ Venta confirmada:', venta);

      this.procesandoPago = false;
      this.cerrarModalCheckout();
      alert('¡Compra realizada exitosamente! 🎉');
      this.router.navigate(['/perfil']);
    }, 2000);
  }

  // ===== AGREGAR AL CARRITO ===== ✅ CORREGIDO
  agregarAlCarrito() {
    if (!this.isLoggedIn) {
      alert('Debes iniciar sesión para agregar productos al carrito');
      this.router.navigate(['/login']);
      return;
    }

    const carritoData = {
      id_producto: this.producto.id_producto,
      cantidad: this.cantidadComprar,
      color: this.colorSeleccionado || null,
      talla: this.tallaSeleccionada || null,
      precio_unitario: this.producto.precio
    };

    console.log('🛒 Enviando al carrito:', carritoData);
    console.log('👤 Usuario ID:', this.userId);

    // ✅ CORREGIDO: Agregado / antes de ?
    this.http.post(
      `${this.apiUrl}/carrito/?id_usuario=${this.userId}`,
      carritoData
    ).subscribe({
      next: (response) => {
        console.log('✅ Respuesta del servidor:', response);
        alert('✅ Producto agregado al carrito exitosamente');
        
        // Emitir evento para actualizar el contador del carrito
        window.dispatchEvent(new CustomEvent('carritoActualizado'));
      },
      error: (error) => {
        console.error('❌ Error completo:', error);
        console.error('Status:', error.status);
        console.error('Error detail:', error.error);
        
        if (error.status === 500) {
          alert('Error del servidor. Por favor intenta de nuevo.');
        } else if (error.status === 404) {
          alert('Producto no encontrado');
        } else {
          alert('Error al agregar al carrito: ' + (error.error?.detail || 'Error desconocido'));
        }
      }
    });
  }

  // ===== USUARIO =====
  cargarUsuario() {
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

  logout() {
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('storage'));
    this.isLoggedIn = false;
    this.userName = '';
    this.userImage = 'assets/img/profile.jpeg';
    this.userMenuOpen = false;
    this.router.navigate(['/']);
  }

  toggleUserMenu() {
    this.userMenuOpen = !this.userMenuOpen;
  }

  irPerfil() {
    this.userMenuOpen = false;
    this.router.navigate(['/perfil']);
  }

  irVender() {
    this.userMenuOpen = false;
    this.router.navigate(['/vender']);
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