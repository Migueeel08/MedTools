import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuariosService } from '../../services/usuarios.service';
import { HttpClient } from '@angular/common/http';

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
  imports: [CommonModule, FormsModule],
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
    { nombre: 'Arizona', codigo: 'AZ' }
  ];

  estadosCanada: Estado[] = [
    { nombre: 'Ontario', codigo: 'ON' },
    { nombre: 'Quebec', codigo: 'QC' },
    { nombre: 'British Columbia', codigo: 'BC' },
    { nombre: 'Alberta', codigo: 'AB' }
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
      alert('No se encontró información del usuario');
      this.router.navigate(['/login']);
      return;
    }

    const userData = JSON.parse(userString);
    this.user = {
      id: userData.id || userData.id_usuario,
      nombre: userData.nombre || '',
      apellido: userData.apellido || '',
      email: userData.email || '',
      telefono: userData.telefono || ''
    };

    this.cargarEstados();

    if (userData.direccion && userData.direccion.trim() !== '') {
      this.parsearDireccion(userData.direccion);
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
        this.estadosDisponibles = [];
    }
  }

  onPaisChange(): void {
    this.direccion.estado = '';
    this.direccion.ciudad = '';
    this.direccion.colonia = '';
    this.direccion.codigoPostal = '';
    this.colonias = [];
    this.cpEncontrado = false;
    this.errorCP = false;
    this.cargarEstados();
  }

  buscarPorCodigoPostal(): void {
    const cp = this.direccion.codigoPostal.trim();

    if (cp.length !== 5 || !/^\d{5}$/.test(cp)) {
      return;
    }

    if (this.direccion.pais !== 'México') {
      return;
    }

    this.buscandoCP = true;
    this.errorCP = false;
    this.cpEncontrado = false;
    this.colonias = [];

    console.log('🔍 Buscando CP en México API:', cp);

    const apiUrl = `https://mexico-api.devaleff.com/api/codigo-postal/${cp}`;

    this.http.get<MexicoAPIResponse>(apiUrl).subscribe({
      next: (response) => {
        console.log('📡 Respuesta API:', response);

        if (response.data && response.data.length > 0) {
          const primerRegistro = response.data[0];
          
          this.direccion.estado = primerRegistro.d_estado;
          this.direccion.ciudad = primerRegistro.D_mnpio;
          this.colonias = [...new Set(response.data.map(item => item.d_asenta))];
          
          if (this.colonias.length > 0) {
            this.direccion.colonia = this.colonias[0];
          }

          this.cpEncontrado = true;
          this.buscandoCP = false;
          
          console.log('✅ CP encontrado');
          console.log('📍 Estado:', this.direccion.estado);
          console.log('🏙️ Ciudad:', this.direccion.ciudad);
          console.log('🏘️ Colonias:', this.colonias);
        } else {
          this.errorCP = true;
          this.buscandoCP = false;
          console.log('❌ CP no encontrado');
        }
      },
      error: (error) => {
        console.error('❌ Error al consultar API:', error);
        this.errorCP = true;
        this.buscandoCP = false;
        
        if (error.status === 0) {
          console.error('Error de conexión. Verifica tu conexión a internet.');
        } else if (error.status === 404) {
          console.error('Código postal no encontrado.');
        } else {
          console.error('Error en el servidor. Intenta de nuevo más tarde.');
        }
      }
    });
  }

  parsearDireccion(direccionString: string): void {
    const partes = direccionString.split(',').map(p => p.trim());
    
    if (partes.length >= 4) {
      this.direccion.calle = partes[0]?.split('#')[0]?.trim() || '';
      this.direccion.numeroExterior = partes[0]?.split('#')[1]?.split('Int')[0]?.trim() || '';
      
      if (partes[0]?.includes('Int')) {
        this.direccion.numeroInterior = partes[0]?.split('Int')[1]?.trim() || '';
      }
      
      this.direccion.colonia = partes[1] || '';
      this.direccion.codigoPostal = partes[2]?.replace('CP', '').trim() || '';
      this.direccion.ciudad = partes[3] || '';
      this.direccion.estado = partes[4] || '';
      this.direccion.pais = partes[5] || 'México';
      
      if (direccionString.includes('| Ref:')) {
        this.direccion.referencias = direccionString.split('| Ref:')[1]?.trim() || '';
      }
    }
    
    this.cargarEstados();
  }

  // ✅ MÉTODO CORREGIDO - Ahora usa agregarDireccion
  guardarDireccion(): void {
    if (!this.direccion.calle || !this.direccion.numeroExterior || 
        !this.direccion.colonia || !this.direccion.codigoPostal ||
        !this.direccion.ciudad || !this.direccion.estado || !this.direccion.pais) {
      alert('Por favor completa todos los campos obligatorios (marcados con *)');
      return;
    }

    const userId = this.user.id;

    if (!userId) {
      alert('Error: No se encontró el ID del usuario');
      return;
    }

    // 📦 Preparar el objeto de dirección para enviar al backend
    const nuevaDireccion = {
      id_usuario: userId,  // ✅ Agregar id_usuario
      calle: this.direccion.calle,
      numero_exterior: this.direccion.numeroExterior,
      numero_interior: this.direccion.numeroInterior || null,
      colonia: this.direccion.colonia,
      codigo_postal: this.direccion.codigoPostal,
      ciudad: this.direccion.ciudad,
      estado: this.direccion.estado,
      pais: this.direccion.pais,
      referencias: this.direccion.referencias || null
    };

    console.log('💾 Guardando dirección:', nuevaDireccion);

    // ✅ USAR agregarDireccion en lugar de actualizarUsuario
    this.usuarioService.agregarDireccion(userId, nuevaDireccion).subscribe({
      next: (response: any) => {
        console.log('✅ Dirección agregada:', response);

        this.mensajeAlerta = '¡Dirección agregada correctamente!';
        this.mostrarAlerta = true;

        setTimeout(() => {
          this.router.navigate(['/configuracion']);
        }, 2000);
      },
      error: (err: any) => {
        console.error('❌ Error al agregar dirección:', err);
        console.error('Detalles del error:', err.error);
        alert('No se pudo agregar la dirección: ' + (err.error?.detail || JSON.stringify(err.error) || 'Error desconocido'));
      }
    });
  }

  volver(): void {
    this.router.navigate(['/configuracion']);
  }
}