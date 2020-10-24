import {NgModule} from '@angular/core';
import {PreloadAllModules, RouterModule, Routes} from '@angular/router';
import {HomeGuard} from './guards/home/home.guard';
import {DoubleAuthGuard} from './guards/double-auth/double-auth.guard';
import {LoginGuard} from './guards/login/login.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    children: [
      {
        path: '',
        loadChildren: './pages/home/home.module#HomePageModule'
      },
      {
        path: 'account',
        children: [
          {
            path: '',
            loadChildren: './pages/account/account.module#AccountPageModule'
          },
          {
            path: 'ssh-keys',
            loadChildren: './pages/account/ssh-keys/ssh-keys.module#SshKeysPageModule'
          },
          {
            path: 'tokens',
            loadChildren: './pages/account/tokens/tokens.module#TokensPageModule'
          },
        ]
      }
    ],
    canActivate: [HomeGuard]
  },
  {
    path: 'instances',
    children: [
      {
        path: '',
        loadChildren: './pages/products/instances/instances.module#InstancesPageModule'
      },
      {
        path: ':zone/:id',
        loadChildren: './pages/products/instances/details/details.module#DetailsPageModule'
      }
    ],
    canActivate: [HomeGuard]
  },
/*  {
    path: 'bmaas',
    children: [
      {
        path: '',
        loadChildren: './pages/products/bmaas/bmaas.module#BmaasPageModule',
        canActivate: [HomeGuard]
      },
      {
        path: ':zone/:id',
        loadChildren: './pages/products/bmaas/details/details.module#DetailsPageModule',
        canActivate: [HomeGuard]
      },
    ]
  },*/
  {
    path: 'login',
    children: [
      {
        path: '',
        loadChildren: './pages/auth/login/login.module#LoginPageModule',
        canActivate: [LoginGuard]
      },
      {
        path: 'double-auth',
        loadChildren: './pages/auth/double-auth/double-auth.module#DoubleAuthPageModule',
        canActivate: [DoubleAuthGuard]
      },
    ]
  },
  {
    path: 'about',
    loadChildren: './pages/about/about.module#AboutPageModule',
    canActivate: [HomeGuard]
  },
  {
    path: 'invoices',
    loadChildren: './pages/invoices/invoices.module#InvoicesPageModule',
    canActivate: [HomeGuard]
  },
  {
    path: 'settings',
    loadChildren: './pages/settings/settings.module#SettingsPageModule',
    canActivate: [HomeGuard]
  },
  {
    path: 'help',
    loadChildren: './pages/auth/login/help/help.module#HelpPageModule',
    canActivate: [HomeGuard]
  },
  {
      path: 'buckets',
      children: [
        {
          path: '',
          loadChildren: './pages/products/buckets/buckets.module#ObjectsPageModule',
        },
        {
          path: ':region/:bucket',
          children: [
            {
              path: '',
              loadChildren: './pages/products/buckets/objects/objects.module#ObjectsPageModule'
            },
            {
              path: '**',
              loadChildren: './pages/products/buckets/objects/objects.module#ObjectsPageModule'
            }
          ]
        }
      ],
    },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {preloadingStrategy: PreloadAllModules}),
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
