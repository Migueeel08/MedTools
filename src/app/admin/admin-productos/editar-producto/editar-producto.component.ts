import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-editar-producto',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './editar-producto.component.html',
  styleUrl: './editar-producto.component.css'
})
export class EditarProductoComponent implements OnInit {
  private apiUrl = 'http://localhost:8000/api';

  @Input() producto: any = null;
  @Input() onClose: (() => void) | null = null;

  // ✅ AGREGAR TODAS LAS PROPIEDADES DEL FORMULARIO
  formulario = {
    nombre: '',
    descripcion: '',
    precio: 0,
    stock: 0,
    marca: '',
    condicion: 'nuevo',
    color: '',
    talla: ''
  };

  imagenActual: string = '';
  imagenNueva: File | null = null;
  previewImagen: string = '';
  cargando: boolean = false;
  guardando: boolean = false;
  error: string = '';
  exito: string = '';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    if (this.producto) {
      this.cargarDatos();
    }
  }

  cargarDatos() {
    this.formulario = {
      nombre: this.producto.nombre || '',
      descripcion: this.producto.descripcion || '',
      precio: this.producto.precio || 0,
      stock: this.producto.stock || 0,
      marca: this.producto.marca || '',
      condicion: this.producto.condicion || 'nuevo',
      color: this.producto.color || '',
      talla: this.producto.talla || ''
    };
    this.imagenActual = this.producto.imagen || '';
  }

  seleccionarImagen(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.imagenNueva = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewImagen = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  guardarCambios() {
    if (!this.validarFormulario()) return;

    this.guardando = true;
    this.error = '';
    this.exito = '';

    const formData = new FormData();
    formData.append('nombre', this.formulario.nombre);
    formData.append('descripcion', this.formulario.descripcion);
    formData.append('precio', this.formulario.precio.toString());
    formData.append('stock', this.formulario.stock.toString());
    formData.append('marca', this.formulario.marca);
    formData.append('condicion', this.formulario.condicion);
    formData.append('color', this.formulario.color);
    formData.append('talla', this.formulario.talla);

    if (this.imagenNueva) {
      formData.append('imagen', this.imagenNueva);
    }

    this.http.put(
      `${this.apiUrl}/productos/${this.producto.id_producto}`,
      formData
    ).subscribe({
      next: (response) => {
        console.log('✅ Producto actualizado:', response);
        this.exito = 'Producto actualizado exitosamente';
        this.guardando = false;

        setTimeout(() => {
          if (this.onClose) this.onClose();
        }, 1500);
      },
      error: (error) => {
        console.error('❌ Error:', error);
        this.error = error.error?.detail || 'Error al actualizar el producto';
        this.guardando = false;
      }
    });
  }

  validarFormulario(): boolean {
    if (!this.formulario.nombre.trim()) {
      this.error = 'El nombre es obligatorio';
      return false;
    }
    if (this.formulario.precio <= 0) {
      this.error = 'El precio debe ser mayor a 0';
      return false;
    }
    if (this.formulario.stock < 0) {
      this.error = 'El stock no puede ser negativo';
      return false;
    }
    return true;
  }

  cancelar() {
    if (this.onClose) this.onClose();
  }
}
