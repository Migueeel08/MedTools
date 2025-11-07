import { Component, ElementRef, ViewChild, AfterViewInit, OnInit, OnDestroy, HostListener, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'foco-shop',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './focoshop.component.html',
  styleUrls: ['./focoshop.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class FocoShopComponent implements AfterViewInit, OnInit, OnDestroy {

  // ===== API =====
  private apiUrl = 'http://localhost:8000/api';

  // ===== CARRITO =====
  contadorCarrito: number = 0;

  // ===== CATEGORÍAS =====
  categorias: any[] = [];
  categoriasCargadas = false;

  // ===== PRODUCTOS =====
  productos: any[] = [];
  productosCargando = false;
  productosFiltrados: any[] = [];

  categoriaSeleccionada = 0;
  subcategoriaSeleccionada: string | null = null;
  busqueda = '';
  menuAbierto = false;

  @ViewChild('categoriaGrid') categoriaGrid!: ElementRef;

  // ===== FILTROS =====
  filtros = {
    nuevo: false,
    usado: false,
    precioMin: null as number | null,
    precioMax: null as number | null,
    marcas: [] as string[],
    calificacion: null as string | null
  };

  // ===== ORDENAMIENTO =====
  ordenamiento: string = 'relevantes';

  // ===== MARCAS DISPONIBLES =====
  marcasDisponibles: string[] = [];
  buscarMarca: string = '';

  // ===== USUARIO =====
  isLoggedIn = false;
  userId: number = 0;
  userName = '';
  userImage = 'assets/img/user-icon.png';
  userMenuOpen = false;

  private storageListener = (event: StorageEvent) => {
    if (event.key === 'user' || event.key === null) {
      this.cargarUsuario();
    }
  };

  // ✅ LISTENER PARA ACTUALIZAR CARRITO
  private carritoListener = () => {
    if (this.isLoggedIn) {
      this.cargarContadorCarrito();
    }
  };

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit() {
    this.cargarUsuario();
    this.cargarCategorias();
    this.cargarProductos();
    
    // Cargar contador del carrito si está logueado
    if (this.isLoggedIn) {
      this.cargarContadorCarrito();
    }
    
    window.addEventListener('storage', this.storageListener);
    
    // ✅ ESCUCHAR EVENTO DE CARRITO ACTUALIZADO
    window.addEventListener('carritoActualizado', this.carritoListener as EventListener);
  }

  ngOnDestroy() {
    window.removeEventListener('storage', this.storageListener);
    // ✅ REMOVER LISTENER DEL CARRITO
    window.removeEventListener('carritoActualizado', this.carritoListener as EventListener);
  }

  ngAfterViewInit() {
    this.scrollCategoriaCentrada(this.categoriaSeleccionada);
  }

  // ===== FUNCIÓN PARA TRACK BY =====
  trackByProducto(index: number, producto: any): number {
    return producto.id_producto || index;
  }

  // ===== CARGAR CONTADOR DEL CARRITO =====
  cargarContadorCarrito() {
    if (!this.userId) return;
    
    this.http.get<any>(`${this.apiUrl}/carrito/count?id_usuario=${this.userId}`).subscribe({
      next: (data) => {
        this.contadorCarrito = data.total_productos || 0;
        console.log('🛒 Contador carrito:', this.contadorCarrito);
      },
      error: (error) => {
        console.error('Error al cargar contador:', error);
        this.contadorCarrito = 0;
      }
    });
  }

  // ===== IR AL CARRITO =====
  irAlCarrito() {
    if (!this.isLoggedIn) {
      alert('Debes iniciar sesión para ver tu carrito');
      this.router.navigate(['/login']);
      return;
    }
    this.router.navigate(['/carrito']);
  }

  // ===== CARGAR CATEGORÍAS =====
  cargarCategorias() {
    this.http.get<any[]>(`${this.apiUrl}/categorias`).subscribe({
      next: (data) => {
        this.categorias = data.map(cat => ({
          id_categoria: cat.id_categoria,
          nombre: cat.nombre,
          imagen: this.getImagenCategoria(cat.nombre),
          subcategorias: cat.subcategorias || []
        }));
        this.categoriasCargadas = true;
        console.log('Categorías cargadas:', this.categorias);
        this.filtrarProductos();
      },
      error: (error) => {
        console.error('Error al cargar categorías:', error);
        this.categorias = [
          { 
            nombre: 'TECNOLOGÍA', 
            imagen: 'assets/img/tecnologia.jpeg', 
            subcategorias: ['Laptops', 'Celulares', 'Tablets', 'Accesorios']
          },
          { 
            nombre: 'VESTIMENTA', 
            imagen: 'assets/img/emma.jpg', 
            subcategorias: ['Camisas', 'Pantalones', 'Zapatos', 'Vestidos']
          },
          { 
            nombre: 'CALZADO', 
            imagen: 'assets/img/calzadooo.png', 
            subcategorias: ['Deportivos', 'Casuales', 'Formales', 'Botas']
          }
        ];
        this.categoriasCargadas = true;
        this.filtrarProductos();
      }
    });
  }

  getImagenCategoria(nombre: string): string {
    const imagenes: any = {
      'TECNOLOGÍA': 'assets/img/tecnologia.jpeg',
      'VESTIMENTA': 'assets/img/emma.jpg',
      'CALZADO': 'assets/img/calzadooo.png',
      'VIDEOJUEGOS': 'assets/img/videojuegos.jpg',
      'JUGUETES': 'assets/img/juguetes.jpg',
      'HOGAR': 'assets/img/hogar.jpg',
      'DEPORTE': 'assets/img/deporte.jpg'
    };
    return imagenes[nombre.toUpperCase()] || 'assets/img/tecnologia.jpeg';
  }

  // ===== CARGAR PRODUCTOS ===== ✅ CON FILTRO DE VENDEDOR
  cargarProductos() {
    this.productosCargando = true;
    const url = `${this.apiUrl}/productos`;
    
    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        console.log('✅ Datos recibidos del backend:', data);
        
        // ✅ FILTRAR: Excluir productos del mismo usuario vendedor
        const productosFiltradosPorVendedor = data.filter(prod => {
          // Si el usuario está logueado, excluir sus propios productos
          if (this.isLoggedIn && this.userId) {
            return prod.id_vendedor !== this.userId;
          }
          // Si no está logueado, mostrar todos
          return true;
        });
        
        console.log(`📦 Productos totales: ${data.length}`);
        console.log(`✅ Productos filtrados (sin los del vendedor): ${productosFiltradosPorVendedor.length}`);
        
        this.productos = productosFiltradosPorVendedor.map(prod => ({
          id_producto: prod.id_producto,
          nombre: prod.nombre,
          descripcion: prod.descripcion,
          precio: prod.precio,
          imagen: this.construirUrlImagen(prod.imagen),
          categoria: prod.categoria || '',
          subcategoria: prod.subcategoria || '',
          disponible: prod.disponible,
          cantidad_disponible: prod.cantidad_disponible,
          vendedor: prod.vendedor_nombre || 'Vendedor',
          id_vendedor: prod.id_vendedor, // ✅ IMPORTANTE: Incluir id_vendedor
          vistas: prod.vistas || 0,
          estado: prod.estado,
          reviews: prod.reviews || 0,
          marca: prod.marca || null,
          calificacion: prod.calificacion || 0,
          condicion: prod.condicion || 'nuevo',
          precio_anterior: prod.precio_anterior || null,
          descuento: prod.descuento || null,
          envio_gratis: prod.envio_gratis || false
        }));
        
        this.productosCargando = false;
        this.extraerMarcas();
        this.filtrarProductos();
        console.log('Productos procesados:', this.productos);
      },
      error: (error) => {
        console.error('Error al cargar productos:', error);
        this.productosCargando = false;
        this.productos = [];
        this.filtrarProductos();
      }
    });
  }

  construirUrlImagen(imagen: string | null): string {
    if (!imagen) {
      return 'assets/img/producto-default.jpg';
    }
    if (imagen.startsWith('http')) {
      return imagen;
    }
    if (imagen.startsWith('assets/')) {
      return imagen;
    }
    if (imagen.startsWith('data:image')) {
      return imagen;
    }
    if (imagen.startsWith('/uploads/')) {
      return `http://localhost:8000${imagen}`;
    }
    return 'assets/img/producto-default.jpg';
  }

  extraerMarcas() {
    const marcas = this.productos
      .map(p => p.marca)
      .filter(m => m !== null && m !== undefined && m !== '');
    
    this.marcasDisponibles = [...new Set(marcas)].sort();
  }

  toggleMarca(marca: string) {
    const index = this.filtros.marcas.indexOf(marca);
    if (index > -1) {
      this.filtros.marcas.splice(index, 1);
    } else {
      this.filtros.marcas.push(marca);
    }
    this.aplicarFiltros();
  }

  normalizarTexto(texto: string): string {
    if (!texto) return '';
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  filtrarProductos() {
    if (!this.categoriasCargadas || this.categorias.length === 0) {
      this.productosFiltrados = [];
      return;
    }

    const busquedaNormalizada = this.normalizarTexto(this.busqueda);
    
    let filtrados: any[];
    
    if (busquedaNormalizada.trim() !== '') {
      filtrados = this.productos.filter(p => {
        const nombreNormalizado = this.normalizarTexto(p.nombre);
        const descripcionNormalizada = this.normalizarTexto(p.descripcion || '');
        const categoriaNormalizada = this.normalizarTexto(p.categoria);
        const subcategoriaNormalizada = this.normalizarTexto(p.subcategoria || '');
        const marcaNormalizada = this.normalizarTexto(p.marca || '');
        
        const coincideBusqueda = 
          nombreNormalizado.includes(busquedaNormalizada) || 
          descripcionNormalizada.includes(busquedaNormalizada) ||
          categoriaNormalizada.includes(busquedaNormalizada) ||
          subcategoriaNormalizada.includes(busquedaNormalizada) ||
          marcaNormalizada.includes(busquedaNormalizada);

        const tieneStock = p.cantidad_disponible > 0;
        const estaActivo = !p.estado || 
                          p.estado.toLowerCase() === 'activo' || 
                          p.estado.toLowerCase() === 'disponible';
        const estaDisponible = (p.disponible === true || p.disponible === 1) && tieneStock && estaActivo;

        return coincideBusqueda && estaDisponible;
      });
    } else {
      const categoriaActual = this.categorias[this.categoriaSeleccionada];
      if (!categoriaActual) {
        this.productosFiltrados = [];
        return;
      }

      const categoriaNormalizada = this.normalizarTexto(categoriaActual.nombre);

      filtrados = this.productos.filter(p => {
        const productoCategoriaNormalizada = this.normalizarTexto(p.categoria);
        const coincideCategoria = productoCategoriaNormalizada === categoriaNormalizada;

        let coincideSubcategoria = true;
        if (this.subcategoriaSeleccionada) {
          const subcategoriaNormalizada = this.normalizarTexto(this.subcategoriaSeleccionada);
          const productoSubcategoriaNormalizada = this.normalizarTexto(p.subcategoria || '');
          coincideSubcategoria = productoSubcategoriaNormalizada === subcategoriaNormalizada;
        }

        const tieneStock = p.cantidad_disponible > 0;
        const estaActivo = !p.estado || 
                          p.estado.toLowerCase() === 'activo' || 
                          p.estado.toLowerCase() === 'disponible';
        const estaDisponible = (p.disponible === true || p.disponible === 1) && tieneStock && estaActivo;

        return coincideCategoria && coincideSubcategoria && estaDisponible;
      });
    }

    filtrados = this.aplicarFiltrosAdicionales(filtrados);
    filtrados = this.ordenarProductosArray(filtrados);

    this.productosFiltrados = filtrados;
    console.log('✅ Productos filtrados:', filtrados.length, 'Búsqueda:', this.busqueda);
  }

  aplicarFiltrosAdicionales(productos: any[]): any[] {
    let filtrados = [...productos];

    if (this.filtros.nuevo || this.filtros.usado) {
      filtrados = filtrados.filter(p => 
        (this.filtros.nuevo && p.condicion === 'nuevo') ||
        (this.filtros.usado && p.condicion === 'usado')
      );
    }

    if (this.filtros.precioMin !== null) {
      filtrados = filtrados.filter(p => p.precio >= this.filtros.precioMin!);
    }
    if (this.filtros.precioMax !== null) {
      filtrados = filtrados.filter(p => p.precio <= this.filtros.precioMax!);
    }

    if (this.filtros.marcas.length > 0) {
      filtrados = filtrados.filter(p => this.filtros.marcas.includes(p.marca));
    }

    if (this.filtros.calificacion !== null) {
      const minCalificacion = parseInt(this.filtros.calificacion);
      filtrados = filtrados.filter(p => p.calificacion >= minCalificacion);
    }

    return filtrados;
  }

  aplicarFiltros() {
    this.filtrarProductos();
  }

  limpiarFiltros() {
    this.filtros = {
      nuevo: false,
      usado: false,
      precioMin: null,
      precioMax: null,
      marcas: [],
      calificacion: null
    };
    this.subcategoriaSeleccionada = null;
    this.aplicarFiltros();
  }

  ordenarProductos() {
    this.productosFiltrados = this.ordenarProductosArray(this.productosFiltrados);
  }

  ordenarProductosArray(productos: any[]): any[] {
    const copia = [...productos];

    switch (this.ordenamiento) {
      case 'menor-precio':
        return copia.sort((a, b) => a.precio - b.precio);
      
      case 'mayor-precio':
        return copia.sort((a, b) => b.precio - a.precio);
      
      case 'mas-vendidos':
        return copia.sort((a, b) => (b.reviews || 0) - (a.reviews || 0));
      
      case 'relevantes':
      default:
        return copia.sort((a, b) => {
          const relevanciaA = (a.calificacion || 0) * (a.reviews || 0);
          const relevanciaB = (b.calificacion || 0) * (b.reviews || 0);
          return relevanciaB - relevanciaA;
        });
    }
  }

  seleccionarCategoria(index: number) {
    this.categoriaSeleccionada = index;
    this.subcategoriaSeleccionada = null;
    this.scrollCategoriaCentrada(index);
    this.limpiarFiltros();
    this.filtrarProductos();
    this.menuAbierto = false; // ✅ Cerrar menú al seleccionar
  }

  seleccionarDesdeCarrusel(index: number) {
    this.categoriaSeleccionada = index;
    this.subcategoriaSeleccionada = null;
    this.scrollCategoriaCentrada(index);
    this.menuAbierto = false;
    this.limpiarFiltros();
    this.filtrarProductos();
  }

  seleccionarSubcategoria(subcategoria: string | null) {
    this.subcategoriaSeleccionada = subcategoria;
    console.log('Subcategoría seleccionada:', subcategoria);
    this.menuAbierto = false; // ✅ Cerrar menú al seleccionar subcategoría
    this.aplicarFiltros();
  }

  anterior() {
    this.categoriaSeleccionada =
      (this.categoriaSeleccionada - 1 + this.categorias.length) % this.categorias.length;
    this.subcategoriaSeleccionada = null;
    this.scrollCategoriaCentrada(this.categoriaSeleccionada);
    this.limpiarFiltros();
    this.filtrarProductos();
  }

  siguiente() {
    this.categoriaSeleccionada = (this.categoriaSeleccionada + 1) % this.categorias.length;
    this.subcategoriaSeleccionada = null;
    this.scrollCategoriaCentrada(this.categoriaSeleccionada);
    this.limpiarFiltros();
    this.filtrarProductos();
  }

  scrollCategoriaCentrada(index: number) {
    if (!this.categoriaGrid) return;
    const cardWidth = 160 + 25;
    const scrollPosition = cardWidth * index - (this.categoriaGrid.nativeElement.offsetWidth / 2 - cardWidth / 2);
    this.categoriaGrid.nativeElement.scrollTo({ left: scrollPosition, behavior: 'smooth' });
  }

  onBusquedaChange() {
    this.filtrarProductos();
  }

  limpiarBusqueda() {
    this.busqueda = '';
    this.filtrarProductos();
  }

  verDetalleProducto(producto: any) {
    this.router.navigate(['/producto', producto.id_producto]);
  }

  toggleMenu() {
    this.menuAbierto = !this.menuAbierto;
  }

  irALogin() {
    this.router.navigate(['/login']);
  }

  irARegistro() {
    this.router.navigate(['/register']);
  }

  irConfiguracion() {
    this.userMenuOpen = false;
    this.router.navigate(['/configuracion']);
  }

  irPerfil() {
    this.userMenuOpen = false;
    this.router.navigate(['/perfil']);
  }

  irVender() {
    this.userMenuOpen = false;
    this.router.navigate(['/vender']);
  }

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
            
        // Cargar contador del carrito
        this.cargarContadorCarrito();
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
    this.userId = 0;
    this.userName = '';
    this.userImage = 'assets/img/profile.jpeg';
    this.userMenuOpen = false;
    this.contadorCarrito = 0;
    this.router.navigate(['/']);
  }

  toggleUserMenu() {
    this.userMenuOpen = !this.userMenuOpen;
  }

  @HostListener('document:click', ['$event'])
  clickFuera(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const clickedInsideUserInfo = target.closest('.user-info');
    const clickedInsideMenu = target.closest('.menu-categorias');
    const clickedMenuButton = target.closest('.btn-menu-categorias');
    
    if (!clickedInsideUserInfo && this.userMenuOpen) {
      this.userMenuOpen = false;
    }

    if (!clickedInsideMenu && !clickedMenuButton && this.menuAbierto) {
      const clickedOverlay = target.closest('.menu-overlay');
      if (clickedOverlay) {
        this.menuAbierto = false;
      }
    }
  }
}