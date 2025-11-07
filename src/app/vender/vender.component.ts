import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-vender',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './vender.component.html',
  styleUrls: ['./vender.component.css']
})
export class VenderComponent implements OnInit {
  // Usuario
  userName = '';
  userImage = 'assets/img/profile.jpeg';
  userId = 0;

  // Producto
  nombreProducto = '';
  precio = 0;
  categoriaId = 0;
  categoria = '';
  subcategoriaId = 0;
  subcategoria = '';
  color = '';
  talla = '';
  marca = '';
  condicion = 'nuevo';
  descripcion = '';
  cantidad = 1;
  disponible = true;

  // ✅ NUEVO: Variables para manejo de archivos (igual que editperfil)
  selectedFile: File | null = null;
  imagenPreview: string | ArrayBuffer | null = null;

  // Opciones desde el backend
  categorias: any[] = [];
  subcategorias: any[] = [];
  
  colores = [
    { nombre: 'Negro', hex: '#000000' },
    { nombre: 'Blanco', hex: '#FFFFFF' },
    { nombre: 'Gris', hex: '#808080' },
    { nombre: 'Rojo', hex: '#FF0000' },
    { nombre: 'Azul', hex: '#0000FF' },
    { nombre: 'Verde', hex: '#00FF00' },
    { nombre: 'Amarillo', hex: '#FFFF00' },
    { nombre: 'Rosa', hex: '#FFC0CB' },
    { nombre: 'Morado', hex: '#800080' },
    { nombre: 'Naranja', hex: '#FFA500' }
  ];

  private apiUrl = 'http://localhost:8000/api';

  constructor(private router: Router, private http: HttpClient) {}

  ngOnInit() {
    this.cargarUsuario();
    this.cargarCategorias();
  }

  cargarUsuario() {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        
        this.userId = parsed.id_usuario || parsed.id || 0;
        this.userName = parsed.nombre || parsed.firstName || parsed.username || 
                        (parsed.email ? parsed.email.split('@')[0] : 'Usuario');
        this.userImage = parsed.imagen && parsed.imagen.trim() !== '' 
                         ? parsed.imagen 
                         : 'assets/img/profile.jpeg';

        if (this.userId === 0) {
          alert('Error: No se pudo obtener el ID del usuario');
          this.router.navigate(['/login']);
        }
      } catch (error) {
        console.error('Error al cargar usuario:', error);
        this.router.navigate(['/login']);
      }
    } else {
      alert('Debes iniciar sesión para vender productos');
      this.router.navigate(['/login']);
    }
  }

  cargarCategorias() {
    this.http.get<any[]>(`${this.apiUrl}/categorias`).subscribe({
      next: (data) => {
        this.categorias = data;
        console.log('Categorías cargadas:', this.categorias);
      },
      error: (error) => {
        console.error('Error al cargar categorías:', error);
        alert('Error al cargar las categorías');
      }
    });
  }

  onCategoriaChange() {
    const categoriaSeleccionada = this.categorias.find(c => c.id_categoria === Number(this.categoriaId));
    
    if (categoriaSeleccionada) {
      this.categoria = categoriaSeleccionada.nombre;
      this.cargarSubcategorias(this.categoriaId);
    }
    
    // Limpiar subcategoría al cambiar categoría
    this.subcategoriaId = 0;
    this.subcategoria = '';
  }

  cargarSubcategorias(idCategoria: number) {
    this.http.get<any[]>(`${this.apiUrl}/subcategorias/categoria/${idCategoria}`).subscribe({
      next: (data) => {
        this.subcategorias = data;
        console.log('Subcategorías cargadas:', this.subcategorias);
      },
      error: (error) => {
        console.error('Error al cargar subcategorías:', error);
        this.subcategorias = [];
      }
    });
  }

  onSubcategoriaChange() {
    const subcategoriaSeleccionada = this.subcategorias.find(s => s.id_subcategoria === Number(this.subcategoriaId));
    if (subcategoriaSeleccionada) {
      this.subcategoria = subcategoriaSeleccionada.nombre;
    }
  }

  // Verificar si la categoría necesita talla
  necesitaTalla(): boolean {
    const categoriasConTalla = ['VESTIMENTA', 'CALZADO', 'DEPORTE'];
    return categoriasConTalla.includes(this.categoria.toUpperCase());
  }

  // Verificar si la categoría necesita color
  necesitaColor(): boolean {
    const categoriasConColor = ['VESTIMENTA', 'CALZADO', 'TECNOLOGÍA', 'DEPORTE'];
    return categoriasConColor.includes(this.categoria.toUpperCase());
  }

  // Verificar si la categoría necesita marca
  necesitaMarca(): boolean {
    const categoriasConMarca = ['TECNOLOGÍA', 'VESTIMENTA', 'CALZADO', 'VIDEOJUEGOS', 'DEPORTE'];
    return categoriasConMarca.includes(this.categoria.toUpperCase());
  }

  /**
   * ✅ ACTUALIZADO: Manejo de imagen como archivo (igual que editperfil)
   */
  onImageUpload(event: any) {
    const file: File = event.target.files[0];
    
    if (file) {
      // Validar tipo de archivo
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('Por favor selecciona una imagen válida (JPG, PNG, GIF, WEBP)');
        event.target.value = '';
        return;
      }

      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen es muy grande. Máximo 5MB');
        event.target.value = '';
        return;
      }

      // ✅ Guardar el archivo (NO convertir a Base64 para enviar)
      this.selectedFile = file;

      // Mostrar preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagenPreview = e.target.result;
      };
      reader.readAsDataURL(file);
      
      console.log('✅ Imagen seleccionada:', file.name, 'Tamaño:', file.size, 'bytes');
    }
  }

  removeImage() {
    this.selectedFile = null;
    this.imagenPreview = null;
    
    // Limpiar input de archivo
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  incrementarCantidad() {
    this.cantidad++;
  }

  decrementarCantidad() {
    if (this.cantidad > 1) {
      this.cantidad--;
    }
  }

  toggleDisponibilidad() {
    this.disponible = !this.disponible;
  }

  /**
   * ✅ ACTUALIZADO: Enviar con FormData en lugar de JSON
   */
  publicarProducto() {
    // Validaciones
    if (!this.nombreProducto) {
      alert('Por favor ingresa el nombre del producto');
      return;
    }

    if (!this.precio || this.precio <= 0) {
      alert('Por favor ingresa un precio válido');
      return;
    }

    if (!this.categoriaId) {
      alert('Por favor selecciona una categoría');
      return;
    }

    // ✅ Validar que se haya seleccionado una imagen
    if (!this.selectedFile) {
      alert('Por favor agrega una imagen del producto');
      return;
    }

    // ✅ Crear FormData para enviar archivo
    const formData = new FormData();
    
    // Agregar campos del formulario
    formData.append('nombre', this.nombreProducto);
    formData.append('descripcion', this.descripcion);
    formData.append('precio', this.precio.toString());
    formData.append('cantidad_disponible', this.cantidad.toString());
    formData.append('id_categoria', this.categoriaId.toString());
    formData.append('id_vendedor', this.userId.toString());
    formData.append('condicion', this.condicion);
    
    // Campos opcionales
    if (this.subcategoriaId) {
      formData.append('id_subcategoria', this.subcategoriaId.toString());
    }
    if (this.color) {
      formData.append('color', this.color);
    }
    if (this.talla) {
      formData.append('talla', this.talla);
    }
    if (this.marca) {
      formData.append('marca', this.marca);
    }
    
    // ✅ Agregar el archivo de imagen
    formData.append('imagen', this.selectedFile, this.selectedFile.name);

    console.log('📦 Publicando producto...');
    console.log('📸 Con imagen:', this.selectedFile.name);

    // ✅ Enviar FormData (FastAPI lo recibirá como UploadFile)
    this.http.post(`${this.apiUrl}/productos/`, formData).subscribe({
      next: (response) => {
        console.log('✅ Producto publicado exitosamente:', response);
        alert('¡Producto publicado exitosamente!');
        this.limpiarFormulario();
        this.router.navigate(['/focoshop']);
      },
      error: (error) => {
        console.error('❌ Error al publicar producto:', error);
        alert('Error al publicar el producto: ' + (error.error?.detail || 'Error desconocido'));
      }
    });
  }

  limpiarFormulario() {
    this.nombreProducto = '';
    this.precio = 0;
    this.categoriaId = 0;
    this.categoria = '';
    this.subcategoriaId = 0;
    this.subcategoria = '';
    this.subcategorias = [];
    this.color = '';
    this.talla = '';
    this.marca = '';
    this.condicion = 'nuevo';
    this.descripcion = '';
    this.cantidad = 1;
    this.disponible = true;
    
    // ✅ Limpiar imagen
    this.selectedFile = null;
    this.imagenPreview = null;
    
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  volver() {
    this.router.navigate(['/']);
  }
}