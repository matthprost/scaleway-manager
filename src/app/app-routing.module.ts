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
        loadChildren: './pages/instances/instances.module#InstancesPageModule'
      },
      {
        path: ':zone/:id',
        loadChildren: './pages/instances/details/details.module#DetailsPageModule'
      }
    ],
    canActivate: [HomeGuard]
  },
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
    path: 'error',
    children: [
      {
        path: '504',
        loadChildren: './pages/errors/no-internet/no-internet.module#NoInternetPageModule'
      },
      {
        path: '400',
        loadChildren: './pages/errors/bad-request/bad-request.module#BadRequestPageModule'
      },
      {
        path: '404',
        loadChildren: './pages/errors/not-found/not-found.module#NotFoundPageModule'
      },
    ],
  },
  {
    path: 'about',
    loadChildren: './pages/about/about.module#AboutPageModule'
  },
  {
    path: 'invoices',
    loadChildren: './pages/invoices/invoices.module#InvoicesPageModule'
  },
  {
    path: 'settings',
    loadChildren: './pages/settings/settings.module#SettingsPageModule'
  },
/*  {
    path: 'buckets',
    children: [
      {
        path: '',
        loadChildren: './pages/buckets/buckets.module#ObjectsPageModule',
      },
      {
        path: ':region/:bucket',
        children: [
          {
            path: '',
            loadChildren: './pages/buckets/objects/objects.module#ObjectsPageModule'
          },
          {
            path: '**',
            loadChildren: './pages/buckets/objects/objects.module#ObjectsPageModule'
          }
        ]
      }
    ],
  },*/
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {preloadingStrategy: PreloadAllModules}),
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {
}
