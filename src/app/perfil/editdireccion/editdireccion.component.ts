import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuariosService } from '../../services/usuarios.service';
import { HttpClient, HttpClientModule } from '@angular/common/http';

interface Estado {
  nombre: string;
  codigo: string;
}

interface MexicoAPIResponse {
  meta: {
    page: number;
    per_page: string;
    total: number;
    total_pages: number;
  };
  data: {
    d_codigo: string;
    d_estado: string;
    d_ciudad: string;
    d_asenta: string;
    D_mnpio: string;
    d_tipo_asenta: string;
  }[];
}

@Component({
  selector: 'app-editdireccion',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './editdireccion.component.html',
  styleUrls: ['./editdireccion.component.css']
})
export class EditDireccionComponent implements OnInit {
  user: any = {
    id: null,
    nombre: '',
    apellido: '',
    email: '',
    telefono: ''
  };

  direccion: any = {
    calle: '',
    numeroExterior: '',
    numeroInterior: '',
    colonia: '',
    codigoPostal: '',
    ciudad: '',
    estado: '',
    pais: 'México',
    referencias: ''
  };

  paises: string[] = ['México', 'Estados Unidos', 'Canadá'];
  
  estadosMexico: Estado[] = [
    { nombre: 'Aguascalientes', codigo: 'AGS' },
    { nombre: 'Baja California', codigo: 'BC' },
    { nombre: 'Baja California Sur', codigo: 'BCS' },
    { nombre: 'Campeche', codigo: 'CAM' },
    { nombre: 'Chiapas', codigo: 'CHIS' },
    { nombre: 'Chihuahua', codigo: 'CHIH' },
    { nombre: 'Ciudad de México', codigo: 'CDMX' },
    { nombre: 'Coahuila', codigo: 'COAH' },
    { nombre: 'Colima', codigo: 'COL' },
    { nombre: 'Durango', codigo: 'DGO' },
    { nombre: 'Guanajuato', codigo: 'GTO' },
    { nombre: 'Guerrero', codigo: 'GRO' },
    { nombre: 'Hidalgo', codigo: 'HGO' },
    { nombre: 'Jalisco', codigo: 'JAL' },
    { nombre: 'México', codigo: 'MEX' },
    { nombre: 'Michoacán', codigo: 'MICH' },
    { nombre: 'Morelos', codigo: 'MOR' },
    { nombre: 'Nayarit', codigo: 'NAY' },
    { nombre: 'Nuevo León', codigo: 'NL' },
    { nombre: 'Oaxaca', codigo: 'OAX' },
    { nombre: 'Puebla', codigo: 'PUE' },
    { nombre: 'Querétaro', codigo: 'QRO' },
    { nombre: 'Quintana Roo', codigo: 'QROO' },
    { nombre: 'San Luis Potosí', codigo: 'SLP' },
    { nombre: 'Sinaloa', codigo: 'SIN' },
    { nombre: 'Sonora', codigo: 'SON' },
    { nombre: 'Tabasco', codigo: 'TAB' },
    { nombre: 'Tamaulipas', codigo: 'TAMPS' },
    { nombre: 'Tlaxcala', codigo: 'TLAX' },
    { nombre: 'Veracruz', codigo: 'VER' },
    { nombre: 'Yucatán', codigo: 'YUC' },
    { nombre: 'Zacatecas', codigo: 'ZAC' }
  ];

  estadosUSA: Estado[] = [
    { nombre: 'California', codigo: 'CA' },
    { nombre: 'Texas', codigo: 'TX' },
    { nombre: 'Florida', codigo: 'FL' },
    { nombre: 'New York', codigo: 'NY' },
    { nombre: 'Arizona', codigo: 'AZ' },
    { nombre: 'Illinois', codigo: 'IL' },
    { nombre: 'Pennsylvania', codigo: 'PA' },
    { nombre: 'Ohio', codigo: 'OH' },
    { nombre: 'Georgia', codigo: 'GA' },
    { nombre: 'North Carolina', codigo: 'NC' }
  ];

  estadosCanada: Estado[] = [
    { nombre: 'Ontario', codigo: 'ON' },
    { nombre: 'Quebec', codigo: 'QC' },
    { nombre: 'British Columbia', codigo: 'BC' },
    { nombre: 'Alberta', codigo: 'AB' },
    { nombre: 'Manitoba', codigo: 'MB' },
    { nombre: 'Saskatchewan', codigo: 'SK' }
  ];

  estadosDisponibles: Estado[] = [];
  colonias: string[] = [];
  
  buscandoCP = false;
  cpEncontrado = false;
  errorCP = false;

  mostrarAlerta = false;
  mensajeAlerta = '';

  constructor(
    private router: Router,
    private usuarioService: UsuariosService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const userString = localStorage.getItem('user');
    
    if (!userString) {
      console.error('❌ No se encontró información del usuario en localStorage');
      alert('No se encontró información del usuario. Por favor inicia sesión nuevamente.');
      this.router.navigate(['/login']);
      return;
    }

    try {
      const userData = JSON.parse(userString);
      console.log('👤 Datos del usuario cargados:', userData);

      this.user = {
        id: userData.id || userData.id_usuario,
        nombre: userData.nombre || '',
        apellido: userData.apellido || '',
        email: userData.email || '',
        telefono: userData.telefono || ''
      };

      console.log('✅ Usuario configurado:', this.user);

      // Cargar estados disponibles según país inicial
      this.cargarEstados();

      // Si existe una dirección guardada, parsearla
      if (userData.direccion && userData.direccion.trim() !== '') {
        console.log('📍 Cargando dirección existente:', userData.direccion);
        this.parsearDireccion(userData.direccion);
      }
    } catch (error) {
      console.error('❌ Error al parsear datos del usuario:', error);
      alert('Error al cargar información del usuario');
      this.router.navigate(['/login']);
    }
  }

  cargarEstados(): void {
    switch (this.direccion.pais) {
      case 'México':
        this.estadosDisponibles = this.estadosMexico;
        break;
      case 'Estados Unidos':
        this.estadosDisponibles = this.estadosUSA;
        break;
      case 'Canadá':
        this.estadosDisponibles = this.estadosCanada;
        break;
      default:
        this.estadosDisponibles = this.estadosMexico;
    }
    console.log('🗺️ Estados disponibles cargados:', this.estadosDisponibles.length);
  }

  onPaisChange(): void {
    console.log('🌍 País cambiado a:', this.direccion.pais);
    
    // Limpiar campos relacionados al cambiar de país
    this.direccion.estado = '';
    this.direccion.ciudad = '';
    this.direccion.colonia = '';
    this.direccion.codigoPostal = '';
    this.colonias = [];
    this.cpEncontrado = false;
    this.errorCP = false;
    
    // Cargar nuevos estados
    this.cargarEstados();
  }

  buscarPorCodigoPostal(): void {
    const cp = this.direccion.codigoPostal.trim();

    // Validar formato de código postal (5 dígitos)
    if (cp.length !== 5 || !/^\d{5}$/.test(cp)) {
      console.log('⚠️ Código postal inválido:', cp);
      return;
    }

    // Solo buscar si es México
    if (this.direccion.pais !== 'México') {
      console.log('ℹ️ Búsqueda de CP solo disponible para México');
      return;
    }

    this.buscandoCP = true;
    this.errorCP = false;
    this.cpEncontrado = false;
    this.colonias = [];

    console.log('🔍 Buscando código postal:', cp);

    const apiUrl = `https://mexico-api.devaleff.com/api/codigo-postal/${cp}`;

    this.http.get<MexicoAPIResponse>(apiUrl).subscribe({
      next: (response) => {
        console.log('📡 Respuesta de API recibida:', response);

        if (response.data && response.data.length > 0) {
          const primerRegistro = response.data[0];
          
          // Llenar campos automáticamente
          this.direccion.estado = primerRegistro.d_estado;
          this.direccion.ciudad = primerRegistro.D_mnpio;
          
          // Obtener todas las colonias únicas
          this.colonias = [...new Set(response.data.map(item => item.d_asenta))];
          
          // Seleccionar la primera colonia por defecto
          if (this.colonias.length > 0) {
            this.direccion.colonia = this.colonias[0];
          }

          this.cpEncontrado = true;
          this.buscandoCP = false;
          
          console.log('✅ Código postal encontrado');
          console.log('📍 Estado:', this.direccion.estado);
          console.log('🏙️ Ciudad:', this.direccion.ciudad);
          console.log('🏘️ Colonias disponibles:', this.colonias.length);
        } else {
          this.errorCP = true;
          this.buscandoCP = false;
          console.log('❌ Código postal no encontrado en la base de datos');
        }
      },
      error: (error) => {
        console.error('❌ Error al consultar API de códigos postales:', error);
        this.errorCP = true;
        this.buscandoCP = false;
        
        if (error.status === 0) {
          console.error('🔌 Error de conexión. Verifica tu conexión a internet.');
        } else if (error.status === 404) {
          console.error('🔍 Código postal no encontrado.');
        } else {
          console.error('⚠️ Error del servidor:', error.status);
        }
      }
    });
  }

  parsearDireccion(direccionString: string): void {
    console.log('📝 Parseando dirección:', direccionString);
    
    const partes = direccionString.split(',').map(p => p.trim());
    
    if (partes.length >= 4) {
      // Extraer calle y número exterior
      const calleParte = partes[0] || '';
      if (calleParte.includes('#')) {
        const [calle, resto] = calleParte.split('#');
        this.direccion.calle = calle.trim();
        
        if (resto.includes('Int')) {
          const [numExt, numInt] = resto.split('Int');
          this.direccion.numeroExterior = numExt.trim();
          this.direccion.numeroInterior = numInt.trim();
        } else {
          this.direccion.numeroExterior = resto.trim();
        }
      } else {
        this.direccion.calle = calleParte;
      }
      
      // Extraer demás campos
      this.direccion.colonia = partes[1] || '';
      this.direccion.codigoPostal = (partes[2] || '').replace('CP', '').trim();
      this.direccion.ciudad = partes[3] || '';
      this.direccion.estado = partes[4] || '';
      this.direccion.pais = partes[5] || 'México';
      
      // Extraer referencias si existen
      if (direccionString.includes('| Ref:')) {
        this.direccion.referencias = direccionString.split('| Ref:')[1]?.trim() || '';
      }
      
      console.log('✅ Dirección parseada:', this.direccion);
    }
    
    // Cargar estados después de parsear
    this.cargarEstados();
  }

  guardarDireccion(): void {
    console.log('💾 Intentando guardar dirección...');

    // Validar campos obligatorios
    if (!this.direccion.calle || !this.direccion.numeroExterior || 
        !this.direccion.colonia || !this.direccion.codigoPostal ||
        !this.direccion.ciudad || !this.direccion.estado || !this.direccion.pais) {
      alert('Por favor completa todos los campos obligatorios (marcados con *)');
      console.log('⚠️ Campos faltantes detectados');
      return;
    }

    const userId = this.user.id;

    if (!userId) {
      alert('Error: No se encontró el ID del usuario');
      console.error('❌ ID de usuario no disponible');
      return;
    }

    // Preparar objeto de dirección
    const nuevaDireccion = {
      id_usuario: userId,
      calle: this.direccion.calle.trim(),
      numero_exterior: this.direccion.numeroExterior.trim(),
      numero_interior: this.direccion.numeroInterior?.trim() || null,
      colonia: this.direccion.colonia.trim(),
      codigo_postal: this.direccion.codigoPostal.trim(),
      ciudad: this.direccion.ciudad.trim(),
      estado: this.direccion.estado.trim(),
      pais: this.direccion.pais.trim(),
      referencias: this.direccion.referencias?.trim() || null
    };

    console.log('📦 Datos de dirección preparados:', nuevaDireccion);

    // Llamar al servicio para agregar dirección
    this.usuarioService.agregarDireccion(userId, nuevaDireccion).subscribe({
      next: (response: any) => {
        console.log('✅ Dirección guardada exitosamente:', response);

        // Mostrar mensaje de éxito
        this.mensajeAlerta = '¡Dirección guardada correctamente!';
        this.mostrarAlerta = true;

        // Redirigir después de 2 segundos
        setTimeout(() => {
          this.mostrarAlerta = false;
          this.router.navigate(['/configuracion']);
        }, 2000);
      },
      error: (err: any) => {
        console.error('❌ Error al guardar dirección:', err);
        console.error('📋 Detalles del error:', err.error);
        
        let mensajeError = 'No se pudo guardar la dirección. ';
        
        if (err.error?.detail) {
          mensajeError += err.error.detail;
        } else if (err.error?.message) {
          mensajeError += err.error.message;
        } else if (err.message) {
          mensajeError += err.message;
        } else {
          mensajeError += 'Error desconocido. Por favor intenta nuevamente.';
        }
        
        alert(mensajeError);
      }
    });
  }

  volver(): void {
    console.log('🔙 Volviendo a configuración...');
    this.router.navigate(['/configuracion']);
  }
}