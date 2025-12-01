import { Routes } from '@angular/router';
import { FocoShopComponent } from './focoshop/focoshop.component';
import { LoginComponent } from './login/login.component';
import { ConfiguracionComponent } from './configuracionperfil/configuracionperfil.component';
import { PerfilComponent } from './perfil/perfil.component';
import { EditPerfilComponent } from './perfil/editperfil/editperfil.component';
import { EditDireccionComponent } from './perfil/editdireccion/editdireccion.component';
import { EditPagoComponent } from './perfil/editpago/editpago.component';
import { VenderComponent } from './vender/vender.component';
import { DetalleProductoComponent } from './detalle-producto/detalle-producto.component';
import { CarritoComponent } from './carrito/carrito.component';
import { FavoritosComponent } from './favoritos/favoritos.component';
import { AdminPanelComponent } from './admin/admin-panel/admin-panel.component';
import { AdminUsuariosComponent } from './admin/admin-usuarios/admin-usuarios.component';
import { AdminProductosComponent } from './admin/admin-productos/admin-productos.component';
import { AdminCategoriasComponent } from './admin/admin-categorias/admin-categorias.component';
import { adminGuard } from './guards/admin.guard';
import { authGuard } from './guards/auth.guard';
import { ChatIAComponent } from './chat-ia/chat-ia.component';

export const routes: Routes = [
  // Rutas públicas
  { path: '', component: FocoShopComponent },
  { path: 'login', component: LoginComponent },
  { path: 'producto/:id', component: DetalleProductoComponent },
  
  // Carrito (solo usuarios autenticados)
  { 
    path: 'carrito', 
    component: CarritoComponent,
    canActivate: [authGuard]
  },
  
  // ✅ Favoritos (solo usuarios autenticados) - CON GUARD MEJORADO
  { 
    path: 'favoritos', 
    component: FavoritosComponent,
    canActivate: [authGuard]
  },
  
  // Rutas protegidas (usuarios autenticados)
  { 
    path: 'vender', 
    component: VenderComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'configuracion', 
    component: ConfiguracionComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'perfil', 
    component: PerfilComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'perfil/editar', 
    component: EditPerfilComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'perfil/editar-direccion', 
    component: EditDireccionComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'perfil/editar-pago', 
    component: EditPagoComponent,
    canActivate: [authGuard]
  },
  
  // Rutas admin (solo administradores)
  { 
    path: 'admin', 
    component: AdminPanelComponent,
    canActivate: [adminGuard]
  },
  { 
    path: 'admin/usuarios', 
    component: AdminUsuariosComponent,
    canActivate: [adminGuard]
  },
  { 
    path: 'admin/productos', 
    component: AdminProductosComponent,
    canActivate: [adminGuard]
  },
  { 
    path: 'admin/categorias', 
    component: AdminCategoriasComponent,
    canActivate: [adminGuard]
  },
  
  // Chat IA
  { 
    path: 'chat-ia', 
    component: ChatIAComponent
  },
  
  // Ruta 404
  { path: '**', redirectTo: '' }
];